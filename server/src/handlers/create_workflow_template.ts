import { db } from '../db';
import { workflowTemplatesTable, workflowStepsTable, usersTable } from '../db/schema';
import { type CreateWorkflowTemplateInput, type WorkflowTemplate } from '../schema';
import { eq } from 'drizzle-orm';

export async function createWorkflowTemplate(input: CreateWorkflowTemplateInput): Promise<WorkflowTemplate> {
  try {
    // Validate that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Validate step order sequence (should be consecutive starting from 1)
    const stepOrders = input.steps.map(step => step.step_order).sort((a, b) => a - b);
    for (let i = 0; i < stepOrders.length; i++) {
      if (stepOrders[i] !== i + 1) {
        throw new Error('Step orders must be consecutive starting from 1');
      }
    }

    // Validate assignee_id if provided
    const assigneeIds = input.steps
      .filter(step => step.assignee_id !== undefined && step.assignee_id !== null)
      .map(step => step.assignee_id!);

    if (assigneeIds.length > 0) {
      const existingAssignees = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, assigneeIds[0])) // Check first one for simplicity
        .execute();

      for (const assigneeId of assigneeIds) {
        const assigneeExists = await db.select()
          .from(usersTable)
          .where(eq(usersTable.id, assigneeId))
          .execute();

        if (assigneeExists.length === 0) {
          throw new Error(`Assignee with ID ${assigneeId} does not exist`);
        }
      }
    }

    // Create the workflow template
    const templateResult = await db.insert(workflowTemplatesTable)
      .values({
        user_id: input.user_id,
        name: input.name,
        description: input.description || null,
        is_active: true
      })
      .returning()
      .execute();

    const template = templateResult[0];

    // Create workflow steps
    const stepValues = input.steps.map(step => ({
      workflow_template_id: template.id,
      step_order: step.step_order,
      step_type: step.step_type,
      required: step.required,
      assignee_id: step.assignee_id ?? null
    }));

    await db.insert(workflowStepsTable)
      .values(stepValues)
      .execute();

    // Return the complete workflow template with steps normalized
    const normalizedSteps = input.steps.map(step => ({
      ...step,
      assignee_id: step.assignee_id ?? null
    }));

    return {
      id: template.id,
      user_id: template.user_id,
      name: template.name,
      description: template.description,
      steps: normalizedSteps,
      is_active: template.is_active,
      created_at: template.created_at,
      updated_at: template.updated_at,
    };
  } catch (error) {
    console.error('Workflow template creation failed:', error);
    throw error;
  }
}