import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  contentTable, 
  workflowTemplatesTable, 
  workflowStepsTable, 
  contentWorkflowInstancesTable 
} from '../db/schema';
import { getPendingApprovals } from '../handlers/get_pending_approvals';

describe('getPendingApprovals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return pending approvals for a specific user', async () => {
    // Create test users
    const [approver] = await db.insert(usersTable)
      .values({
        email: 'approver@test.com',
        name: 'Approver User'
      })
      .returning()
      .execute();

    const [contentCreator] = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        name: 'Content Creator'
      })
      .returning()
      .execute();

    // Create workflow template
    const [workflowTemplate] = await db.insert(workflowTemplatesTable)
      .values({
        user_id: contentCreator.id,
        name: 'Content Approval Workflow',
        description: 'Standard approval process'
      })
      .returning()
      .execute();

    // Create approval workflow step
    const [approvalStep] = await db.insert(workflowStepsTable)
      .values({
        workflow_template_id: workflowTemplate.id,
        step_order: 1,
        step_type: 'approval',
        required: true,
        assignee_id: approver.id
      })
      .returning()
      .execute();

    // Create content that needs approval
    const [content] = await db.insert(contentTable)
      .values({
        user_id: contentCreator.id,
        title: 'Test Content',
        caption: 'This content needs approval',
        platform: 'instagram',
        content_type: 'post',
        status: 'pending_approval',
        ai_generated: true
      })
      .returning()
      .execute();

    // Create workflow instance
    await db.insert(contentWorkflowInstancesTable)
      .values({
        content_id: content.id,
        workflow_template_id: workflowTemplate.id,
        current_step_id: approvalStep.id,
        status: 'in_progress'
      })
      .execute();

    const results = await getPendingApprovals(approver.id);

    expect(results).toHaveLength(1);
    expect(results[0].id).toEqual(content.id);
    expect(results[0].title).toEqual('Test Content');
    expect(results[0].status).toEqual('pending_approval');
    expect(results[0].ai_generated).toBe(true);
    expect(results[0].user_id).toEqual(contentCreator.id);
  });

  it('should return empty array when no pending approvals exist', async () => {
    // Create test user
    const [approver] = await db.insert(usersTable)
      .values({
        email: 'approver@test.com',
        name: 'Approver User'
      })
      .returning()
      .execute();

    const results = await getPendingApprovals(approver.id);

    expect(results).toHaveLength(0);
  });

  it('should not return content assigned to other users', async () => {
    // Create test users
    const [approver1] = await db.insert(usersTable)
      .values({
        email: 'approver1@test.com',
        name: 'Approver 1'
      })
      .returning()
      .execute();

    const [approver2] = await db.insert(usersTable)
      .values({
        email: 'approver2@test.com',
        name: 'Approver 2'
      })
      .returning()
      .execute();

    const [contentCreator] = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        name: 'Content Creator'
      })
      .returning()
      .execute();

    // Create workflow template
    const [workflowTemplate] = await db.insert(workflowTemplatesTable)
      .values({
        user_id: contentCreator.id,
        name: 'Content Approval Workflow'
      })
      .returning()
      .execute();

    // Create approval step assigned to approver2
    const [approvalStep] = await db.insert(workflowStepsTable)
      .values({
        workflow_template_id: workflowTemplate.id,
        step_order: 1,
        step_type: 'approval',
        required: true,
        assignee_id: approver2.id
      })
      .returning()
      .execute();

    // Create content that needs approval
    const [content] = await db.insert(contentTable)
      .values({
        user_id: contentCreator.id,
        title: 'Test Content for Other Approver',
        caption: 'This content is assigned to approver2',
        platform: 'instagram',
        content_type: 'post',
        status: 'pending_approval'
      })
      .returning()
      .execute();

    // Create workflow instance
    await db.insert(contentWorkflowInstancesTable)
      .values({
        content_id: content.id,
        workflow_template_id: workflowTemplate.id,
        current_step_id: approvalStep.id,
        status: 'in_progress'
      })
      .execute();

    // Check that approver1 doesn't see this content
    const results = await getPendingApprovals(approver1.id);
    expect(results).toHaveLength(0);

    // Check that approver2 does see this content
    const approver2Results = await getPendingApprovals(approver2.id);
    expect(approver2Results).toHaveLength(1);
    expect(approver2Results[0].id).toEqual(content.id);
  });

  it('should not return content that is not in pending_approval status', async () => {
    // Create test users
    const [approver] = await db.insert(usersTable)
      .values({
        email: 'approver@test.com',
        name: 'Approver User'
      })
      .returning()
      .execute();

    const [contentCreator] = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        name: 'Content Creator'
      })
      .returning()
      .execute();

    // Create workflow template
    const [workflowTemplate] = await db.insert(workflowTemplatesTable)
      .values({
        user_id: contentCreator.id,
        name: 'Content Approval Workflow'
      })
      .returning()
      .execute();

    // Create approval workflow step
    const [approvalStep] = await db.insert(workflowStepsTable)
      .values({
        workflow_template_id: workflowTemplate.id,
        step_order: 1,
        step_type: 'approval',
        required: true,
        assignee_id: approver.id
      })
      .returning()
      .execute();

    // Create content that is already approved
    const [approvedContent] = await db.insert(contentTable)
      .values({
        user_id: contentCreator.id,
        title: 'Already Approved Content',
        caption: 'This content was already approved',
        platform: 'instagram',
        content_type: 'post',
        status: 'approved'
      })
      .returning()
      .execute();

    // Create workflow instance
    await db.insert(contentWorkflowInstancesTable)
      .values({
        content_id: approvedContent.id,
        workflow_template_id: workflowTemplate.id,
        current_step_id: approvalStep.id,
        status: 'completed'
      })
      .execute();

    const results = await getPendingApprovals(approver.id);
    expect(results).toHaveLength(0);
  });

  it('should order results by created_at in descending order', async () => {
    // Create test users
    const [approver] = await db.insert(usersTable)
      .values({
        email: 'approver@test.com',
        name: 'Approver User'
      })
      .returning()
      .execute();

    const [contentCreator] = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        name: 'Content Creator'
      })
      .returning()
      .execute();

    // Create workflow template
    const [workflowTemplate] = await db.insert(workflowTemplatesTable)
      .values({
        user_id: contentCreator.id,
        name: 'Content Approval Workflow'
      })
      .returning()
      .execute();

    // Create approval workflow step
    const [approvalStep] = await db.insert(workflowStepsTable)
      .values({
        workflow_template_id: workflowTemplate.id,
        step_order: 1,
        step_type: 'approval',
        required: true,
        assignee_id: approver.id
      })
      .returning()
      .execute();

    // Create multiple content items with different timestamps
    const olderDate = new Date('2024-01-01');
    const newerDate = new Date('2024-01-02');

    const [olderContent] = await db.insert(contentTable)
      .values({
        user_id: contentCreator.id,
        title: 'Older Content',
        caption: 'This content was created first',
        platform: 'instagram',
        content_type: 'post',
        status: 'pending_approval',
        created_at: olderDate
      })
      .returning()
      .execute();

    const [newerContent] = await db.insert(contentTable)
      .values({
        user_id: contentCreator.id,
        title: 'Newer Content',
        caption: 'This content was created later',
        platform: 'instagram',
        content_type: 'post',
        status: 'pending_approval',
        created_at: newerDate
      })
      .returning()
      .execute();

    // Create workflow instances for both
    await db.insert(contentWorkflowInstancesTable)
      .values([
        {
          content_id: olderContent.id,
          workflow_template_id: workflowTemplate.id,
          current_step_id: approvalStep.id,
          status: 'in_progress'
        },
        {
          content_id: newerContent.id,
          workflow_template_id: workflowTemplate.id,
          current_step_id: approvalStep.id,
          status: 'in_progress'
        }
      ])
      .execute();

    const results = await getPendingApprovals(approver.id);

    expect(results).toHaveLength(2);
    // Newer content should be first (descending order)
    expect(results[0].title).toEqual('Newer Content');
    expect(results[1].title).toEqual('Older Content');
    expect(results[0].created_at.getTime()).toBeGreaterThan(results[1].created_at.getTime());
  });

  it('should only return content for approval steps, not other step types', async () => {
    // Create test users
    const [user] = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const [contentCreator] = await db.insert(usersTable)
      .values({
        email: 'creator@test.com',
        name: 'Content Creator'
      })
      .returning()
      .execute();

    // Create workflow template
    const [workflowTemplate] = await db.insert(workflowTemplatesTable)
      .values({
        user_id: contentCreator.id,
        name: 'Content Workflow'
      })
      .returning()
      .execute();

    // Create non-approval workflow step (review step)
    const [reviewStep] = await db.insert(workflowStepsTable)
      .values({
        workflow_template_id: workflowTemplate.id,
        step_order: 1,
        step_type: 'review',
        required: true,
        assignee_id: user.id
      })
      .returning()
      .execute();

    // Create content that needs review (not approval)
    const [content] = await db.insert(contentTable)
      .values({
        user_id: contentCreator.id,
        title: 'Content for Review',
        caption: 'This content is in review stage',
        platform: 'instagram',
        content_type: 'post',
        status: 'pending_approval'
      })
      .returning()
      .execute();

    // Create workflow instance pointing to review step
    await db.insert(contentWorkflowInstancesTable)
      .values({
        content_id: content.id,
        workflow_template_id: workflowTemplate.id,
        current_step_id: reviewStep.id,
        status: 'in_progress'
      })
      .execute();

    const results = await getPendingApprovals(user.id);
    expect(results).toHaveLength(0);
  });
});