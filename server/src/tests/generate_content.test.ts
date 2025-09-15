import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, contentTable } from '../db/schema';
import { type GenerateContentInput } from '../schema';
import { generateContent } from '../handlers/generate_content';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

// Base test input - includes all required fields
const baseTestInput: GenerateContentInput = {
  user_id: 1, // Will be updated with actual user ID
  prompt: 'Create content about sustainable living tips',
  platform: 'instagram' as const,
  content_type: 'post' as const,
  include_hashtags: true,
  tone: 'inspirational' as const,
};

describe('generateContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  it('should generate and save AI content with all fields', async () => {
    const input = { ...baseTestInput, user_id: userId };
    const result = await generateContent(input);

    // Verify basic fields
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.title).toContain('Post for Instagram');
    expect(result.caption).toContain('sustainable living tips');
    expect(result.hashtags).toContain('#ai #generated');
    expect(result.platform).toEqual('instagram');
    expect(result.content_type).toEqual('post');
    expect(result.status).toEqual('draft');
    expect(result.ai_generated).toEqual(true);
    expect(result.scheduled_at).toBeNull();
    expect(result.approved_at).toBeNull();
    expect(result.approved_by).toBeNull();
    expect(result.rejected_reason).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save content to database correctly', async () => {
    const input = { ...baseTestInput, user_id: userId };
    const result = await generateContent(input);

    // Query database to verify content was saved
    const savedContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, result.id))
      .execute();

    expect(savedContent).toHaveLength(1);
    expect(savedContent[0].user_id).toEqual(userId);
    expect(savedContent[0].title).toContain('Post for Instagram');
    expect(savedContent[0].caption).toContain('sustainable living tips');
    expect(savedContent[0].ai_generated).toEqual(true);
    expect(savedContent[0].status).toEqual('draft');
  });

  it('should generate hashtags when include_hashtags is true', async () => {
    const input = { ...baseTestInput, user_id: userId, include_hashtags: true };
    const result = await generateContent(input);

    expect(result.hashtags).not.toBeNull();
    expect(result.hashtags).toContain('#ai');
    expect(result.hashtags).toContain('#generated');
    expect(result.hashtags).toContain('#instagram');
  });

  it('should not generate hashtags when include_hashtags is false', async () => {
    const input = { ...baseTestInput, user_id: userId, include_hashtags: false };
    const result = await generateContent(input);

    expect(result.hashtags).toBeNull();
  });

  it('should work with different platforms', async () => {
    const platforms = ['instagram', 'facebook', 'twitter', 'linkedin'] as const;

    for (const platform of platforms) {
      const input = { ...baseTestInput, user_id: userId, platform };
      const result = await generateContent(input);

      expect(result.platform).toEqual(platform);
      expect(result.title).toContain(platform.charAt(0).toUpperCase() + platform.slice(1));
      if (result.hashtags) {
        expect(result.hashtags).toContain(`#${platform}`);
      }
    }
  });

  it('should work with different content types', async () => {
    const contentTypes = ['post', 'story', 'reel', 'tweet'] as const;

    for (const contentType of contentTypes) {
      const input = { ...baseTestInput, user_id: userId, content_type: contentType };
      const result = await generateContent(input);

      expect(result.content_type).toEqual(contentType);
      expect(result.title).toContain(contentType.charAt(0).toUpperCase() + contentType.slice(1));
    }
  });

  it('should work with different tones', async () => {
    const tones = ['professional', 'casual', 'funny', 'inspirational', 'promotional'] as const;

    for (const tone of tones) {
      const input = { ...baseTestInput, user_id: userId, tone };
      const result = await generateContent(input);

      expect(result.caption).toBeDefined();
      expect(result.caption.length).toBeGreaterThan(0);
      
      // Verify tone-specific content characteristics
      switch (tone) {
        case 'professional':
          expect(result.caption).toContain('Professional');
          break;
        case 'casual':
          expect(result.caption).toContain('Hey there');
          break;
        case 'funny':
          expect(result.caption).toContain('😄');
          break;
        case 'inspirational':
          expect(result.caption).toContain('inspire');
          break;
        case 'promotional':
          expect(result.caption).toContain('Don\'t miss out');
          break;
      }
    }
  });

  it('should work without tone specified', async () => {
    const input = { ...baseTestInput, user_id: userId };
    delete (input as any).tone; // Remove tone property
    
    const result = await generateContent(input);

    expect(result.caption).toBeDefined();
    expect(result.caption.length).toBeGreaterThan(0);
    expect(result.caption).toContain('sustainable living tips');
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...baseTestInput, user_id: 99999 }; // Non-existent user ID

    await expect(generateContent(input)).rejects.toThrow(/User with id 99999 not found/);
  });

  it('should handle different prompts correctly', async () => {
    const prompts = [
      'Health and wellness tips for busy professionals',
      'Top 5 productivity hacks',
      'Eco-friendly lifestyle changes'
    ];

    for (const prompt of prompts) {
      const input = { ...baseTestInput, user_id: userId, prompt };
      const result = await generateContent(input);

      expect(result.caption).toContain(prompt);
      expect(result.ai_generated).toEqual(true);
    }
  });

  it('should generate different content for same prompt on multiple calls', async () => {
    const input = { ...baseTestInput, user_id: userId };
    
    const result1 = await generateContent(input);
    const result2 = await generateContent(input);

    // Should create different records
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.created_at).not.toEqual(result2.created_at);
    
    // But should have same basic properties
    expect(result1.user_id).toEqual(result2.user_id);
    expect(result1.platform).toEqual(result2.platform);
    expect(result1.content_type).toEqual(result2.content_type);
    expect(result1.ai_generated).toEqual(result2.ai_generated);
  });

  it('should handle Twitter character limit constraints', async () => {
    const longPrompt = 'This is a very long prompt that might generate content exceeding Twitter\'s character limits. We need to test that the generated content respects platform-specific constraints and truncates appropriately when necessary.';
    
    const input = { 
      ...baseTestInput, 
      user_id: userId, 
      platform: 'twitter' as const,
      prompt: longPrompt
    };
    
    const result = await generateContent(input);

    // Twitter has 280 character limit
    expect(result.caption.length).toBeLessThanOrEqual(280);
    expect(result.platform).toEqual('twitter');
  });

  it('should create content with correct default status and timestamps', async () => {
    const input = { ...baseTestInput, user_id: userId };
    const result = await generateContent(input);

    expect(result.status).toEqual('draft');
    expect(result.ai_generated).toEqual(true);
    expect(result.scheduled_at).toBeNull();
    expect(result.approved_at).toBeNull();
    expect(result.approved_by).toBeNull();
    expect(result.rejected_reason).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});