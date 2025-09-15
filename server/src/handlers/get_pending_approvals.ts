import { db } from '../db';
import { contentTable, usersTable, workflowStepsTable, workflowTemplatesTable, contentWorkflowInstancesTable } from '../db/schema';
import { type Content } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export async function getPendingApprovals(userId: number): Promise<Content[]> {
  try {
    // Query for content that is pending approval and assigned to the user
    // This involves joining with workflow instances and workflow steps to find
    // content where the user is assigned as an approver in an active workflow
    const results = await db
      .select({
        id: contentTable.id,
        user_id: contentTable.user_id,
        title: contentTable.title,
        caption: contentTable.caption,
        hashtags: contentTable.hashtags,
        platform: contentTable.platform,
        content_type: contentTable.content_type,
        status: contentTable.status,
        ai_generated: contentTable.ai_generated,
        scheduled_at: contentTable.scheduled_at,
        approved_at: contentTable.approved_at,
        approved_by: contentTable.approved_by,
        rejected_reason: contentTable.rejected_reason,
        created_at: contentTable.created_at,
        updated_at: contentTable.updated_at,
      })
      .from(contentTable)
      .innerJoin(contentWorkflowInstancesTable, eq(contentTable.id, contentWorkflowInstancesTable.content_id))
      .innerJoin(workflowStepsTable, eq(contentWorkflowInstancesTable.current_step_id, workflowStepsTable.id))
      .where(
        and(
          eq(contentTable.status, 'pending_approval'),
          eq(workflowStepsTable.assignee_id, userId),
          eq(workflowStepsTable.step_type, 'approval'),
          eq(contentWorkflowInstancesTable.status, 'in_progress')
        )
      )
      .orderBy(desc(contentTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get pending approvals:', error);
    throw error;
  }
}