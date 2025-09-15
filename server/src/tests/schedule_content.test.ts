import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { contentTable, usersTable } from '../db/schema';
import { scheduleContent, unscheduleContent } from '../handlers/schedule_content';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  name: 'Test User'
};

const testContent = {
  user_id: 1,
  title: 'Test Content',
  caption: 'Test caption for scheduling',
  hashtags: '#test #content',
  platform: 'instagram' as const,
  content_type: 'post' as const,
  status: 'approved' as const,
  ai_generated: false,
  approved_at: new Date(),
  approved_by: 1
};

describe('scheduleContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let contentId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create approved content
    const contentResult = await db.insert(contentTable)
      .values({
        ...testContent,
        user_id: userId,
        approved_by: userId
      })
      .returning()
      .execute();
    contentId = contentResult[0].id;
  });

  it('should schedule approved content successfully', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

    const result = await scheduleContent(contentId, futureDate);

    expect(result.id).toEqual(contentId);
    expect(result.status).toEqual('scheduled');
    expect(result.scheduled_at).toEqual(futureDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save scheduled content to database', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2); // Day after tomorrow

    await scheduleContent(contentId, futureDate);

    const savedContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, contentId))
      .execute();

    expect(savedContent).toHaveLength(1);
    expect(savedContent[0].status).toEqual('scheduled');
    expect(savedContent[0].scheduled_at).toEqual(futureDate);
  });

  it('should reject scheduling for past dates', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    await expect(scheduleContent(contentId, pastDate))
      .rejects.toThrow(/cannot schedule content for a past date/i);
  });

  it('should reject scheduling for current time', async () => {
    const now = new Date();

    await expect(scheduleContent(contentId, now))
      .rejects.toThrow(/cannot schedule content for a past date/i);
  });

  it('should reject scheduling non-approved content', async () => {
    // Create draft content
    const draftContent = await db.insert(contentTable)
      .values({
        ...testContent,
        user_id: userId,
        status: 'draft',
        approved_at: null,
        approved_by: null
      })
      .returning()
      .execute();

    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    await expect(scheduleContent(draftContent[0].id, futureDate))
      .rejects.toThrow(/only approved content can be scheduled/i);
  });

  it('should reject scheduling pending content', async () => {
    // Create pending approval content
    const pendingContent = await db.insert(contentTable)
      .values({
        ...testContent,
        user_id: userId,
        status: 'pending_approval',
        approved_at: null,
        approved_by: null
      })
      .returning()
      .execute();

    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    await expect(scheduleContent(pendingContent[0].id, futureDate))
      .rejects.toThrow(/only approved content can be scheduled/i);
  });

  it('should reject scheduling non-existent content', async () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    await expect(scheduleContent(999999, futureDate))
      .rejects.toThrow(/content with id 999999 not found/i);
  });
});

describe('unscheduleContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let scheduledContentId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create scheduled content
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const contentResult = await db.insert(contentTable)
      .values({
        ...testContent,
        user_id: userId,
        approved_by: userId,
        status: 'scheduled',
        scheduled_at: futureDate
      })
      .returning()
      .execute();
    scheduledContentId = contentResult[0].id;
  });

  it('should unschedule scheduled content successfully', async () => {
    const result = await unscheduleContent(scheduledContentId);

    expect(result.id).toEqual(scheduledContentId);
    expect(result.status).toEqual('approved');
    expect(result.scheduled_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save unscheduled content to database', async () => {
    await unscheduleContent(scheduledContentId);

    const savedContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, scheduledContentId))
      .execute();

    expect(savedContent).toHaveLength(1);
    expect(savedContent[0].status).toEqual('approved');
    expect(savedContent[0].scheduled_at).toBeNull();
  });

  it('should reject unscheduling non-scheduled content', async () => {
    // Create approved (but not scheduled) content
    const approvedContent = await db.insert(contentTable)
      .values({
        ...testContent,
        user_id: userId,
        approved_by: userId,
        status: 'approved'
      })
      .returning()
      .execute();

    await expect(unscheduleContent(approvedContent[0].id))
      .rejects.toThrow(/only scheduled content can be unscheduled/i);
  });

  it('should reject unscheduling draft content', async () => {
    // Create draft content
    const draftContent = await db.insert(contentTable)
      .values({
        ...testContent,
        user_id: userId,
        status: 'draft',
        approved_at: null,
        approved_by: null
      })
      .returning()
      .execute();

    await expect(unscheduleContent(draftContent[0].id))
      .rejects.toThrow(/only scheduled content can be unscheduled/i);
  });

  it('should reject unscheduling non-existent content', async () => {
    await expect(unscheduleContent(999999))
      .rejects.toThrow(/content with id 999999 not found/i);
  });

  it('should handle scheduling and unscheduling workflow', async () => {
    // First unschedule the content
    const unscheduledResult = await unscheduleContent(scheduledContentId);
    expect(unscheduledResult.status).toEqual('approved');
    expect(unscheduledResult.scheduled_at).toBeNull();

    // Then reschedule it
    const newFutureDate = new Date();
    newFutureDate.setDate(newFutureDate.getDate() + 3);

    const rescheduledResult = await scheduleContent(scheduledContentId, newFutureDate);
    expect(rescheduledResult.status).toEqual('scheduled');
    expect(rescheduledResult.scheduled_at).toEqual(newFutureDate);
  });
});