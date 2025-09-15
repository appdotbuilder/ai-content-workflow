import { serial, text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const socialMediaPlatformEnum = pgEnum('social_media_platform', ['instagram', 'facebook', 'twitter', 'linkedin']);
export const contentStatusEnum = pgEnum('content_status', ['draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published']);
export const contentTypeEnum = pgEnum('content_type', ['post', 'story', 'reel', 'tweet']);
export const workflowStepTypeEnum = pgEnum('workflow_step_type', ['generation', 'review', 'approval', 'scheduling']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Content table
export const contentTable = pgTable('content', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  title: text('title').notNull(),
  caption: text('caption').notNull(),
  hashtags: text('hashtags'), // Nullable by default
  platform: socialMediaPlatformEnum('platform').notNull(),
  content_type: contentTypeEnum('content_type').notNull(),
  status: contentStatusEnum('status').default('draft').notNull(),
  ai_generated: boolean('ai_generated').default(false).notNull(),
  scheduled_at: timestamp('scheduled_at'), // Nullable
  approved_at: timestamp('approved_at'), // Nullable
  approved_by: integer('approved_by').references(() => usersTable.id), // Nullable
  rejected_reason: text('rejected_reason'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Workflow templates table
export const workflowTemplatesTable = pgTable('workflow_templates', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Workflow steps table
export const workflowStepsTable = pgTable('workflow_steps', {
  id: serial('id').primaryKey(),
  workflow_template_id: integer('workflow_template_id').references(() => workflowTemplatesTable.id).notNull(),
  step_order: integer('step_order').notNull(),
  step_type: workflowStepTypeEnum('step_type').notNull(),
  required: boolean('required').default(true).notNull(),
  assignee_id: integer('assignee_id').references(() => usersTable.id), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Content workflow instances table (tracks workflow progress for specific content)
export const contentWorkflowInstancesTable = pgTable('content_workflow_instances', {
  id: serial('id').primaryKey(),
  content_id: integer('content_id').references(() => contentTable.id).notNull(),
  workflow_template_id: integer('workflow_template_id').references(() => workflowTemplatesTable.id).notNull(),
  current_step_id: integer('current_step_id').references(() => workflowStepsTable.id), // Nullable
  status: text('status').default('in_progress').notNull(), // in_progress, completed, cancelled
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'), // Nullable
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  content: many(contentTable),
  approvedContent: many(contentTable, { relationName: 'approver' }),
  workflowTemplates: many(workflowTemplatesTable),
  assignedSteps: many(workflowStepsTable),
}));

export const contentRelations = relations(contentTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [contentTable.user_id],
    references: [usersTable.id],
  }),
  approver: one(usersTable, {
    fields: [contentTable.approved_by],
    references: [usersTable.id],
    relationName: 'approver',
  }),
  workflowInstances: many(contentWorkflowInstancesTable),
}));

export const workflowTemplatesRelations = relations(workflowTemplatesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [workflowTemplatesTable.user_id],
    references: [usersTable.id],
  }),
  steps: many(workflowStepsTable),
  instances: many(contentWorkflowInstancesTable),
}));

export const workflowStepsRelations = relations(workflowStepsTable, ({ one, many }) => ({
  workflowTemplate: one(workflowTemplatesTable, {
    fields: [workflowStepsTable.workflow_template_id],
    references: [workflowTemplatesTable.id],
  }),
  assignee: one(usersTable, {
    fields: [workflowStepsTable.assignee_id],
    references: [usersTable.id],
  }),
  currentInstances: many(contentWorkflowInstancesTable),
}));

export const contentWorkflowInstancesRelations = relations(contentWorkflowInstancesTable, ({ one }) => ({
  content: one(contentTable, {
    fields: [contentWorkflowInstancesTable.content_id],
    references: [contentTable.id],
  }),
  workflowTemplate: one(workflowTemplatesTable, {
    fields: [contentWorkflowInstancesTable.workflow_template_id],
    references: [workflowTemplatesTable.id],
  }),
  currentStep: one(workflowStepsTable, {
    fields: [contentWorkflowInstancesTable.current_step_id],
    references: [workflowStepsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Content = typeof contentTable.$inferSelect;
export type NewContent = typeof contentTable.$inferInsert;

export type WorkflowTemplate = typeof workflowTemplatesTable.$inferSelect;
export type NewWorkflowTemplate = typeof workflowTemplatesTable.$inferInsert;

export type WorkflowStep = typeof workflowStepsTable.$inferSelect;
export type NewWorkflowStep = typeof workflowStepsTable.$inferInsert;

export type ContentWorkflowInstance = typeof contentWorkflowInstancesTable.$inferSelect;
export type NewContentWorkflowInstance = typeof contentWorkflowInstancesTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  content: contentTable,
  workflowTemplates: workflowTemplatesTable,
  workflowSteps: workflowStepsTable,
  contentWorkflowInstances: contentWorkflowInstancesTable,
};