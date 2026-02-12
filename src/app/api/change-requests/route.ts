import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';
import { v4 as uuidv4 } from 'uuid';

// GET - List change requests with filters
export const GET = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const userId = user.userId;
      const { searchParams } = new URL(request.url);
      
      const status = searchParams.get('status');
      const priority = searchParams.get('priority');
      const category = searchParams.get('category');
      const projectId = searchParams.get('projectId');
      const search = searchParams.get('search');
      const myRequests = searchParams.get('myRequests') === 'true';
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE cr.deleted_at IS NULL';
      const params: any[] = [];

      if (status) {
        whereClause += ' AND cr.status = ?';
        params.push(status);
      }
      if (priority) {
        whereClause += ' AND cr.priority = ?';
        params.push(priority);
      }
      if (category) {
        whereClause += ' AND cr.category = ?';
        params.push(category);
      }
      if (projectId) {
        whereClause += ' AND cr.project_id = ?';
        params.push(projectId);
      }
      if (myRequests) {
        whereClause += ' AND cr.requested_by = ?';
        params.push(userId);
      }
      if (search) {
        whereClause += ' AND (cr.title LIKE ? OR cr.change_key LIKE ? OR cr.description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Count total
      const countResult = await query<any[]>(`
        SELECT COUNT(*) as total
        FROM change_requests cr
        ${whereClause}
      `, params);
      const total = countResult[0]?.total || 0;

      // Get list with pagination
      const requests = await query<any[]>(`
        SELECT 
          cr.id, cr.uuid, cr.change_key, cr.title, cr.description, 
          cr.category, cr.priority, cr.impact_level, cr.status,
          cr.project_id, p.name as project_name,
          cr.requested_by, u.name as requester_name,
          cr.submitted_date, cr.target_decision_date, cr.created_at
        FROM change_requests cr
        LEFT JOIN projects p ON cr.project_id = p.id
        LEFT JOIN users u ON cr.requested_by = u.id
        ${whereClause}
        ORDER BY cr.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      return NextResponse.json({
        success: true,
        data: requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      console.error('Error fetching change requests:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.view'] }
);

// POST - Create change request
export const POST = withAuth(
  async (request: NextRequest, user: DecodedToken): Promise<NextResponse> => {
    try {
      const userId = user.userId;
      const body = await request.json();
      
      const {
        project_id, title, description, justification, category,
        current_state, proposed_change, benefits, scope_impact,
        schedule_impact_days, cost_impact, risk_impact, quality_impact,
        resource_impact, priority, impact_level, urgency, target_decision_date,
        submit
      } = body;

      if (!project_id || !title || !description) {
        return NextResponse.json({ 
          success: false, 
          error: 'Project, title, and description are required' 
        }, { status: 400 });
      }

      // Get next change number for this project
      const countResult = await query<any[]>(`
        SELECT COUNT(*) + 1 as next_number FROM change_requests WHERE project_id = ?
      `, [project_id]);
      const changeNumber = countResult[0]?.next_number || 1;

      // Get project key for change_key
      const projectResult = await query<any[]>(`
        SELECT project_key FROM projects WHERE id = ?
      `, [project_id]);
      const projectKey = projectResult[0]?.project_key || 'CR';
      const changeKey = `${projectKey}-CR-${changeNumber}`;

      const uuid = uuidv4();
      const crStatus = submit ? 'submitted' : 'draft';
      const submittedDate = submit ? new Date().toISOString().split('T')[0] : null;
      const submittedAt = submit ? new Date() : null;

      const result = await query<any>(`
        INSERT INTO change_requests (
          uuid, project_id, change_number, change_key, title, description,
          justification, category, current_state, proposed_change, benefits,
          scope_impact, schedule_impact_days, cost_impact, risk_impact, quality_impact,
          resource_impact, priority, impact_level, urgency, target_decision_date,
          requested_by, status, submitted_date, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuid, project_id, changeNumber, changeKey, title, description,
        justification || null, category || 'scope', current_state || null, proposed_change || null, benefits || null,
        scope_impact || null, schedule_impact_days || null, cost_impact || null, risk_impact || null, quality_impact || null,
        resource_impact || null, priority || 'medium', impact_level || 'moderate', urgency || 'normal', 
        target_decision_date || null, userId, crStatus, submittedDate, submittedAt
      ]);

      // Log activity
      await query(`
        INSERT INTO cr_activity_log (uuid, cr_id, user_id, action, description)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), result.insertId, userId, 'created', `Change request created${submit ? ' and submitted' : ' as draft'}`]);

      return NextResponse.json({
        success: true,
        data: { id: result.insertId, uuid, change_key: changeKey, status: crStatus }
      }, { status: 201 });
    } catch (error: any) {
      console.error('Error creating change request:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  },
  { requiredPermissions: ['change_requests.create'] }
);
