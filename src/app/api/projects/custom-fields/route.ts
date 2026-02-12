import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { DecodedToken } from '@/lib/auth/jwt';

function generateId(prefix: string = 'cfd'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - List custom field definitions or values
async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const definitionId = searchParams.get('definition_id');
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const projectId = searchParams.get('project_id');

    // Get field values for a specific entity
    if (entityId && entityType) {
      const values = await query(
        `SELECT cfv.*, cfd.name, cfd.field_type, cfd.options, cfd.validation_rules
         FROM custom_field_values cfv
         JOIN custom_field_definitions cfd ON cfv.field_id = cfd.id
         WHERE cfv.entity_type = ? AND cfv.entity_id = ?`,
        [entityType, entityId]
      );

      // Parse options and validation rules
      const formattedValues = (values as any[]).map(v => ({
        ...v,
        options: v.options ? JSON.parse(v.options) : null,
        validation_rules: v.validation_rules ? JSON.parse(v.validation_rules) : null
      }));

      return NextResponse.json({ success: true, data: formattedValues });
    }

    // Get custom field definitions
    let sql = `
      SELECT cfd.*,
             (SELECT COUNT(*) FROM custom_field_values cfv WHERE cfv.field_id = cfd.id) as usage_count
      FROM custom_field_definitions cfd
      WHERE 1=1
    `;
    const params: any[] = [];

    if (definitionId) {
      sql += ' AND cfd.id = ?';
      params.push(definitionId);
    }

    if (entityType) {
      sql += ' AND cfd.entity_type = ?';
      params.push(entityType);
    }

    if (projectId) {
      sql += ' AND (cfd.project_id = ? OR cfd.project_id IS NULL)';
      params.push(projectId);
    }

    sql += ' ORDER BY cfd.order_index, cfd.name';

    const definitions = await query(sql, params);

    // Parse options and validation rules
    const formattedDefinitions = (definitions as any[]).map(d => ({
      ...d,
      options: d.options ? JSON.parse(d.options) : null,
      validation_rules: d.validation_rules ? JSON.parse(d.validation_rules) : null
    }));

    return NextResponse.json({ success: true, data: formattedDefinitions });
  } catch (error: any) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create field definition or set value
