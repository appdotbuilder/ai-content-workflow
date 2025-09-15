import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowTemplatesTable, workflowStepsTable } from '../db/schema';
import { type CreateWorkflowTemplateInput } from '../schema';
import { createWorkflowTemplate } from '../handlers/create_workflow_template';
import { eq } from 'drizzle-orm';

describe('createWorkflowTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let assigneeUserId: number;

  beforeEach(async () => {
    // Create test users
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    const assigneeResult = await db.insert(usersTable)
      .values({
        email: 'assignee@example.com',
        name: 'Assignee User'
      })
      .returning()
      .execute();
    assigneeUserId = assigneeResult[0].id;
  });

  const createBasicTemplateInput = (): CreateWorkflowTemplateInput => ({
    user_id: testUserId,
    name: 'Basic Content Workflow',
    description: 'A simple workflow for content approval',
    steps: [
      {
        step_order: 1,
        step_type: 'generation',
        required: true,
        assignee_id: testUserId
      },
      {
        step_order: 2,
        step_type: 'review',
        required: true,
        assignee_id: assigneeUserId
      },
      {
        step_order: 3,
        step_type: 'approval',
        required: false,
        assignee_id: null
      }
    ]
  });

  it('should create a workflow template with steps', async () => {
    const input = createBasicTemplateInput();
    const result = await createWorkflowTemplate(input);

    // Verify basic fields
    expect(result.id).toBeDefined();
    expect(result.user_id).toBe(testUserId);
    expect(result.name).toBe('Basic Content Workflow');
    expect(result.description).toBe('A simple workflow for content approval');
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify steps are returned correctly
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].step_order).toBe(1);
    expect(result.steps[0].step_type).toBe('generation');
    expect(result.steps[0].required).toBe(true);
    expect(result.steps[0].assignee_id).toBe(testUserId);

    expect(result.steps[1].step_order).toBe(2);
    expect(result.steps[1].step_type).toBe('review');
    expect(result.steps[1].required).toBe(true);
    expect(result.steps[1].assignee_id).toBe(assigneeUserId);

    expect(result.steps[2].step_order).toBe(3);
    expect(result.steps[2].step_type).toBe('approval');
    expect(result.steps[2].required).toBe(false);
    expect(result.steps[2].assignee_id).toBe(null);
  });

  it('should save workflow template to database', async () => {
    const input = createBasicTemplateInput();
    const result = await createWorkflowTemplate(input);

    // Verify template was saved
    const templates = await db.select()
      .from(workflowTemplatesTable)
      .where(eq(workflowTemplatesTable.id, result.id))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Basic Content Workflow');
    expect(templates[0].user_id).toBe(testUserId);
    expect(templates[0].is_active).toBe(true);

    // Verify steps were saved
    const steps = await db.select()
      .from(workflowStepsTable)
      .where(eq(workflowStepsTable.workflow_template_id, result.id))
      .execute();

    expect(steps).toHaveLength(3);

    // Sort steps by step_order for consistent testing
    const sortedSteps = steps.sort((a, b) => a.step_order - b.step_order);

    expect(sortedSteps[0].step_order).toBe(1);
    expect(sortedSteps[0].step_type).toBe('generation');
    expect(sortedSteps[0].required).toBe(true);
    expect(sortedSteps[0].assignee_id).toBe(testUserId);

    expect(sortedSteps[1].step_order).toBe(2);
    expect(sortedSteps[1].step_type).toBe('review');
    expect(sortedSteps[1].required).toBe(true);
    expect(sortedSteps[1].assignee_id).toBe(assigneeUserId);

    expect(sortedSteps[2].step_order).toBe(3);
    expect(sortedSteps[2].step_type).toBe('approval');
    expect(sortedSteps[2].required).toBe(false);
    expect(sortedSteps[2].assignee_id).toBe(null);
  });

  it('should handle workflow template without description', async () => {
    const input: CreateWorkflowTemplateInput = {
      user_id: testUserId,
      name: 'Simple Workflow',
      steps: [
        {
          step_order: 1,
          step_type: 'generation',
          required: true
        }
      ]
    };

    const result = await createWorkflowTemplate(input);

    expect(result.name).toBe('Simple Workflow');
    expect(result.description).toBe(null);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].assignee_id).toBe(null);
  });

  it('should handle workflow template with scheduling step', async () => {
    const input: CreateWorkflowTemplateInput = {
      user_id: testUserId,
      name: 'Publishing Workflow',
      description: 'Workflow with scheduling',
      steps: [
        {
          step_order: 1,
          step_type: 'generation',
          required: true,
          assignee_id: testUserId
        },
        {
          step_order: 2,
          step_type: 'scheduling',
          required: false,
          assignee_id: assigneeUserId
        }
      ]
    };

    const result = await createWorkflowTemplate(input);

    expect(result.steps).toHaveLength(2);
    expect(result.steps[1].step_type).toBe('scheduling');
    expect(result.steps[1].required).toBe(false);
  });

  it('should reject workflow template for non-existent user', async () => {
    const input: CreateWorkflowTemplateInput = {
      user_id: 99999, // Non-existent user
      name: 'Invalid Workflow',
      steps: [
        {
          step_order: 1,
          step_type: 'generation',
          required: true
        }
      ]
    };

    await expect(createWorkflowTemplate(input)).rejects.toThrow(/User with ID 99999 does not exist/i);
  });

  it('should reject workflow template with invalid step order sequence', async () => {
    const input: CreateWorkflowTemplateInput = {
      user_id: testUserId,
      name: 'Invalid Step Order Workflow',
      steps: [
        {
          step_order: 1,
          step_type: 'generation',
          required: true
        },
        {
          step_order: 3, // Missing step 2
          step_type: 'approval',
          required: true
        }
      ]
    };

    await expect(createWorkflowTemplate(input)).rejects.toThrow(/Step orders must be consecutive starting from 1/i);
  });

  it('should reject workflow template with non-existent assignee', async () => {
    const input: CreateWorkflowTemplateInput = {
      user_id: testUserId,
      name: 'Invalid Assignee Workflow',
      steps: [
        {
          step_order: 1,
          step_type: 'generation',
          required: true,
          assignee_id: 99999 // Non-existent assignee
        }
      ]
    };

    await expect(createWorkflowTemplate(input)).rejects.toThrow(/Assignee with ID 99999 does not exist/i);
  });

  it('should handle complex workflow with all step types', async () => {
    const input: CreateWorkflowTemplateInput = {
      user_id: testUserId,
      name: 'Complete Content Workflow',
      description: 'Full workflow with all step types',
      steps: [
        {
          step_order: 1,
          step_type: 'generation',
          required: true,
          assignee_id: testUserId
        },
        {
          step_order: 2,
          step_type: 'review',
          required: true,
          assignee_id: assigneeUserId
        },
        {
          step_order: 3,
          step_type: 'approval',
          required: true,
          assignee_id: assigneeUserId
        },
        {
          step_order: 4,
          step_type: 'scheduling',
          required: false,
          assignee_id: testUserId
        }
      ]
    };

    const result = await createWorkflowTemplate(input);

    expect(result.steps).toHaveLength(4);
    expect(result.steps.map(s => s.step_type)).toEqual(['generation', 'review', 'approval', 'scheduling']);
    expect(result.steps.map(s => s.required)).toEqual([true, true, true, false]);
  });
});