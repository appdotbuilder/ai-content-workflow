import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, workflowTemplatesTable, workflowStepsTable } from '../db/schema';
import { getWorkflowTemplates, getWorkflowTemplateById } from '../handlers/get_workflow_templates';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

const testUser2 = {
  email: 'test2@example.com',
  name: 'Test User 2'
};

const testTemplate = {
  name: 'Content Review Workflow',
  description: 'Standard content review and approval process',
  is_active: true
};

const testTemplate2 = {
  name: 'Quick Publish Workflow',
  description: 'Fast-track workflow for approved publishers',
  is_active: false
};

const testSteps = [
  {
    step_order: 1,
    step_type: 'generation' as const,
    required: true,
    assignee_id: null
  },
  {
    step_order: 2,
    step_type: 'review' as const,
    required: true,
    assignee_id: null
  },
  {
    step_order: 3,
    step_type: 'approval' as const,
    required: false,
    assignee_id: null
  }
];

describe('getWorkflowTemplates', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no workflow templates', async () => {
    const users = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = users[0].id;

    const result = await getWorkflowTemplates(userId);

    expect(result).toEqual([]);
  });

  it('should return workflow templates with steps for a user', async () => {
    // Create users
    const users = await db.insert(usersTable).values([testUser, testUser2]).returning().execute();
    const userId = users[0].id;
    const user2Id = users[1].id;

    // Create workflow templates
    const templates = await db.insert(workflowTemplatesTable)
      .values([
        { ...testTemplate, user_id: userId },
        { ...testTemplate2, user_id: userId },
        { ...testTemplate, user_id: user2Id } // Different user's template
      ])
      .returning()
      .execute();

    const template1Id = templates[0].id;
    const template2Id = templates[1].id;
    const otherUserTemplateId = templates[2].id;

    // Create steps for templates
    await db.insert(workflowStepsTable)
      .values([
        // Steps for template 1
        { ...testSteps[0], workflow_template_id: template1Id },
        { ...testSteps[1], workflow_template_id: template1Id, assignee_id: userId },
        { ...testSteps[2], workflow_template_id: template1Id },
        // Steps for template 2
        { ...testSteps[0], workflow_template_id: template2Id },
        { ...testSteps[1], workflow_template_id: template2Id },
        // Step for other user's template
        { ...testSteps[0], workflow_template_id: otherUserTemplateId }
      ])
      .execute();

    const result = await getWorkflowTemplates(userId);

    expect(result).toHaveLength(2);
    
    // Check first template
    const firstTemplate = result.find(t => t.name === testTemplate.name);
    expect(firstTemplate).toBeDefined();
    expect(firstTemplate!.user_id).toBe(userId);
    expect(firstTemplate!.name).toBe(testTemplate.name);
    expect(firstTemplate!.description).toBe(testTemplate.description);
    expect(firstTemplate!.is_active).toBe(testTemplate.is_active);
    expect(firstTemplate!.steps).toHaveLength(3);
    expect(firstTemplate!.steps[0].step_order).toBe(1);
    expect(firstTemplate!.steps[0].step_type).toBe('generation');
    expect(firstTemplate!.steps[0].required).toBe(true);
    expect(firstTemplate!.steps[0].assignee_id).toBe(null);
    expect(firstTemplate!.steps[1].assignee_id).toBe(userId);

    // Check second template
    const secondTemplate = result.find(t => t.name === testTemplate2.name);
    expect(secondTemplate).toBeDefined();
    expect(secondTemplate!.user_id).toBe(userId);
    expect(secondTemplate!.name).toBe(testTemplate2.name);
    expect(secondTemplate!.is_active).toBe(testTemplate2.is_active);
    expect(secondTemplate!.steps).toHaveLength(2);

    // Ensure other user's template is not included
    expect(result.every(t => t.user_id === userId)).toBe(true);
  });

  it('should return workflow template with no steps', async () => {
    // Create user and template without steps
    const users = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = users[0].id;

    await db.insert(workflowTemplatesTable)
      .values({ ...testTemplate, user_id: userId })
      .returning()
      .execute();

    const result = await getWorkflowTemplates(userId);

    expect(result).toHaveLength(1);
    expect(result[0].steps).toEqual([]);
  });

  it('should handle multiple workflow templates with mixed step configurations', async () => {
    // Create user
    const users = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = users[0].id;

    // Create multiple templates
    const templates = await db.insert(workflowTemplatesTable)
      .values([
        { ...testTemplate, user_id: userId },
        { ...testTemplate2, user_id: userId }
      ])
      .returning()
      .execute();

    const template1Id = templates[0].id;
    const template2Id = templates[1].id;

    // Create different step configurations
    await db.insert(workflowStepsTable)
      .values([
        // Template 1: Full workflow
        { step_order: 1, step_type: 'generation', required: true, workflow_template_id: template1Id },
        { step_order: 2, step_type: 'review', required: true, workflow_template_id: template1Id },
        { step_order: 3, step_type: 'approval', required: true, workflow_template_id: template1Id },
        { step_order: 4, step_type: 'scheduling', required: false, workflow_template_id: template1Id },
        // Template 2: Simple workflow
        { step_order: 1, step_type: 'generation', required: true, workflow_template_id: template2Id }
      ])
      .execute();

    const result = await getWorkflowTemplates(userId);

    expect(result).toHaveLength(2);
    
    const fullWorkflow = result.find(t => t.name === testTemplate.name);
    const simpleWorkflow = result.find(t => t.name === testTemplate2.name);
    
    expect(fullWorkflow!.steps).toHaveLength(4);
    expect(simpleWorkflow!.steps).toHaveLength(1);
    
    // Verify step types are correctly mapped
    expect(fullWorkflow!.steps.map(s => s.step_type)).toEqual(['generation', 'review', 'approval', 'scheduling']);
    expect(simpleWorkflow!.steps[0].step_type).toBe('generation');
  });
});

