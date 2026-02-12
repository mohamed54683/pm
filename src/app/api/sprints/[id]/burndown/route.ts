/**
 * Sprint Burndown API - Get burndown/burnup chart data
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';

interface BurndownRow {
  date: string;
  remaining_points: number;
  remaining_hours: number;
  completed_points: number;
  completed_hours: number;
  ideal_remaining: number;
}

interface SprintInfo {
  id: number;
  start_date: string;
  end_date: string;
  extended_to: string | null;
  committed_points: number;
  committed_hours: number;
}

// GET - Get burndown chart data
export const GET = withAuth(
  async (request: NextRequest, user: unknown, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const chartType = searchParams.get('type') || 'burndown'; // 'burndown' or 'burnup'

      // Get sprint info
      const sprintResult = await query<SprintInfo[]>(`
        SELECT id, start_date, end_date, extended_to, committed_points, committed_hours
        FROM sprints WHERE id = ? OR uuid = ?
      `, [id, id]);

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];
      const startDate = new Date(sprint.start_date);
      const endDate = new Date(sprint.extended_to || sprint.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const dailyBurn = sprint.committed_points / totalDays;

      // Get existing burndown data
      const burndownData = await query<BurndownRow[]>(`
        SELECT date, remaining_points, remaining_hours, completed_points, completed_hours, ideal_remaining
        FROM sprint_burndown
        WHERE sprint_id = ?
        ORDER BY date
      `, [sprint.id]);

      // Generate ideal line and fill missing dates
      const chartData: Array<{
        date: string;
        ideal: number;
        actual: number;
        completed: number;
      }> = [];

      const today = new Date();
      const burndownMap = new Map(burndownData.map(b => [b.date, b]));

      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        const ideal = Math.max(0, sprint.committed_points - (dailyBurn * i));
        const existingData = burndownMap.get(dateStr);

        if (currentDate <= today) {
          chartData.push({
            date: dateStr,
            ideal: Math.round(ideal * 10) / 10,
            actual: existingData ? existingData.remaining_points : sprint.committed_points,
            completed: existingData ? existingData.completed_points : 0
          });
        } else {
          // Future dates - only show ideal
          chartData.push({
            date: dateStr,
            ideal: Math.round(ideal * 10) / 10,
            actual: 0,
            completed: 0
          });
        }
      }

      // Calculate current status
      const latestData = burndownData[burndownData.length - 1];
      const currentRemaining = latestData?.remaining_points || sprint.committed_points;
      const currentCompleted = latestData?.completed_points || 0;
      
      const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const expectedRemaining = sprint.committed_points - (dailyBurn * Math.min(daysPassed, totalDays));
      
      const status = currentRemaining <= expectedRemaining ? 'on_track' : 
                     currentRemaining <= expectedRemaining * 1.1 ? 'at_risk' : 'behind';

      return NextResponse.json({
        success: true,
        data: {
          chartData,
          summary: {
            totalPoints: sprint.committed_points,
            completedPoints: currentCompleted,
            remainingPoints: currentRemaining,
            totalDays,
            daysRemaining: Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))),
            dailyBurnRate: Math.round(dailyBurn * 10) / 10,
            status,
            projectedCompletion: status === 'on_track' ? endDate.toISOString().split('T')[0] : null
          },
          chartType
        }
      });
    } catch (error) {
      console.error('Get burndown error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch burndown data', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.view'], checkCsrf: false }
);

// POST - Record burndown data point (typically called daily by cron or manually)
export const POST = withAuth(
  async (request: NextRequest, user: unknown, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;

      // Get sprint
      const sprintResult = await query<{ id: number; committed_points: number; start_date: string; end_date: string }[]>(
        `SELECT id, committed_points, start_date, end_date FROM sprints WHERE (id = ? OR uuid = ?) AND status = 'active'`,
        [id, id]
      );

      if (!sprintResult.length) {
        return NextResponse.json({ success: false, error: 'Active sprint not found' }, { status: 404 });
      }

      const sprint = sprintResult[0];
      const today = new Date().toISOString().split('T')[0];

      // Calculate current remaining and completed points
      const statsResult = await query<{ remaining: number; completed: number; remaining_hours: number; completed_hours: number }[]>(`
        SELECT 
          COALESCE(SUM(CASE WHEN status != 'done' THEN story_points ELSE 0 END), 0) as remaining,
          COALESCE(SUM(CASE WHEN status = 'done' THEN story_points ELSE 0 END), 0) as completed,
          COALESCE(SUM(CASE WHEN status != 'done' THEN estimated_hours ELSE 0 END), 0) as remaining_hours,
          COALESCE(SUM(CASE WHEN status = 'done' THEN estimated_hours ELSE 0 END), 0) as completed_hours
        FROM tasks 
        WHERE sprint_id = ? AND deleted_at IS NULL
      `, [sprint.id]);

      const stats = statsResult[0];

      // Calculate ideal remaining
      const startDate = new Date(sprint.start_date);
      const endDate = new Date(sprint.end_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysPassed = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const idealRemaining = sprint.committed_points * (1 - daysPassed / totalDays);

      // Upsert burndown data
      await query(`
        INSERT INTO sprint_burndown (sprint_id, date, remaining_points, remaining_hours, completed_points, completed_hours, ideal_remaining)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          remaining_points = VALUES(remaining_points),
          remaining_hours = VALUES(remaining_hours),
          completed_points = VALUES(completed_points),
          completed_hours = VALUES(completed_hours),
          ideal_remaining = VALUES(ideal_remaining)
      `, [sprint.id, today, stats.remaining, stats.remaining_hours, stats.completed, stats.completed_hours, Math.max(0, idealRemaining)]);

      return NextResponse.json({ 
        success: true, 
        message: 'Burndown data recorded',
        data: {
          date: today,
          remaining: stats.remaining,
          completed: stats.completed
        }
      });
    } catch (error) {
      console.error('Record burndown error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to record burndown data', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['sprints.edit'] }
);
