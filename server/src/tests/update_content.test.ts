import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { type UpdateContentInput } from '../schema';
import { updateContent } from '../handlers/update_content';
import { eq } from 'drizzle-orm';

describe('updateContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testContentId: number;

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create test content to update
    const contentResult = await db.insert(contentTable)
      .values({
        user_id: testUserId,
        title: 'Original Title',
        caption: 'Original caption',
        hashtags: '#original #test',
        platform: 'instagram',
        content_type: 'post',
        status: 'draft',
        ai_generated: false,
        scheduled_at: null
      })
      .returning()
      .execute();

    testContentId = contentResult[0].id;
  });

  it('should update content title', async () => {
    const input: UpdateContentInput = {
      id: testContentId,
      title: 'Updated Title'
    };

    const result = await updateContent(input);

    expect(result.id).toEqual(testContentId);
    expect(result.title).toEqual('Updated Title');
    expect(result.caption).toEqual('Original caption'); // Should remain unchanged
    expect(result.hashtags).toEqual('#original #test'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateContentInput = {
      id: testContentId,
      title: 'New Title',
      caption: 'New caption content',
      hashtags: '#new #updated #content',
      platform: 'twitter',
      content_type: 'tweet',
      status: 'pending_approval'
    };

    const result = await updateContent(input);

    expect(result.title).toEqual('New Title');
    expect(result.caption).toEqual('New caption content');
    expect(result.hashtags).toEqual('#new #updated #content');
    expect(result.platform).toEqual('twitter');
    expect(result.content_type).toEqual('tweet');
    expect(result.status).toEqual('pending_approval');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update nullable fields correctly', async () => {
    const input: UpdateContentInput = {
      id: testContentId,
      hashtags: null,
      scheduled_at: new Date('2024-12-31T10:00:00Z'),
      rejected_reason: 'Content needs revision'
    };

    const result = await updateContent(input);

    expect(result.hashtags).toBeNull();
    expect(result.scheduled_at).toBeInstanceOf(Date);
    expect(result.scheduled_at?.toISOString()).toEqual('2024-12-31T10:00:00.000Z');
    expect(result.rejected_reason).toEqual('Content needs revision');
  });

  it('should set nullable fields to null', async () => {
    // First set a value
    await db.update(contentTable)
      .set({
        hashtags: '#existing #hashtags',
        rejected_reason: 'Previous rejection'
      })
      .where(eq(contentTable.id, testContentId))
      .execute();

    const input: UpdateContentInput = {
      id: testContentId,
      hashtags: null,
      rejected_reason: null
    };

    const result = await updateContent(input);

    expect(result.hashtags).toBeNull();
    expect(result.rejected_reason).toBeNull();
  });

  it('should persist changes to database', async () => {
    const input: UpdateContentInput = {
      id: testContentId,
      title: 'Persisted Title',
      status: 'approved'
    };

    await updateContent(input);

    // Query database directly to verify persistence
    const contentFromDb = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, testContentId))
      .execute();

    expect(contentFromDb).toHaveLength(1);
    expect(contentFromDb[0].title).toEqual('Persisted Title');
    expect(contentFromDb[0].status).toEqual('approved');
    expect(contentFromDb[0].updated_at).toBeInstanceOf(Date);
  });

  it('should always update the updated_at timestamp', async () => {
    const originalContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, testContentId))
      .execute();

    const originalUpdatedAt = originalContent[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateContentInput = {
      id: testContentId,
      title: 'Timestamp Test'
    };

    const result = await updateContent(input);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle partial updates without affecting other fields', async () => {
    // Only update the caption
    const input: UpdateContentInput = {
      id: testContentId,
      caption: 'Only caption changed'
    };

    const result = await updateContent(input);

    expect(result.caption).toEqual('Only caption changed');
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
    expect(result.platform).toEqual('instagram'); // Should remain unchanged
    expect(result.status).toEqual('draft'); // Should remain unchanged
  });

  it('should handle scheduled_at updates', async () => {
    const scheduledDate = new Date('2024-06-15T14:30:00Z');
    
    const input: UpdateContentInput = {
      id: testContentId,
      scheduled_at: scheduledDate,
      status: 'scheduled'
    };

    const result = await updateContent(input);

    expect(result.scheduled_at).toBeInstanceOf(Date);
    expect(result.scheduled_at?.toISOString()).toEqual('2024-06-15T14:30:00.000Z');
    expect(result.status).toEqual('scheduled');
  });

  it('should throw error for non-existent content', async () => {
    const input: UpdateContentInput = {
      id: 99999, // Non-existent ID
      title: 'This will fail'
    };

    await expect(updateContent(input)).rejects.toThrow(/Content with id 99999 not found/i);
  });

  it('should handle all status transitions', async () => {
    const statuses = ['draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published'] as const;

    for (const status of statuses) {
      const input: UpdateContentInput = {
        id: testContentId,
        status: status
      };

      const result = await updateContent(input);
      expect(result.status).toEqual(status);
    }
  });

  it('should handle all platform updates', async () => {
    const platforms = ['instagram', 'facebook', 'twitter', 'linkedin'] as const;

    for (const platform of platforms) {
      const input: UpdateContentInput = {
        id: testContentId,
        platform: platform
      };

      const result = await updateContent(input);
      expect(result.platform).toEqual(platform);
    }
  });

  it('should handle all content type updates', async () => {
    const contentTypes = ['post', 'story', 'reel', 'tweet'] as const;

    for (const contentType of contentTypes) {
      const input: UpdateContentInput = {
        id: testContentId,
        content_type: contentType
      };

      const result = await updateContent(input);
      expect(result.content_type).toEqual(contentType);
    }
  });
});