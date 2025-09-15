import { db } from '../db';
import { contentTable } from '../db/schema';
import { type UpdateContentInput, type Content } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateContent(input: UpdateContentInput): Promise<Content> {
  try {
    // Build the update object with only provided fields
    const updateData: Partial<typeof contentTable.$inferInsert> = {
      updated_at: new Date(), // Always update the timestamp
    };

    // Only include fields that are explicitly provided in the input
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    
    if (input.caption !== undefined) {
      updateData.caption = input.caption;
    }
    
    if (input.hashtags !== undefined) {
      updateData.hashtags = input.hashtags;
    }
    
    if (input.platform !== undefined) {
      updateData.platform = input.platform;
    }
    
    if (input.content_type !== undefined) {
      updateData.content_type = input.content_type;
    }
    
    if (input.status !== undefined) {
      updateData.status = input.status;
    }
    
    if (input.scheduled_at !== undefined) {
      updateData.scheduled_at = input.scheduled_at;
    }
    
    if (input.rejected_reason !== undefined) {
      updateData.rejected_reason = input.rejected_reason;
    }

    // Update the content record
    const result = await db.update(contentTable)
      .set(updateData)
      .where(eq(contentTable.id, input.id))
      .returning()
      .execute();

    // Check if the content was found and updated
    if (result.length === 0) {
      throw new Error(`Content with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Content update failed:', error);
    throw error;
  }
}