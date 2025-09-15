import { db } from '../db';
import { contentTable } from '../db/schema';
import { type ApproveContentInput, type Content } from '../schema';
import { eq } from 'drizzle-orm';

export const approveContent = async (input: ApproveContentInput): Promise<Content> => {
  try {
    // First, verify the content exists
    const existingContent = await db.select()
      .from(contentTable)
      .where(eq(contentTable.id, input.content_id))
      .execute();

    if (existingContent.length === 0) {
      throw new Error(`Content with id ${input.content_id} not found`);
    }

    // Prepare update data based on approval status
    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.approved) {
      updateData.status = 'approved';
      updateData.approved_by = input.approved_by;
      updateData.approved_at = new Date();
      updateData.rejected_reason = null; // Clear any previous rejection reason
    } else {
      updateData.status = 'rejected';
      updateData.rejected_reason = input.rejection_reason || 'No reason provided';
      updateData.approved_by = null;
      updateData.approved_at = null;
    }

    // Update the content
    const result = await db.update(contentTable)
      .set(updateData)
      .where(eq(contentTable.id, input.content_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Content approval failed:', error);
    throw error;
  }
};