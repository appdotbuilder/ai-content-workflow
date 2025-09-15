import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { type GenerateContentInput, type Content } from '../schema';
import { eq } from 'drizzle-orm';

// Mock AI content generation - in a real app, this would call OpenAI or another AI service
function generateAIContent(input: GenerateContentInput): {
  title: string;
  caption: string;
  hashtags: string | null;
} {
  // Platform-specific content generation logic
  const platformSpecificContent = {
    instagram: {
      maxCaptionLength: 2200,
      hashtagStyle: '#',
      contentStyle: 'visual-focused'
    },
    facebook: {
      maxCaptionLength: 63206,
      hashtagStyle: '#',
      contentStyle: 'engagement-focused'
    },
    twitter: {
      maxCaptionLength: 280,
      hashtagStyle: '#',
      contentStyle: 'concise'
    },
    linkedin: {
      maxCaptionLength: 3000,
      hashtagStyle: '#',
      contentStyle: 'professional'
    }
  };

  const platformConfig = platformSpecificContent[input.platform];
  
  // Generate title based on content type and platform
  const title = `${input.content_type.charAt(0).toUpperCase() + input.content_type.slice(1)} for ${input.platform.charAt(0).toUpperCase() + input.platform.slice(1)}`;
  
  // Generate caption based on prompt and tone
  let caption = `Generated content for: ${input.prompt}`;
  
  if (input.tone) {
    switch (input.tone) {
      case 'professional':
        caption = `Professional content addressing: ${input.prompt}. This content maintains a business-appropriate tone while engaging the audience.`;
        break;
      case 'casual':
        caption = `Hey there! Let's talk about ${input.prompt}. This is a casual take on the topic that feels approachable and friendly.`;
        break;
      case 'funny':
        caption = `You know what's interesting about ${input.prompt}? Here's a fun perspective that'll make you smile! 😄`;
        break;
      case 'inspirational':
        caption = `${input.prompt} - let this inspire your journey today. Every step forward matters, and this content aims to motivate and uplift.`;
        break;
      case 'promotional':
        caption = `Don't miss out on ${input.prompt}! This amazing opportunity is perfect for you. Take action today!`;
        break;
      default:
        caption = `Engaging content about ${input.prompt}. Crafted to resonate with your audience and drive meaningful interaction.`;
    }
  }

  // Truncate caption if needed based on platform limits
  if (caption.length > platformConfig.maxCaptionLength) {
    caption = caption.substring(0, platformConfig.maxCaptionLength - 3) + '...';
  }

  // Generate hashtags if requested
  let hashtags: string | null = null;
  if (input.include_hashtags) {
    const baseHashtags = ['#content', '#social', `#${input.platform}`];
    
    // Add content-type specific hashtags
    switch (input.content_type) {
      case 'post':
        baseHashtags.push('#post', '#engagement');
        break;
      case 'story':
        baseHashtags.push('#story', '#behind-the-scenes');
        break;
      case 'reel':
        baseHashtags.push('#reel', '#video', '#trending');
        break;
      case 'tweet':
        baseHashtags.push('#tweet', '#discussion');
        break;
    }

    // Add tone-specific hashtags
    if (input.tone) {
      switch (input.tone) {
        case 'professional':
          baseHashtags.push('#business', '#professional');
          break;
        case 'inspirational':
          baseHashtags.push('#motivation', '#inspiration');
          break;
        case 'funny':
          baseHashtags.push('#humor', '#fun');
          break;
        case 'promotional':
          baseHashtags.push('#offer', '#promotion');
          break;
      }
    }

    baseHashtags.push('#ai', '#generated');
    hashtags = baseHashtags.join(' ');
  }

  return {
    title,
    caption,
    hashtags
  };
}

export async function generateContent(input: GenerateContentInput): Promise<Content> {
  try {
    // Verify user exists first to prevent foreign key constraint violations
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Generate AI content based on input
    const generatedContent = generateAIContent(input);

    // Insert content into database
    const result = await db.insert(contentTable)
      .values({
        user_id: input.user_id,
        title: generatedContent.title,
        caption: generatedContent.caption,
        hashtags: generatedContent.hashtags,
        platform: input.platform,
        content_type: input.content_type,
        status: 'draft',
        ai_generated: true,
        scheduled_at: null,
        approved_at: null,
        approved_by: null,
        rejected_reason: null,
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Content generation failed:', error);
    throw error;
  }
}