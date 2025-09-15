import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

// Create user input schema
export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Social media platform enum
export const socialMediaPlatformSchema = z.enum(['instagram', 'facebook', 'twitter', 'linkedin']);

export type SocialMediaPlatform = z.infer<typeof socialMediaPlatformSchema>;

// Content status enum
export const contentStatusSchema = z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published']);

export type ContentStatus = z.infer<typeof contentStatusSchema>;

// Content type enum
export const contentTypeSchema = z.enum(['post', 'story', 'reel', 'tweet']);

export type ContentType = z.infer<typeof contentTypeSchema>;

// Content schema
export const contentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  caption: z.string(),
  hashtags: z.string().nullable(),
  platform: socialMediaPlatformSchema,
  content_type: contentTypeSchema,
  status: contentStatusSchema,
  ai_generated: z.boolean(),
  scheduled_at: z.coerce.date().nullable(),
  approved_at: z.coerce.date().nullable(),
  approved_by: z.number().nullable(),
  rejected_reason: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Content = z.infer<typeof contentSchema>;

// Create content input schema
export const createContentInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1),
  caption: z.string().min(1),
  hashtags: z.string().nullable().optional(),
  platform: socialMediaPlatformSchema,
  content_type: contentTypeSchema,
  ai_generated: z.boolean().default(false),
  scheduled_at: z.coerce.date().nullable().optional(),
});

export type CreateContentInput = z.infer<typeof createContentInputSchema>;

// Update content input schema
export const updateContentInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  caption: z.string().optional(),
  hashtags: z.string().nullable().optional(),
  platform: socialMediaPlatformSchema.optional(),
  content_type: contentTypeSchema.optional(),
  status: contentStatusSchema.optional(),
  scheduled_at: z.coerce.date().nullable().optional(),
  rejected_reason: z.string().nullable().optional(),
});

export type UpdateContentInput = z.infer<typeof updateContentInputSchema>;

// AI content generation input schema
export const generateContentInputSchema = z.object({
  user_id: z.number(),
  prompt: z.string().min(1),
  platform: socialMediaPlatformSchema,
  content_type: contentTypeSchema,
  include_hashtags: z.boolean().default(true),
  tone: z.enum(['professional', 'casual', 'funny', 'inspirational', 'promotional']).optional(),
});

export type GenerateContentInput = z.infer<typeof generateContentInputSchema>;

// Content approval input schema
export const approveContentInputSchema = z.object({
  content_id: z.number(),
  approved_by: z.number(),
  approved: z.boolean(),
  rejection_reason: z.string().optional(),
});

export type ApproveContentInput = z.infer<typeof approveContentInputSchema>;

// Content calendar query schema
export const contentCalendarQuerySchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  platform: socialMediaPlatformSchema.optional(),
  status: contentStatusSchema.optional(),
});

export type ContentCalendarQuery = z.infer<typeof contentCalendarQuerySchema>;

// Workflow template schema
export const workflowTemplateSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  steps: z.array(z.object({
    step_order: z.number(),
    step_type: z.enum(['generation', 'review', 'approval', 'scheduling']),
    required: z.boolean(),
    assignee_id: z.number().nullable(),
  })),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type WorkflowTemplate = z.infer<typeof workflowTemplateSchema>;

// Create workflow template input schema
export const createWorkflowTemplateInputSchema = z.object({
  user_id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  steps: z.array(z.object({
    step_order: z.number().int().min(1),
    step_type: z.enum(['generation', 'review', 'approval', 'scheduling']),
    required: z.boolean(),
    assignee_id: z.number().nullable().optional(),
  })),
});

export type CreateWorkflowTemplateInput = z.infer<typeof createWorkflowTemplateInputSchema>;

// Content analytics schema
export const contentAnalyticsSchema = z.object({
  total_content: z.number(),
  ai_generated_content: z.number(),
  approved_content: z.number(),
  rejected_content: z.number(),
  scheduled_content: z.number(),
  published_content: z.number(),
  by_platform: z.record(socialMediaPlatformSchema, z.number()),
  by_status: z.record(contentStatusSchema, z.number()),
});

export type ContentAnalytics = z.infer<typeof contentAnalyticsSchema>;

// Content analytics query schema
export const contentAnalyticsQuerySchema = z.object({
  user_id: z.number(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  platform: socialMediaPlatformSchema.optional(),
});

export type ContentAnalyticsQuery = z.infer<typeof contentAnalyticsQuerySchema>;