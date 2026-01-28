import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

// GET - List budgets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let whereClause = 'pb.deleted_at IS NULL';
    const params: (string | number)[] = [];

    if (projectId) {
      whereClause += ' AND pb.project_id = ?';
      params.push(projectId);
    }

    const budgets = await query<QueryRow[]>(`
      SELECT 
        pb.id, pb.uuid, pb.name, pb.budget_type, pb.fiscal_year, pb.status,
        pb.currency, pb.total_budget, pb.allocated_budget, pb.spent_budget,
        pb.remaining_budget, pb.contingency_budget, pb.contingency_used,
        pb.start_date, pb.end_date, pb.project_id, pb.created_at,
        p.code as project_code, p.name as project_name,
        ROUND((pb.spent_budget / NULLIF(pb.total_budget, 0)) * 100, 1) as spent_percentage,
        -- Cost Performance Index
        CASE WHEN pb.spent_budget > 0 THEN 
          ROUND((SELECT COALESCE(SUM(ev.earned_value), 0) FROM earned_value_snapshots ev WHERE ev.project_id = pb.project_id) / pb.spent_budget, 2)
        ELSE 1 END as cpi
      FROM project_budgets pb
      LEFT JOIN projects p ON pb.project_id = p.id
      WHERE ${whereClause}
      ORDER BY pb.created_at DESC
    `, params);

    // Get budget line items for each budget
    for (const budget of budgets) {
      const lineItems = await query<QueryRow[]>(`
        SELECT bli.*, bc.name as category_name
        FROM budget_line_items bli
        LEFT JOIN budget_categories bc ON bli.category_id = bc.id
        WHERE bli.budget_id = ? AND bli.deleted_at IS NULL
        ORDER BY bli.created_at
      `, [budget.id]);
      (budget as Record<string, unknown>).line_items = lineItems;
    }

    // Summary stats
    const summary = await query<QueryRow[]>(`
      SELECT 
        COALESCE(SUM(total_budget), 0) as total_budget_all,
        COALESCE(SUM(spent_budget), 0) as total_spent_all,
        COALESCE(SUM(remaining_budget), 0) as total_remaining_all,
        COUNT(*) as budget_count
      FROM project_budgets WHERE deleted_at IS NULL ${projectId ? 'AND project_id = ?' : ''}
    `, projectId ? [projectId] : []);

    return NextResponse.json({ 
      success: true, 
      data: budgets,
      summary: summary[0] || {}
    });
  } catch (error: unknown) {
    console.error('Budgets API error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load budgets';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST - Create budget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      project_id, name, budget_type, fiscal_year, total_budget, currency,
      contingency_budget, start_date, end_date
    } = body;

    if (!project_id || !name || !total_budget) {
      return NextResponse.json({ 
        success: false, 
        error: 'Project, name, and total budget required' 
      }, { status: 400 });
    }

    const uuid = crypto.randomUUID();
    const remaining = Number(total_budget) - (Number(contingency_budget) || 0);

    const result = await query<{ insertId: number }>(`
      INSERT INTO project_budgets (
        uuid, project_id, name, budget_type, fiscal_year, status, currency,
        total_budget, allocated_budget, spent_budget, remaining_budget,
        contingency_budget, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, 0, 0, ?, ?, ?, ?)
    `, [
      uuid, project_id, name, budget_type || 'project', fiscal_year || new Date().getFullYear(),
      currency || 'USD', total_budget, remaining, contingency_budget || 0,
      start_date || null, end_date || null
    ]);

    return NextResponse.json({
      success: true,
      data: { id: result.insertId, uuid, name }
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create budget error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create budget';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
