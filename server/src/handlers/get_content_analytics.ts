import { db } from '../db';
import { contentTable } from '../db/schema';
import { type ContentAnalyticsQuery, type ContentAnalytics } from '../schema';
import { eq, and, gte, lte, count, SQL } from 'drizzle-orm';

export async function getContentAnalytics(query: ContentAnalyticsQuery): Promise<ContentAnalytics> {
  try {
    // Build base query with user filter
    let baseQuery = db.select().from(contentTable);
    
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [eq(contentTable.user_id, query.user_id)];
    
    // Add date range filters if provided
    if (query.start_date) {
      conditions.push(gte(contentTable.created_at, query.start_date));
    }
    
    if (query.end_date) {
      conditions.push(lte(contentTable.created_at, query.end_date));
    }
    
    // Add platform filter if provided
    if (query.platform) {
      conditions.push(eq(contentTable.platform, query.platform));
    }
    
    // Apply all conditions
    const filteredQuery = baseQuery.where(and(...conditions));
    
    // Execute query to get all filtered content
    const content = await filteredQuery.execute();
    
    // Calculate analytics from the fetched data
    const totalContent = content.length;
    const aiGeneratedContent = content.filter(c => c.ai_generated).length;
    const approvedContent = content.filter(c => c.status === 'approved').length;
    const rejectedContent = content.filter(c => c.status === 'rejected').length;
    const scheduledContent = content.filter(c => c.status === 'scheduled').length;
    const publishedContent = content.filter(c => c.status === 'published').length;
    
    // Group by platform
    const byPlatform = content.reduce((acc, item) => {
      acc[item.platform] = (acc[item.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by status
    const byStatus = content.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Ensure all platforms and statuses are represented with 0 if not present
    const platformDefaults = {
      instagram: 0,
      facebook: 0,
      twitter: 0,
      linkedin: 0,
    };
    
    const statusDefaults = {
      draft: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0,
      scheduled: 0,
      published: 0,
    };
    
    return {
      total_content: totalContent,
      ai_generated_content: aiGeneratedContent,
      approved_content: approvedContent,
      rejected_content: rejectedContent,
      scheduled_content: scheduledContent,
      published_content: publishedContent,
      by_platform: { ...platformDefaults, ...byPlatform },
      by_status: { ...statusDefaults, ...byStatus },
    };
  } catch (error) {
    console.error('Content analytics retrieval failed:', error);
    throw error;
  }
}