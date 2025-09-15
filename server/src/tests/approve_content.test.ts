import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { type ApproveContentInput } from '../schema';
import { approveContent } from '../handlers/approve_content';
import { eq } from 'drizzle-orm';

describe('approveContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let approverUserId: number;
  let testContentId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'content-owner@test.com',
          name: 'Content Owner'
        },
        {
          email: 'approver@test.com',
          name: 'Content Approver'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    approverUserId = users[1].id;

    // Create test content
    const content = await db.insert(contentTable)
      .values({
        user_id: testUserId,
        title: 'Test Content',
        caption: 'This is test content',
        hashtags: '#test #content',
        platform: 'instagram',
        content_type: 'post',
        status: 'pending_approval',
        ai_generated: true
      })
      .returning()
      .execute();

    testContentId = content[0].id;
  });

  it('should approve content successfully', async () => {
    const approvalInput: ApproveContentInput = {
      content_id: testContentId,
      approved_by: approverUserId,
      approved: true
    };

    const result = await approveContent(approvalInput);

    // Verify the result
    expect(result.id).toEqual(testContentId);
    expect(result.status).toEqual('approved');
    expect(result.approved_by).toEqual(approverUserId);
    expect(result.approved_at).toBeInstanceOf(Date);
    expect(result.rejected_reason).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should reject content successfully', async () => {
    const rejectionInput: ApproveContentInput = {
      content_id: testContentId,
      approved_by: approverUserId,
      approved: false,
      rejection_reason: 'Content does not meet quality standards'
    };

    const result = await approveContent(rejectionInput);

    // Verify the result
    expect(result.id).toEqual(testContentId);
    expect(result.status).toEqual('rejected');
    expect(result.rejected_reason).toEqual('Content does not meet quality standards');
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should reject content with default reason when no reason provided', async () => {
    const rejectionInput: ApproveContentInput = {
      content_id: testContentId,
      approved_by: approverUserId,
      approved: false
    };

    const result = await approveContent(rejectionInput);

    expect(result.status).toEqual('rejected');
    expect(result.rejected_reason).toEqual('No reason provided');
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
  });

  it('should save approval data to database', async () => {
    const approvalInput: ApproveContentInput = {
      content_id: testContentId,
      approved_by: approverUserId,
      approved: true
    };

    await approveContent(approvalInput);

    // Query the database directly to verify changes
    const updatedContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, testContentId))
      .execute();

    expect(updatedContent).toHaveLength(1);
    const content = updatedContent[0];
    expect(content.status).toEqual('approved');
    expect(content.approved_by).toEqual(approverUserId);
    expect(content.approved_at).toBeInstanceOf(Date);
    expect(content.rejected_reason).toBeNull();
  });

  it('should save rejection data to database', async () => {
    const rejectionInput: ApproveContentInput = {
      content_id: testContentId,
      approved_by: approverUserId,
      approved: false,
      rejection_reason: 'Inappropriate content'
    };

    await approveContent(rejectionInput);

    // Query the database directly to verify changes
    const updatedContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, testContentId))
      .execute();

    expect(updatedContent).toHaveLength(1);
    const content = updatedContent[0];
    expect(content.status).toEqual('rejected');
    expect(content.rejected_reason).toEqual('Inappropriate content');
    expect(content.approved_by).toBeNull();
    expect(content.approved_at).toBeNull();
  });

  it('should clear previous rejection reason when approving', async () => {
    // First reject the content
    await approveContent({
      content_id: testContentId,
      approved_by: approverUserId,
      approved: false,
      rejection_reason: 'Initial rejection'
    });

    // Then approve it
    const approvalInput: ApproveContentInput = {
      content_id: testContentId,
      approved_by: approverUserId,
      approved: true
    };

    const result = await approveContent(approvalInput);

    expect(result.status).toEqual('approved');
    expect(result.rejected_reason).toBeNull();
    expect(result.approved_by).toEqual(approverUserId);
    expect(result.approved_at).toBeInstanceOf(Date);
  });

  it('should clear previous approval data when rejecting', async () => {
    // First approve the content
    await approveContent({
      content_id: testContentId,
      approved_by: approverUserId,
      approved: true
    });

    // Then reject it
    const rejectionInput: ApproveContentInput = {
      content_id: testContentId,
      approved_by: approverUserId,
      approved: false,
      rejection_reason: 'Changed requirements'
    };

    const result = await approveContent(rejectionInput);

    expect(result.status).toEqual('rejected');
    expect(result.rejected_reason).toEqual('Changed requirements');
    expect(result.approved_by).toBeNull();
    expect(result.approved_at).toBeNull();
  });

  it('should throw error when content does not exist', async () => {
    const nonExistentContentId = 99999;
    const approvalInput: ApproveContentInput = {
      content_id: nonExistentContentId,
      approved_by: approverUserId,
      approved: true
    };

    await expect(approveContent(approvalInput))
      .rejects.toThrow(/Content with id 99999 not found/i);
  });

  it('should update timestamps correctly', async () => {
    const beforeApproval = new Date();
    
    await approveContent({
      content_id: testContentId,
      approved_by: approverUserId,
      approved: true
    });

    const updatedContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, testContentId))
      .execute();

    const content = updatedContent[0];
    expect(content.updated_at.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime());
    expect(content.approved_at!.getTime()).toBeGreaterThanOrEqual(beforeApproval.getTime());
  });
});