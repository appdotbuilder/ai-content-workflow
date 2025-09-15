import { db } from '../db';
import { workflowTemplatesTable, workflowStepsTable, usersTable } from '../db/schema';
import { type WorkflowTemplate } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getWorkflowTemplates(userId: number): Promise<WorkflowTemplate[]> {
  try {
    // First, get all workflow templates for the user
    const templates = await db.select()
      .from(workflowTemplatesTable)
      .where(eq(workflowTemplatesTable.user_id, userId))
      .execute();

    if (templates.length === 0) {
      return [];
    }

    // Get all steps for these templates in a single query
    const templateIds = templates.map(t => t.id);
    const steps = await db.select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.workflow_template_id, templateIds[0]))
      .execute();

    // If we have multiple templates, we need to query for all their steps
    const allSteps = templateIds.length > 1 
      ? await Promise.all(
          templateIds.map(id => 
            db.select()
              .from(workflowStepsTable)
              .where(eq(workflowStepsTable.workflow_template_id, id))
              .execute()
          )
        ).then(results => results.flat())
      : steps;

    // Group steps by template ID
    const stepsByTemplate = allSteps.reduce((acc, step) => {
      const templateId = step.workflow_template_id;
      if (!acc[templateId]) {
        acc[templateId] = [];
      }
      acc[templateId].push({
        step_order: step.step_order,
        step_type: step.step_type,
        required: step.required,
        assignee_id: step.assignee_id,
      });
      return acc;
    }, {} as Record<number, Array<{
      step_order: number;
      step_type: 'generation' | 'review' | 'approval' | 'scheduling';
      required: boolean;
      assignee_id: number | null;
    }>>);

    // Combine templates with their steps
    return templates.map(template => ({
      id: template.id,
      user_id: template.user_id,
      name: template.name,
      description: template.description,
      steps: stepsByTemplate[template.id] || [],
      is_active: template.is_active,
      created_at: template.created_at,
      updated_at: template.updated_at,
    }));
  } catch (error) {
    console.error('Failed to get workflow templates:', error);
    throw error;
  }
}

export async function getWorkflowTemplateById(templateId: number): Promise<WorkflowTemplate | null> {
  try {
    // Get the template
    const templates = await db.select()
      .from(workflowTemplatesTable)
      .where(eq(workflowTemplatesTable.id, templateId))
      .execute();

    if (templates.length === 0) {
      return null;
    }

    const template = templates[0];

    // Get all steps for this template
    const steps = await db.select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.workflow_template_id, templateId))
      .execute();

    // Transform steps to match the schema format
    const formattedSteps = steps.map(step => ({
      step_order: step.step_order,
      step_type: step.step_type,
      required: step.required,
      assignee_id: step.assignee_id,
    }));

    return {
      id: template.id,
      user_id: template.user_id,
      name: template.name,
      description: template.description,
      steps: formattedSteps,
      is_active: template.is_active,
      created_at: template.created_at,
      updated_at: template.updated_at,
    };
  } catch (error) {
    console.error('Failed to get workflow template by ID:', error);
    throw error;
  }
}