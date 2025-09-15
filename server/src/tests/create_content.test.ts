import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { type CreateContentInput } from '../schema';
import { createContent } from '../handlers/create_content';
import { eq } from 'drizzle-orm';

// Test user for content creation
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

// Basic test input for content creation
const testInput: CreateContentInput = {
  user_id: 1, // Will be set after user creation
  title: 'Test Content',
  caption: 'This is a test content caption with some descriptive text',
  hashtags: '#test #content #social',
  platform: 'instagram',
  content_type: 'post',
  ai_generated: false,
  scheduled_at: new Date('2024-12-31T10:00:00Z')
};

describe('createContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create content with all fields', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = userResult[0];
    const contentInput = { ...testInput, user_id: createdUser.id };

    const result = await createContent(contentInput);

    // Verify all fields are correctly set
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(createdUser.id);
    expect(result.title).toEqual('Test Content');
    expect(result.caption).toEqual('This is a test content caption with some descriptive text');
    expect(result.hashtags).toEqual('#test #content #social');
    expect(result.platform).toEqual('instagram');
    expect(result.content_type).toEqual('post');
    expect(result.status).toEqual('draft'); // Default status
    expect(result.ai_generated).toEqual(false);
    expect(result.scheduled_at).toEqual(new Date('2024-12-31T10:00:00Z'));
    expect(result.approved_at).toBeNull();
    expect(result.approved_by).toBeNull();
    expect(result.rejected_reason).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create content with minimal required fields', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = userResult[0];

    // Minimal input without optional fields
    const minimalInput: CreateContentInput = {
      user_id: createdUser.id,
      title: 'Minimal Content',
      caption: 'Basic caption',
      platform: 'twitter',
      content_type: 'tweet',
      ai_generated: true // Test with ai_generated true
    };

    const result = await createContent(minimalInput);

    expect(result.user_id).toEqual(createdUser.id);
    expect(result.title).toEqual('Minimal Content');
    expect(result.caption).toEqual('Basic caption');
    expect(result.hashtags).toBeNull(); // Should be null when not provided
    expect(result.platform).toEqual('twitter');
    expect(result.content_type).toEqual('tweet');
    expect(result.status).toEqual('draft');
    expect(result.ai_generated).toEqual(true);
    expect(result.scheduled_at).toBeNull(); // Should be null when not provided
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save content to database correctly', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = userResult[0];
    const contentInput = { ...testInput, user_id: createdUser.id };

    const result = await createContent(contentInput);

    // Query database to verify content was saved
    const savedContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, result.id))
      .execute();

    expect(savedContent).toHaveLength(1);
    const content = savedContent[0];
    
    expect(content.user_id).toEqual(createdUser.id);
    expect(content.title).toEqual('Test Content');
    expect(content.caption).toEqual('This is a test content caption with some descriptive text');
    expect(content.hashtags).toEqual('#test #content #social');
    expect(content.platform).toEqual('instagram');
    expect(content.content_type).toEqual('post');
    expect(content.status).toEqual('draft');
    expect(content.ai_generated).toEqual(false);
    expect(content.scheduled_at).toEqual(new Date('2024-12-31T10:00:00Z'));
    expect(content.created_at).toBeInstanceOf(Date);
  });

  it('should handle different platform and content type combinations', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = userResult[0];

    // Test LinkedIn post
    const linkedinInput: CreateContentInput = {
      user_id: createdUser.id,
      title: 'Professional Update',
      caption: 'Excited to share our latest achievement!',
      platform: 'linkedin',
      content_type: 'post',
      ai_generated: false
    };

    const linkedinResult = await createContent(linkedinInput);
    expect(linkedinResult.platform).toEqual('linkedin');
    expect(linkedinResult.content_type).toEqual('post');

    // Test Instagram story
    const instagramStoryInput: CreateContentInput = {
      user_id: createdUser.id,
      title: 'Behind the scenes',
      caption: 'Quick story update',
      platform: 'instagram',
      content_type: 'story',
      ai_generated: true
    };

    const storyResult = await createContent(instagramStoryInput);
    expect(storyResult.platform).toEqual('instagram');
    expect(storyResult.content_type).toEqual('story');
    expect(storyResult.ai_generated).toEqual(true);
  });

  it('should throw error when user does not exist', async () => {
    const invalidInput = { ...testInput, user_id: 999 }; // Non-existent user ID
    
    await expect(createContent(invalidInput)).rejects.toThrow(/User with id 999 does not exist/i);
  });

  it('should handle future scheduled dates', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = userResult[0];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7); // One week from now

    const scheduledInput: CreateContentInput = {
      user_id: createdUser.id,
      title: 'Scheduled Content',
      caption: 'This content is scheduled for the future',
      platform: 'facebook',
      content_type: 'post',
      ai_generated: false,
      scheduled_at: futureDate
    };

    const result = await createContent(scheduledInput);
    
    expect(result.scheduled_at).toEqual(futureDate);
    expect(result.status).toEqual('draft'); // Should still be draft until published
  });

  it('should handle null hashtags correctly', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = userResult[0];

    const noHashtagsInput: CreateContentInput = {
      user_id: createdUser.id,
      title: 'No Hashtags Content',
      caption: 'Content without any hashtags',
      hashtags: null, // Explicitly set to null
      platform: 'twitter',
      content_type: 'tweet',
      ai_generated: false
    };

    const result = await createContent(noHashtagsInput);
    
    expect(result.hashtags).toBeNull();
    
    // Verify in database
    const savedContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, result.id))
      .execute();
    
    expect(savedContent[0].hashtags).toBeNull();
  });
});