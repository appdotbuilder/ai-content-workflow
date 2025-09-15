import { db } from '../db';
import { contentTable } from '../db/schema';
import { type ContentCalendarQuery, type Content } from '../schema';
import { eq, gte, lte, and, isNotNull, type SQL } from 'drizzle-orm';

export async function getContentCalendar(query: ContentCalendarQuery): Promise<Content[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Always filter by user_id
    conditions.push(eq(contentTable.user_id, query.user_id));

    // Filter by date range - only include content with scheduled_at dates
    conditions.push(isNotNull(contentTable.scheduled_at));
    conditions.push(gte(contentTable.scheduled_at, query.start_date));
    conditions.push(lte(contentTable.scheduled_at, query.end_date));

    // Optional platform filter
    if (query.platform) {
      conditions.push(eq(contentTable.platform, query.platform));
    }

    // Optional status filter
    if (query.status) {
      conditions.push(eq(contentTable.status, query.status));
    }

    // Build and execute query
    const results = await db.select()
      .from(contentTable)
      .where(and(...conditions))
      .execute();

    // Return results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Content calendar fetch failed:', error);
    throw error;
  }
}