import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { type CreateContentInput, type Content } from '../schema';
import { eq } from 'drizzle-orm';

export const createContent = async (input: CreateContentInput): Promise<Content> => {
  try {
    // Verify that the user exists to prevent foreign key constraint violations
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Insert content record
    const result = await db.insert(contentTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        caption: input.caption,
        hashtags: input.hashtags ?? null,
        platform: input.platform,
        content_type: input.content_type,
        status: 'draft', // Default status for new content
        ai_generated: input.ai_generated,
        scheduled_at: input.scheduled_at ?? null,
        approved_at: null,
        approved_by: null,
        rejected_reason: null,
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Content creation failed:', error);
    throw error;
  }
};