async function handlePost(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    
    // Check if this is a value assignment or definition creation
    if (body.entity_id && body.field_id) {
      // Set/update field value
      const { entity_type, entity_id, field_id, value } = body;

      if (!entity_type || !entity_id || !field_id) {
        return NextResponse.json({ 
          success: false, 
          error: 'Entity type, entity ID, and field ID are required' 
        }, { status: 400 });
      }

      // Get field definition for validation
      const definitions = await query(
        'SELECT * FROM custom_field_definitions WHERE id = ?',
        [field_id]
      );

      if (!definitions || (definitions as any[]).length === 0) {
        return NextResponse.json({ success: false, error: 'Field definition not found' }, { status: 404 });
      }

      const definition = (definitions as any[])[0];
      
      // Validate value based on field type
      const validationError = validateFieldValue(definition, value);
      if (validationError) {
        return NextResponse.json({ success: false, error: validationError }, { status: 400 });
      }

      // Store value in appropriate columns based on type
      const valueColumns = getValueColumns(definition.field_type, value);

      const id = generateId('cfv');
      await query(
        `INSERT INTO custom_field_values 
         (id, field_id, entity_type, entity_id, value_text, value_number, value_date, value_json, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         value_text = VALUES(value_text),
         value_number = VALUES(value_number),
         value_date = VALUES(value_date),
         value_json = VALUES(value_json),
         updated_at = NOW()`,
        [
          id, field_id, entity_type, entity_id,
          valueColumns.value_text,
          valueColumns.value_number,
          valueColumns.value_date,
          valueColumns.value_json,
          user.userId
        ]
      );

      return NextResponse.json({ success: true, message: 'Field value saved' });
    }

    // Create field definition
    const { 
      name, 
      field_type, 
      entity_type, 
      project_id,
      description,
      is_required,
      default_value,
      options,
      validation_rules,
      order_index,
      show_in_list,
      show_in_card
    } = body;

    if (!name || !field_type || !entity_type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Name, field type, and entity type are required' 
      }, { status: 400 });
    }

    const validFieldTypes = ['text', 'number', 'date', 'datetime', 'select', 'multiselect', 'checkbox', 'url', 'email', 'user', 'currency'];
    if (!validFieldTypes.includes(field_type)) {
      return NextResponse.json({ success: false, error: 'Invalid field type' }, { status: 400 });
    }

    const id = generateId('cfd');

    await query(
      `INSERT INTO custom_field_definitions 
       (id, name, field_type, entity_type, project_id, description, is_required, 
        default_value, options, validation_rules, order_index, show_in_list, show_in_card, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, field_type, entity_type, project_id || null,
        description || null, is_required || false,
        default_value || null,
        options ? JSON.stringify(options) : null,
        validation_rules ? JSON.stringify(validation_rules) : null,
        order_index || 0,
        show_in_list ?? true,
        show_in_card ?? false,
        user.userId
      ]
    );

    const definitions = await query('SELECT * FROM custom_field_definitions WHERE id = ?', [id]);
    const definition = (definitions as any[])[0];
    definition.options = definition.options ? JSON.parse(definition.options) : null;
    definition.validation_rules = definition.validation_rules ? JSON.parse(definition.validation_rules) : null;

    return NextResponse.json({ success: true, data: definition }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating custom field:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update field definition
async function handlePut(request: NextRequest, user: DecodedToken) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Field ID is required' }, { status: 400 });
    }

    const allowedFields = [
      'name', 'description', 'is_required', 'default_value', 
      'options', 'validation_rules', 'order_index', 'show_in_list', 
      'show_in_card', 'is_active'
    ];

    const updateFields: string[] = [];
    const params: any[] = [];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        if (field === 'options' || field === 'validation_rules') {
          params.push(JSON.stringify(updates[field]));
        } else {
          params.push(updates[field]);
        }
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ success: false, error: 'No updates provided' }, { status: 400 });
    }

    updateFields.push('updated_at = NOW()');
    params.push(id);

    await query(
      `UPDATE custom_field_definitions SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    const definitions = await query('SELECT * FROM custom_field_definitions WHERE id = ?', [id]);
    const definition = (definitions as any[])[0];
    definition.options = definition.options ? JSON.parse(definition.options) : null;
    definition.validation_rules = definition.validation_rules ? JSON.parse(definition.validation_rules) : null;

    return NextResponse.json({ success: true, data: definition });
  } catch (error: any) {
    console.error('Error updating custom field:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete field definition or value
async function handleDelete(request: NextRequest, user: DecodedToken) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const entityId = searchParams.get('entity_id');
    const fieldId = searchParams.get('field_id');

    if (entityId && fieldId) {
      // Delete specific value
      await query(
        'DELETE FROM custom_field_values WHERE entity_id = ? AND field_id = ?',
        [entityId, fieldId]
      );
      return NextResponse.json({ success: true, message: 'Field value deleted' });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Field definition ID is required' }, { status: 400 });
    }

    // Delete field definition (cascade will delete values)
    await query('DELETE FROM custom_field_definitions WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Field definition deleted' });
  } catch (error: any) {
    console.error('Error deleting custom field:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Validation helper
function validateFieldValue(definition: any, value: any): string | null {
  if (definition.is_required && (value === null || value === undefined || value === '')) {
    return `${definition.name} is required`;
  }

  if (value === null || value === undefined) return null;

  switch (definition.field_type) {
    case 'number':
    case 'currency':
      if (isNaN(Number(value))) return `${definition.name} must be a number`;
      break;
    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `${definition.name} must be a valid email`;
      break;
    case 'url':
      try {
        new URL(value);
      } catch {
        return `${definition.name} must be a valid URL`;
      }
      break;
    case 'date':
    case 'datetime':
      if (isNaN(Date.parse(value))) return `${definition.name} must be a valid date`;
      break;
    case 'select':
      if (definition.options) {
        const options = typeof definition.options === 'string' ? JSON.parse(definition.options) : definition.options;
        if (!options.includes(value)) return `${definition.name} must be one of the available options`;
      }
      break;
  }

  return null;
}

// Get value columns helper
function getValueColumns(fieldType: string, value: any) {
  const columns = {
    value_text: null as string | null,
    value_number: null as number | null,
    value_date: null as string | null,
    value_json: null as string | null
  };

  if (value === null || value === undefined) return columns;

  switch (fieldType) {
    case 'number':
    case 'currency':
      columns.value_number = Number(value);
      break;
    case 'date':
    case 'datetime':
      columns.value_date = value;
      break;
    case 'multiselect':
    case 'checkbox':
      columns.value_json = JSON.stringify(value);
      break;
    default:
      columns.value_text = String(value);
  }

  return columns;
}

export const GET = withAuth(handleGet, { requiredPermissions: ['projects.view'] });
export const POST = withAuth(handlePost, { requiredPermissions: ['projects.create'] });
export const PUT = withAuth(handlePut, { requiredPermissions: ['projects.edit'] });
export const DELETE = withAuth(handleDelete, { requiredPermissions: ['projects.delete'] });
