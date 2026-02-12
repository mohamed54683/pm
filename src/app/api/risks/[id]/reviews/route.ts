/**
 * Risk Reviews API
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

// GET - Fetch reviews for a risk
export const GET = withAuth(
  async (request: NextRequest, _user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      
      const reviews = await query<Record<string, unknown>[]>(`
        SELECT rr.*, u.name as reviewer_name, u.email as reviewer_email
        FROM risk_reviews rr
        LEFT JOIN users u ON rr.reviewer_id = u.id
        WHERE rr.risk_id = ?
        ORDER BY rr.review_date DESC
      `, [id]);

      return NextResponse.json({ success: true, data: reviews });
    } catch (error) {
      console.error('Get reviews error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reviews' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.view'], checkCsrf: false }
);

// POST - Create a new review
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> => {
    try {
      const { id } = await params;
      const body = await request.json();
      const { assessment, recommendations, next_steps, review_date } = body;

      // Get current risk status/score for comparison
      const currentRisk = await query<Record<string, unknown>[]>(
        `SELECT risk_score, status, review_frequency FROM risks WHERE id = ?`, [id]
      );
      
      if (!currentRisk.length) {
        return NextResponse.json({ success: false, error: 'Risk not found' }, { status: 404 });
      }

      const sanitizedAssessment = stripDangerousTags(assessment || '');
      const sanitizedRecommendations = stripDangerousTags(recommendations || '');
      const sanitizedNextSteps = stripDangerousTags(next_steps || '');

      const result = await query<{ insertId: number }>(
        `INSERT INTO risk_reviews (uuid, risk_id, reviewer_id, review_date, previous_score, current_score, previous_status, current_status, assessment, recommendations, next_steps)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, user.userId, 
          review_date || new Date().toISOString().split('T')[0],
          currentRisk[0].risk_score, currentRisk[0].risk_score,
          currentRisk[0].status, currentRisk[0].status,
          sanitizedAssessment, sanitizedRecommendations, sanitizedNextSteps
        ]
      );

      // Calculate next review date
      const reviewDays: Record<string, number> = {
        'weekly': 7, 'biweekly': 14, 'monthly': 30, 'quarterly': 90, 'as_needed': 365
      };
      const frequency = currentRisk[0].review_frequency as string || 'monthly';
      const nextReviewDays = reviewDays[frequency] || 30;
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + nextReviewDays);

      // Update risk with review info
      await query(`
        UPDATE risks SET 
          last_review_date = ?,
          next_review_date = ?,
          review_status = 'completed'
        WHERE id = ?
      `, [review_date || new Date().toISOString().split('T')[0], nextReviewDate.toISOString().split('T')[0], id]);

      // Log activity
      await query(
        `INSERT INTO risk_activity_log (uuid, risk_id, user_id, action, description)
         VALUES (UUID(), ?, ?, 'reviewed', ?)`,
        [id, user.userId, `Completed risk review`]
      );

      return NextResponse.json({
        success: true,
        data: { id: result.insertId }
      }, { status: 201 });
    } catch (error) {
      console.error('Create review error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create review' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['risks.edit'] }
);
