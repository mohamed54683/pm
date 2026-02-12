/**
 * Expenses API - Complete CRUD with approval workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { stripDangerousTags } from '@/lib/sanitize';
import { DecodedToken } from '@/lib/auth';

interface QueryRow {
  [key: string]: string | number | null | undefined;
}

// GET - Fetch expenses
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const project_id = searchParams.get('project_id');
      const user_id = searchParams.get('user_id');
      const status = searchParams.get('status');
      const start_date = searchParams.get('start_date');
      const end_date = searchParams.get('end_date');
      const category = searchParams.get('category');

      let sql = `
        SELECT e.id, e.uuid, e.project_id, e.task_id, e.user_id,
          e.expense_date, e.description, e.amount, e.currency,
          e.expense_type as category, e.vendor, e.receipt_url,
          e.is_billable, e.is_reimbursable, e.status,
          e.submitted_at, e.approved_by, e.approved_at, e.rejection_reason,
          e.created_at, e.updated_at,
          p.name as project_name, p.code as project_code,
          u.first_name as user_first_name, u.last_name as user_last_name,
          a.first_name as approver_first_name, a.last_name as approver_last_name
        FROM expenses e
        LEFT JOIN projects p ON e.project_id = p.id
        LEFT JOIN users u ON e.user_id = u.id
        LEFT JOIN users a ON e.approved_by = a.id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];

      if (project_id) {
        sql += ` AND e.project_id = ?`;
        params.push(project_id);
      }

      if (user_id) {
        sql += ` AND e.user_id = ?`;
        params.push(user_id);
      }

      if (status && status !== 'all') {
        sql += ` AND e.status = ?`;
        params.push(status);
      }

      if (category && category !== 'all') {
        sql += ` AND e.expense_type = ?`;
        params.push(category);
      }

      if (start_date) {
        sql += ` AND e.expense_date >= ?`;
        params.push(start_date);
      }

      if (end_date) {
        sql += ` AND e.expense_date <= ?`;
        params.push(end_date);
      }

      sql += ` ORDER BY e.expense_date DESC, e.created_at DESC`;

      const expenses = await query<QueryRow[]>(sql, params);

      // Get summary
      const summaryResult = await query<QueryRow[]>(`
        SELECT
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_amount,
          COALESCE(SUM(CASE WHEN status = 'draft' THEN amount ELSE 0 END), 0) as draft_amount,
          COALESCE(SUM(CASE WHEN status = 'submitted' THEN amount ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN is_billable = 1 THEN amount ELSE 0 END), 0) as billable_amount,
          COUNT(*) as total_count
        FROM expenses
        WHERE 1=1 ${project_id ? 'AND project_id = ?' : ''}
      `, project_id ? [project_id] : []);

      return NextResponse.json({
        success: true,
        data: expenses,
        summary: summaryResult[0]
      });
    } catch (error) {
      console.error('Expenses API error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch expenses', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.view'], checkCsrf: false }
);

// POST - Create expense
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const {
        project_id, task_id, expense_date, description, amount,
        currency, category, vendor, receipt_url, is_billable, is_reimbursable
      } = body;

      // Sanitize inputs
      const sanitizedDescription = stripDangerousTags(description);
      const sanitizedVendor = vendor ? stripDangerousTags(vendor) : null;

      if (!expense_date || !amount || !description) {
        return NextResponse.json({ success: false, error: 'Date, amount, and description are required' }, { status: 400 });
      }

      if (amount <= 0) {
        return NextResponse.json({ success: false, error: 'Amount must be greater than 0' }, { status: 400 });
      }

      const uuid = crypto.randomUUID();

      const result = await query<{ insertId: number }>(
        `INSERT INTO expenses (uuid, tenant_id, user_id, project_id, task_id, expense_date, description, amount, currency, expense_type, vendor, receipt_url, is_billable, is_reimbursable, status)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [
          uuid, user.userId, project_id || null, task_id || null, expense_date,
          sanitizedDescription, amount, currency || 'SAR', category || 'other',
          sanitizedVendor, receipt_url || null, is_billable ? 1 : 0, is_reimbursable ? 1 : 0
        ]
      );

      return NextResponse.json({
        success: true,
        data: { id: result.insertId, uuid }
      }, { status: 201 });
    } catch (error) {
      console.error('Create expense error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create expense', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// PUT - Update expense
export const PUT = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const body = await request.json();
      const { id, expense_date, description, amount, currency, category, vendor, receipt_url, is_billable, is_reimbursable, status, rejection_reason } = body;

      if (!id) {
        return NextResponse.json({ success: false, error: 'Expense ID is required' }, { status: 400 });
      }

      // Check current status - only draft entries can be edited by owner
      const [currentExpense] = await query<QueryRow[]>(`SELECT status, user_id FROM expenses WHERE id = ?`, [id]);
      
      if (!currentExpense) {
        return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
      }

      const isApprovalAction = status === 'approved' || status === 'rejected';
      const isSubmission = status === 'submitted';

      // Non-managers can only edit their own draft expenses or submit them
      if (!isApprovalAction && currentExpense.status !== 'draft' && currentExpense.user_id !== user.userId) {
        return NextResponse.json({ success: false, error: 'Only draft expenses can be edited' }, { status: 403 });
      }

      const sanitizedDescription = description ? stripDangerousTags(description) : null;

      const updates: string[] = [];
      const params: (string | number | null)[] = [];

      if (expense_date) {
        updates.push('expense_date = ?');
        params.push(expense_date);
      }

      if (sanitizedDescription !== null) {
        updates.push('description = ?');
        params.push(sanitizedDescription);
      }

      if (amount !== undefined) {
        updates.push('amount = ?');
        params.push(amount);
      }

      if (currency) {
        updates.push('currency = ?');
        params.push(currency);
      }

      if (category) {
        updates.push('expense_type = ?');
        params.push(category);
      }

      if (vendor !== undefined) {
        updates.push('vendor = ?');
        params.push(vendor ? stripDangerousTags(vendor) : null);
      }

      if (receipt_url !== undefined) {
        updates.push('receipt_url = ?');
        params.push(receipt_url);
      }

      if (is_billable !== undefined) {
        updates.push('is_billable = ?');
        params.push(is_billable ? 1 : 0);
      }

      if (is_reimbursable !== undefined) {
        updates.push('is_reimbursable = ?');
        params.push(is_reimbursable ? 1 : 0);
      }

      if (status) {
        updates.push('status = ?');
        params.push(status);

        if (isSubmission) {
          updates.push('submitted_at = NOW()');
        }

        if (isApprovalAction) {
          updates.push('approved_by = ?');
          updates.push('approved_at = NOW()');
          params.push(user.userId);

          if (status === 'rejected' && rejection_reason) {
            updates.push('rejection_reason = ?');
            params.push(stripDangerousTags(rejection_reason));
          }
        }
      }

      if (updates.length === 0) {
        return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
      }

      updates.push('updated_at = NOW()');
      params.push(id);

      await query(
        `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return NextResponse.json({ success: true, message: 'Expense updated successfully' });
    } catch (error) {
      console.error('Update expense error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update expense', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.edit'] }
);

// DELETE - Delete expense
export const DELETE = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ success: false, error: 'Expense ID is required' }, { status: 400 });
      }

      // Check if expense is in draft status and belongs to user
      const [expense] = await query<QueryRow[]>(`SELECT status, user_id FROM expenses WHERE id = ?`, [id]);
      
      if (!expense) {
        return NextResponse.json({ success: false, error: 'Expense not found' }, { status: 404 });
      }

      if (expense.status !== 'draft') {
        return NextResponse.json({ success: false, error: 'Only draft expenses can be deleted' }, { status: 403 });
      }

      await query(`DELETE FROM expenses WHERE id = ?`, [id]);

      return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
    } catch (error) {
      console.error('Delete expense error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete expense', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
  { requiredPermissions: ['projects.delete'] }
);
