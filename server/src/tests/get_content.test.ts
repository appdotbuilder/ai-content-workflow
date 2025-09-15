import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contentTable } from '../db/schema';
import { getContent, getContentById } from '../handlers/get_content';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

const testUser2 = {
  email: 'test2@example.com',
  name: 'Test User 2'
};

const testContent = {
  title: 'Test Content',
  caption: 'This is a test caption',
  hashtags: '#test #content',
  platform: 'instagram' as const,
  content_type: 'post' as const,
  ai_generated: false
};

const testContent2 = {
  title: 'Another Test Content',
  caption: 'Another test caption',
  hashtags: '#another #test',
  platform: 'facebook' as const,
  content_type: 'story' as const,
  ai_generated: true,
  status: 'approved' as const
};

describe('getContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all content for a specific user', async () => {
    // Create test users
    const userResults = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const user1 = userResults[0];
    const user2 = userResults[1];

    // Create content for both users
    await db.insert(contentTable)
      .values([
        { ...testContent, user_id: user1.id },
        { ...testContent2, user_id: user1.id },
        { ...testContent, user_id: user2.id, title: 'User 2 Content' }
      ])
      .execute();

    // Get content for user 1
    const results = await getContent(user1.id);

    expect(results).toHaveLength(2);
    results.forEach(content => {
      expect(content.user_id).toEqual(user1.id);
      expect(content.id).toBeDefined();
      expect(content.created_at).toBeInstanceOf(Date);
      expect(content.updated_at).toBeInstanceOf(Date);
    });

    // Verify specific content details
    const titles = results.map(c => c.title);
    expect(titles).toContain('Test Content');
    expect(titles).toContain('Another Test Content');
  });

  it('should return empty array when user has no content', async () => {
    // Create a user with no content
    const userResults = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user = userResults[0];

    const results = await getContent(user.id);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    const results = await getContent(99999);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should include all content fields and statuses', async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user = userResults[0];

    // Create content with various statuses and fields
    await db.insert(contentTable)
      .values({
        ...testContent2,
        user_id: user.id,
        status: 'pending_approval',
        scheduled_at: new Date('2024-12-31T10:00:00Z'),
        approved_by: user.id,
        approved_at: new Date('2024-12-30T15:30:00Z'),
        rejected_reason: null
      })
      .execute();

    const results = await getContent(user.id);

    expect(results).toHaveLength(1);
    
    const content = results[0];
    expect(content.title).toEqual('Another Test Content');
    expect(content.caption).toEqual('Another test caption');
    expect(content.hashtags).toEqual('#another #test');
    expect(content.platform).toEqual('facebook');
    expect(content.content_type).toEqual('story');
    expect(content.status).toEqual('pending_approval');
    expect(content.ai_generated).toEqual(true);
    expect(content.scheduled_at).toBeInstanceOf(Date);
    expect(content.approved_at).toBeInstanceOf(Date);
    expect(content.approved_by).toEqual(user.id);
    expect(content.rejected_reason).toBeNull();
  });
});

describe('getContentById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return specific content by ID', async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user = userResults[0];

    // Create test content
    const contentResults = await db.insert(contentTable)
      .values({ ...testContent, user_id: user.id })
      .returning()
      .execute();

    const createdContent = contentResults[0];

    // Get content by ID
    const result = await getContentById(createdContent.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdContent.id);
    expect(result!.title).toEqual('Test Content');
    expect(result!.caption).toEqual('This is a test caption');
    expect(result!.hashtags).toEqual('#test #content');
    expect(result!.platform).toEqual('instagram');
    expect(result!.content_type).toEqual('post');
    expect(result!.status).toEqual('draft'); // default status
    expect(result!.ai_generated).toEqual(false);
    expect(result!.user_id).toEqual(user.id);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent content ID', async () => {
    const result = await getContentById(99999);

    expect(result).toBeNull();
  });

  it('should return content with all nullable fields populated', async () => {
    // Create test users for approver scenario
    const userResults = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    const user = userResults[0];
    const approver = userResults[1];

    // Create content with all fields populated
    const contentResults = await db.insert(contentTable)
      .values({
        ...testContent,
        user_id: user.id,
        status: 'rejected',
        scheduled_at: new Date('2024-12-25T12:00:00Z'),
        approved_by: approver.id,
        approved_at: new Date('2024-12-20T09:15:00Z'),
        rejected_reason: 'Content needs more hashtags'
      })
      .returning()
      .execute();

    const createdContent = contentResults[0];

    const result = await getContentById(createdContent.id);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('rejected');
    expect(result!.scheduled_at).toBeInstanceOf(Date);
    expect(result!.approved_by).toEqual(approver.id);
    expect(result!.approved_at).toBeInstanceOf(Date);
    expect(result!.rejected_reason).toEqual('Content needs more hashtags');
  });

  it('should return content with nullable fields as null', async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const user = userResults[0];

    // Create content with minimal fields (nullable ones should be null)
    const contentResults = await db.insert(contentTable)
      .values({
        user_id: user.id,
        title: 'Minimal Content',
        caption: 'Just basic content',
        platform: 'twitter',
        content_type: 'tweet'
        // hashtags, scheduled_at, approved_by, approved_at, rejected_reason should be null
      })
      .returning()
      .execute();

    const createdContent = contentResults[0];

    const result = await getContentById(createdContent.id);

    expect(result).not.toBeNull();
    expect(result!.hashtags).toBeNull();
    expect(result!.scheduled_at).toBeNull();
    expect(result!.approved_by).toBeNull();
    expect(result!.approved_at).toBeNull();
    expect(result!.rejected_reason).toBeNull();
    expect(result!.ai_generated).toEqual(false); // default value
    expect(result!.status).toEqual('draft'); // default value
  });
});