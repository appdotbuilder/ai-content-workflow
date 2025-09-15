import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { type Content } from '../schema';
import { eq } from 'drizzle-orm';

export async function scheduleContent(contentId: number, scheduledAt: Date): Promise<Content> {
  try {
    // Validate that scheduled time is in the future
    const now = new Date();
    if (scheduledAt <= now) {
      throw new Error('Cannot schedule content for a past date or current time');
    }

    // First, fetch the current content to verify it exists and is approved
    const existingContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, contentId))
      .execute();

    if (existingContent.length === 0) {
      throw new Error(`Content with id ${contentId} not found`);
    }

    const content = existingContent[0];

    // Verify content is approved
    if (content.status !== 'approved') {
      throw new Error('Only approved content can be scheduled');
    }

    // Update the content with scheduled information
    const result = await db.update(contentTable)
      .set({
        scheduled_at: scheduledAt,
        status: 'scheduled',
        updated_at: new Date()
      })
      .where(eq(contentTable.id, contentId))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Content scheduling failed:', error);
    throw error;
  }
}

export async function unscheduleContent(contentId: number): Promise<Content> {
  try {
    // First, fetch the current content to verify it exists and is scheduled
    const existingContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, contentId))
      .execute();

    if (existingContent.length === 0) {
      throw new Error(`Content with id ${contentId} not found`);
    }

    const content = existingContent[0];

    // Verify content is currently scheduled
    if (content.status !== 'scheduled') {
      throw new Error('Only scheduled content can be unscheduled');
    }

    // Update the content to remove scheduling
    const result = await db.update(contentTable)
      .set({
        scheduled_at: null,
        status: 'approved',
        updated_at: new Date()
      })
      .where(eq(contentTable.id, contentId))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Content unscheduling failed:', error);
    throw error;
  }
}