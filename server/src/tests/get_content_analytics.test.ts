import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contentTable } from '../db/schema';
import { type ContentAnalyticsQuery } from '../schema';
import { getContentAnalytics } from '../handlers/get_content_analytics';
import { eq } from 'drizzle-orm';

describe('getContentAnalytics', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async (email = 'test@example.com', name = 'Test User') => {
    const result = await db.insert(usersTable)
      .values({ email, name })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test content
  const createTestContent = async (user_id: number, overrides = {}) => {
    const defaultContent = {
      user_id,
      title: 'Test Content',
      caption: 'Test caption',
      platform: 'instagram' as const,
      content_type: 'post' as const,
      status: 'draft' as const,
      ai_generated: false,
    };

    const result = await db.insert(contentTable)
      .values({ ...defaultContent, ...overrides })
      .returning()
      .execute();
    return result[0];
  };

  it('should return analytics for user with no content', async () => {
    const user = await createTestUser();
    
    const query: ContentAnalyticsQuery = {
      user_id: user.id,
    };

    const result = await getContentAnalytics(query);

    expect(result.total_content).toEqual(0);
    expect(result.ai_generated_content).toEqual(0);
    expect(result.approved_content).toEqual(0);
    expect(result.rejected_content).toEqual(0);
    expect(result.scheduled_content).toEqual(0);
    expect(result.published_content).toEqual(0);
    
    // Check platform breakdown
    expect(result.by_platform.instagram).toEqual(0);
    expect(result.by_platform.facebook).toEqual(0);
    expect(result.by_platform.twitter).toEqual(0);
    expect(result.by_platform.linkedin).toEqual(0);
    
    // Check status breakdown
    expect(result.by_status.draft).toEqual(0);
    expect(result.by_status.pending_approval).toEqual(0);
    expect(result.by_status.approved).toEqual(0);
    expect(result.by_status.rejected).toEqual(0);
    expect(result.by_status.scheduled).toEqual(0);
    expect(result.by_status.published).toEqual(0);
  });

  it('should calculate basic content analytics', async () => {
    const user = await createTestUser();
    
    // Create various content items
    await createTestContent(user.id, { status: 'draft', ai_generated: false });
    await createTestContent(user.id, { status: 'approved', ai_generated: true });
    await createTestContent(user.id, { status: 'rejected', ai_generated: false });
    await createTestContent(user.id, { status: 'scheduled', ai_generated: true });
    await createTestContent(user.id, { status: 'published', ai_generated: false });

    const query: ContentAnalyticsQuery = {
      user_id: user.id,
    };

    const result = await getContentAnalytics(query);

    expect(result.total_content).toEqual(5);
    expect(result.ai_generated_content).toEqual(2);
    expect(result.approved_content).toEqual(1);
    expect(result.rejected_content).toEqual(1);
    expect(result.scheduled_content).toEqual(1);
    expect(result.published_content).toEqual(1);
  });

  it('should group content by platform correctly', async () => {
    const user = await createTestUser();
    
    // Create content for different platforms
    await createTestContent(user.id, { platform: 'instagram' });
    await createTestContent(user.id, { platform: 'instagram' });
    await createTestContent(user.id, { platform: 'facebook' });
    await createTestContent(user.id, { platform: 'twitter' });
    await createTestContent(user.id, { platform: 'linkedin' });

    const query: ContentAnalyticsQuery = {
      user_id: user.id,
    };

    const result = await getContentAnalytics(query);

    expect(result.total_content).toEqual(5);
    expect(result.by_platform.instagram).toEqual(2);
    expect(result.by_platform.facebook).toEqual(1);
    expect(result.by_platform.twitter).toEqual(1);
    expect(result.by_platform.linkedin).toEqual(1);
  });

  it('should group content by status correctly', async () => {
    const user = await createTestUser();
    
    // Create content with different statuses
    await createTestContent(user.id, { status: 'draft' });
    await createTestContent(user.id, { status: 'draft' });
    await createTestContent(user.id, { status: 'pending_approval' });
    await createTestContent(user.id, { status: 'approved' });
    await createTestContent(user.id, { status: 'rejected' });
    await createTestContent(user.id, { status: 'scheduled' });
    await createTestContent(user.id, { status: 'published' });

    const query: ContentAnalyticsQuery = {
      user_id: user.id,
    };

    const result = await getContentAnalytics(query);

    expect(result.total_content).toEqual(7);
    expect(result.by_status.draft).toEqual(2);
    expect(result.by_status.pending_approval).toEqual(1);
    expect(result.by_status.approved).toEqual(1);
    expect(result.by_status.rejected).toEqual(1);
    expect(result.by_status.scheduled).toEqual(1);
    expect(result.by_status.published).toEqual(1);
  });

  it('should filter by date range correctly', async () => {
    const user = await createTestUser();
    
    // Create content first
    const content1 = await createTestContent(user.id, { status: 'published' });
    const content2 = await createTestContent(user.id, { status: 'draft' });
    const content3 = await createTestContent(user.id, { status: 'approved' });
    
    // Update one content item to have an old date using proper drizzle syntax
    const oldDate = new Date('2023-01-01');
    await db.update(contentTable)
      .set({ created_at: oldDate })
      .where(eq(contentTable.id, content1.id))
      .execute();

    // First, verify all content exists without date filter
    const queryAll: ContentAnalyticsQuery = {
      user_id: user.id,
    };
    const resultAll = await getContentAnalytics(queryAll);
    expect(resultAll.total_content).toEqual(3); // All 3 items should be found

    // Now query with date range that should exclude the old content
    const query: ContentAnalyticsQuery = {
      user_id: user.id,
      start_date: new Date('2024-01-01'),
      end_date: new Date('2025-12-31'), // Use future date to ensure we capture recent content
    };

    const result = await getContentAnalytics(query);

    // Should only count the 2 recent content items
    expect(result.total_content).toEqual(2);
    expect(result.by_status.draft).toEqual(1);
    expect(result.by_status.approved).toEqual(1);
    expect(result.by_status.published).toEqual(0); // Old content excluded
  });

  it('should filter by platform correctly', async () => {
    const user = await createTestUser();
    
    // Create content for different platforms
    await createTestContent(user.id, { platform: 'instagram', status: 'published' });
    await createTestContent(user.id, { platform: 'instagram', status: 'draft' });
    await createTestContent(user.id, { platform: 'facebook', status: 'approved' });
    await createTestContent(user.id, { platform: 'twitter', status: 'rejected' });

    const query: ContentAnalyticsQuery = {
      user_id: user.id,
      platform: 'instagram',
    };

    const result = await getContentAnalytics(query);

    // Should only count Instagram content
    expect(result.total_content).toEqual(2);
    expect(result.by_platform.instagram).toEqual(2);
    expect(result.by_platform.facebook).toEqual(0);
    expect(result.by_platform.twitter).toEqual(0);
    expect(result.by_status.published).toEqual(1);
    expect(result.by_status.draft).toEqual(1);
    expect(result.by_status.approved).toEqual(0); // Facebook content excluded
  });

  it('should only return analytics for specified user', async () => {
    const user1 = await createTestUser('user1@test.com', 'User 1');
    const user2 = await createTestUser('user2@test.com', 'User 2');
    
    // Create content for both users
    await createTestContent(user1.id, { status: 'published' });
    await createTestContent(user1.id, { status: 'draft' });
    await createTestContent(user2.id, { status: 'approved' });
    await createTestContent(user2.id, { status: 'rejected' });

    const query: ContentAnalyticsQuery = {
      user_id: user1.id,
    };

    const result = await getContentAnalytics(query);

    // Should only count user1's content
    expect(result.total_content).toEqual(2);
    expect(result.by_status.published).toEqual(1);
    expect(result.by_status.draft).toEqual(1);
    expect(result.by_status.approved).toEqual(0); // user2's content excluded
    expect(result.by_status.rejected).toEqual(0); // user2's content excluded
  });

  it('should handle complex analytics with multiple filters', async () => {
    const user = await createTestUser();
    
    // Create diverse content mix
    await createTestContent(user.id, { 
      platform: 'instagram', 
      status: 'published', 
      ai_generated: true 
    });
    await createTestContent(user.id, { 
      platform: 'instagram', 
      status: 'draft', 
      ai_generated: false 
    });
    await createTestContent(user.id, { 
      platform: 'facebook', 
      status: 'approved', 
      ai_generated: true 
    });
    await createTestContent(user.id, { 
      platform: 'twitter', 
      status: 'rejected', 
      ai_generated: false 
    });

    const query: ContentAnalyticsQuery = {
      user_id: user.id,
    };

    const result = await getContentAnalytics(query);

    expect(result.total_content).toEqual(4);
    expect(result.ai_generated_content).toEqual(2);
    expect(result.approved_content).toEqual(1);
    expect(result.rejected_content).toEqual(1);
    expect(result.scheduled_content).toEqual(0);
    expect(result.published_content).toEqual(1);
    
    // Platform breakdown
    expect(result.by_platform.instagram).toEqual(2);
    expect(result.by_platform.facebook).toEqual(1);
    expect(result.by_platform.twitter).toEqual(1);
    expect(result.by_platform.linkedin).toEqual(0);
    
    // Status breakdown
    expect(result.by_status.published).toEqual(1);
    expect(result.by_status.draft).toEqual(1);
    expect(result.by_status.approved).toEqual(1);
    expect(result.by_status.rejected).toEqual(1);
    expect(result.by_status.pending_approval).toEqual(0);
    expect(result.by_status.scheduled).toEqual(0);
  });
});