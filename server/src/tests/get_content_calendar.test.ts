import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contentTable } from '../db/schema';
import { type ContentCalendarQuery } from '../schema';
import { getContentCalendar } from '../handlers/get_content_calendar';

// Test user data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

// Test content data
const baseDate = new Date('2024-01-15T10:00:00Z');
const scheduledContent = {
  title: 'Scheduled Post',
  caption: 'This is a scheduled post',
  hashtags: '#test #scheduled',
  platform: 'instagram' as const,
  content_type: 'post' as const,
  status: 'scheduled' as const,
  ai_generated: false,
  scheduled_at: baseDate
};

const approvedContent = {
  title: 'Approved Post',
  caption: 'This is an approved post',
  hashtags: '#test #approved',
  platform: 'facebook' as const,
  content_type: 'post' as const,
  status: 'approved' as const,
  ai_generated: true,
  scheduled_at: new Date('2024-01-16T14:00:00Z')
};

const unscheduledContent = {
  title: 'Draft Post',
  caption: 'This is a draft post',
  hashtags: '#test #draft',
  platform: 'twitter' as const,
  content_type: 'tweet' as const,
  status: 'draft' as const,
  ai_generated: false,
  scheduled_at: null
};

describe('getContentCalendar', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch scheduled content within date range', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values(testUser).returning();

    // Create test content
    await db.insert(contentTable).values([
      { ...scheduledContent, user_id: user.id },
      { ...approvedContent, user_id: user.id },
      { ...unscheduledContent, user_id: user.id }
    ]);

    const query: ContentCalendarQuery = {
      user_id: user.id,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-31T23:59:59Z')
    };

    const result = await getContentCalendar(query);

    // Should return 2 items (only those with scheduled_at dates)
    expect(result).toHaveLength(2);

    // Verify scheduled content is included
    const scheduledItem = result.find(item => item.title === 'Scheduled Post');
    expect(scheduledItem).toBeDefined();
    expect(scheduledItem!.scheduled_at).toBeInstanceOf(Date);
    expect(scheduledItem!.status).toEqual('scheduled');

    // Verify approved content is included
    const approvedItem = result.find(item => item.title === 'Approved Post');
    expect(approvedItem).toBeDefined();
    expect(approvedItem!.scheduled_at).toBeInstanceOf(Date);
    expect(approvedItem!.status).toEqual('approved');

    // Verify unscheduled content is NOT included
    const draftItem = result.find(item => item.title === 'Draft Post');
    expect(draftItem).toBeUndefined();
  });

  it('should filter by platform when specified', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values(testUser).returning();

    // Create content for different platforms
    await db.insert(contentTable).values([
      { ...scheduledContent, user_id: user.id, platform: 'instagram' },
      { ...approvedContent, user_id: user.id, platform: 'facebook' }
    ]);

    const query: ContentCalendarQuery = {
      user_id: user.id,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-31T23:59:59Z'),
      platform: 'instagram'
    };

    const result = await getContentCalendar(query);

    expect(result).toHaveLength(1);
    expect(result[0].platform).toEqual('instagram');
    expect(result[0].title).toEqual('Scheduled Post');
  });

  it('should filter by status when specified', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values(testUser).returning();

    // Create content with different statuses
    await db.insert(contentTable).values([
      { ...scheduledContent, user_id: user.id, status: 'scheduled' },
      { ...approvedContent, user_id: user.id, status: 'approved' }
    ]);

    const query: ContentCalendarQuery = {
      user_id: user.id,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-31T23:59:59Z'),
      status: 'approved'
    };

    const result = await getContentCalendar(query);

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('approved');
    expect(result[0].title).toEqual('Approved Post');
  });

  it('should respect date range boundaries', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values(testUser).returning();

    // Create content outside and inside date range
    await db.insert(contentTable).values([
      {
        ...scheduledContent,
        user_id: user.id,
        title: 'Before Range',
        scheduled_at: new Date('2023-12-31T23:59:59Z') // Before range
      },
      {
        ...scheduledContent,
        user_id: user.id,
        title: 'In Range',
        scheduled_at: new Date('2024-01-15T12:00:00Z') // In range
      },
      {
        ...scheduledContent,
        user_id: user.id,
        title: 'After Range',
        scheduled_at: new Date('2024-02-01T00:00:01Z') // After range
      }
    ]);

    const query: ContentCalendarQuery = {
      user_id: user.id,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-31T23:59:59Z')
    };

    const result = await getContentCalendar(query);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('In Range');
    expect(result[0].scheduled_at!.getTime()).toBeGreaterThanOrEqual(query.start_date.getTime());
    expect(result[0].scheduled_at!.getTime()).toBeLessThanOrEqual(query.end_date.getTime());
  });

  it('should only return content for specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable).values({ ...testUser, email: 'user1@example.com' }).returning();
    const [user2] = await db.insert(usersTable).values({ ...testUser, email: 'user2@example.com' }).returning();

    // Create content for both users
    await db.insert(contentTable).values([
      { ...scheduledContent, user_id: user1.id, title: 'User 1 Content' },
      { ...scheduledContent, user_id: user2.id, title: 'User 2 Content' }
    ]);

    const query: ContentCalendarQuery = {
      user_id: user1.id,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-31T23:59:59Z')
    };

    const result = await getContentCalendar(query);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].title).toEqual('User 1 Content');
  });

  it('should return empty array when no content matches criteria', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values(testUser).returning();

    // Create content outside date range
    await db.insert(contentTable).values([
      {
        ...scheduledContent,
        user_id: user.id,
        scheduled_at: new Date('2023-12-01T00:00:00Z')
      }
    ]);

    const query: ContentCalendarQuery = {
      user_id: user.id,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-31T23:59:59Z')
    };

    const result = await getContentCalendar(query);

    expect(result).toHaveLength(0);
  });

  it('should combine platform and status filters', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values(testUser).returning();

    // Create content with different combinations
    await db.insert(contentTable).values([
      { 
        ...scheduledContent, 
        user_id: user.id, 
        platform: 'instagram', 
        status: 'scheduled',
        title: 'Instagram Scheduled'
      },
      { 
        ...approvedContent, 
        user_id: user.id, 
        platform: 'instagram', 
        status: 'approved',
        title: 'Instagram Approved'
      },
      { 
        ...scheduledContent, 
        user_id: user.id, 
        platform: 'facebook', 
        status: 'scheduled',
        title: 'Facebook Scheduled'
      }
    ]);

    const query: ContentCalendarQuery = {
      user_id: user.id,
      start_date: new Date('2024-01-01T00:00:00Z'),
      end_date: new Date('2024-01-31T23:59:59Z'),
      platform: 'instagram',
      status: 'approved'
    };

    const result = await getContentCalendar(query);

    expect(result).toHaveLength(1);
    expect(result[0].platform).toEqual('instagram');
    expect(result[0].status).toEqual('approved');
    expect(result[0].title).toEqual('Instagram Approved');
  });
});