describe('getWorkflowTemplateById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent template', async () => {
    const result = await getWorkflowTemplateById(999);
    expect(result).toBe(null);
  });

  it('should return workflow template with steps by ID', async () => {
    // Create user and template
    const users = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = users[0].id;

    const templates = await db.insert(workflowTemplatesTable)
      .values({ ...testTemplate, user_id: userId })
      .returning()
      .execute();

    const templateId = templates[0].id;

    // Create steps
    await db.insert(workflowStepsTable)
      .values([
        { ...testSteps[0], workflow_template_id: templateId },
        { ...testSteps[1], workflow_template_id: templateId, assignee_id: userId },
        { ...testSteps[2], workflow_template_id: templateId }
      ])
      .execute();

    const result = await getWorkflowTemplateById(templateId);

    expect(result).not.toBe(null);
    expect(result!.id).toBe(templateId);
    expect(result!.user_id).toBe(userId);
    expect(result!.name).toBe(testTemplate.name);
    expect(result!.description).toBe(testTemplate.description);
    expect(result!.is_active).toBe(testTemplate.is_active);
    expect(result!.steps).toHaveLength(3);
    
    // Verify steps are correctly structured
    expect(result!.steps[0].step_order).toBe(1);
    expect(result!.steps[0].step_type).toBe('generation');
    expect(result!.steps[0].required).toBe(true);
    expect(result!.steps[0].assignee_id).toBe(null);
    
    expect(result!.steps[1].assignee_id).toBe(userId);
    expect(result!.steps[2].required).toBe(false);
    
    // Verify date fields are properly typed
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return workflow template with no steps', async () => {
    // Create user and template without steps
    const users = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = users[0].id;

    const templates = await db.insert(workflowTemplatesTable)
      .values({ ...testTemplate, user_id: userId })
      .returning()
      .execute();

    const templateId = templates[0].id;

    const result = await getWorkflowTemplateById(templateId);

    expect(result).not.toBe(null);
    expect(result!.id).toBe(templateId);
    expect(result!.steps).toEqual([]);
  });

  it('should return complete workflow template with all step types', async () => {
    // Create user
    const users = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = users[0].id;

    // Create template
    const templates = await db.insert(workflowTemplatesTable)
      .values({ ...testTemplate, user_id: userId })
      .returning()
      .execute();

    const templateId = templates[0].id;

    // Create all step types
    await db.insert(workflowStepsTable)
      .values([
        { step_order: 1, step_type: 'generation', required: true, workflow_template_id: templateId, assignee_id: null },
        { step_order: 2, step_type: 'review', required: true, workflow_template_id: templateId, assignee_id: userId },
        { step_order: 3, step_type: 'approval', required: false, workflow_template_id: templateId, assignee_id: userId },
        { step_order: 4, step_type: 'scheduling', required: true, workflow_template_id: templateId, assignee_id: null }
      ])
      .execute();

    const result = await getWorkflowTemplateById(templateId);

    expect(result).not.toBe(null);
    expect(result!.steps).toHaveLength(4);
    
    // Verify all step types are present and correctly ordered
    const stepTypes = result!.steps.map(s => s.step_type);
    expect(stepTypes).toEqual(['generation', 'review', 'approval', 'scheduling']);
    
    // Verify assignee assignments
    expect(result!.steps[0].assignee_id).toBe(null);
    expect(result!.steps[1].assignee_id).toBe(userId);
    expect(result!.steps[2].assignee_id).toBe(userId);
    expect(result!.steps[3].assignee_id).toBe(null);
    
    // Verify required flags
    expect(result!.steps.map(s => s.required)).toEqual([true, true, false, true]);
  });
});