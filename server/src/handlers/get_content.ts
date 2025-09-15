import { db } from '../db';
import { contentTable } from '../db/schema';
import { type Content } from '../schema';
import { eq } from 'drizzle-orm';

export async function getContent(userId: number): Promise<Content[]> {
  try {
    // Fetch all content for the specified user
    const results = await db.select()
      .from(contentTable)
      .where(eq(contentTable.user_id, userId))
      .execute();

    // Return the results directly - no numeric conversions needed for this schema
    return results;
  } catch (error) {
    console.error('Get content failed:', error);
    throw error;
  }
}

export async function getContentById(contentId: number): Promise<Content | null> {
  try {
    // Fetch specific content by ID
    const results = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, contentId))
      .execute();

    // Return the first result or null if not found
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Get content by ID failed:', error);
    throw error;
  }
}