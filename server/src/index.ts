import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Schema imports
import {
  createUserInputSchema,
  createContentInputSchema,
  updateContentInputSchema,
  generateContentInputSchema,
  approveContentInputSchema,
  contentCalendarQuerySchema,
  createWorkflowTemplateInputSchema,
  contentAnalyticsQuerySchema,
} from './schema';

// Handler imports
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { generateContent } from './handlers/generate_content';
import { createContent } from './handlers/create_content';
import { getContent, getContentById } from './handlers/get_content';
import { updateContent } from './handlers/update_content';
import { approveContent } from './handlers/approve_content';
import { getContentCalendar } from './handlers/get_content_calendar';
import { createWorkflowTemplate } from './handlers/create_workflow_template';
import { getWorkflowTemplates, getWorkflowTemplateById } from './handlers/get_workflow_templates';
import { getPendingApprovals } from './handlers/get_pending_approvals';
import { getContentAnalytics } from './handlers/get_content_analytics';
import { scheduleContent, unscheduleContent } from './handlers/schedule_content';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUsers: publicProcedure
    .query(() => getUsers()),

  // Content generation and management
  generateContent: publicProcedure
    .input(generateContentInputSchema)
    .mutation(({ input }) => generateContent(input)),

  createContent: publicProcedure
    .input(createContentInputSchema)
    .mutation(({ input }) => createContent(input)),

  getContent: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getContent(input.userId)),

  getContentById: publicProcedure
    .input(z.object({ contentId: z.number() }))
    .query(({ input }) => getContentById(input.contentId)),

  updateContent: publicProcedure
    .input(updateContentInputSchema)
    .mutation(({ input }) => updateContent(input)),

  // Approval workflow
  approveContent: publicProcedure
    .input(approveContentInputSchema)
    .mutation(({ input }) => approveContent(input)),

  getPendingApprovals: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getPendingApprovals(input.userId)),

  // Content calendar
  getContentCalendar: publicProcedure
    .input(contentCalendarQuerySchema)
    .query(({ input }) => getContentCalendar(input)),

  // Content scheduling
  scheduleContent: publicProcedure
    .input(z.object({ 
      contentId: z.number(), 
      scheduledAt: z.coerce.date() 
    }))
    .mutation(({ input }) => scheduleContent(input.contentId, input.scheduledAt)),

  unscheduleContent: publicProcedure
    .input(z.object({ contentId: z.number() }))
    .mutation(({ input }) => unscheduleContent(input.contentId)),

  // Workflow templates
  createWorkflowTemplate: publicProcedure
    .input(createWorkflowTemplateInputSchema)
    .mutation(({ input }) => createWorkflowTemplate(input)),

  getWorkflowTemplates: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getWorkflowTemplates(input.userId)),

  getWorkflowTemplateById: publicProcedure
    .input(z.object({ templateId: z.number() }))
    .query(({ input }) => getWorkflowTemplateById(input.templateId)),

  // Analytics
  getContentAnalytics: publicProcedure
    .input(contentAnalyticsQuerySchema)
    .query(({ input }) => getContentAnalytics(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
  console.log('Available routes:');
  console.log('- User Management: createUser, getUsers');
  console.log('- Content Generation: generateContent, createContent, getContent, updateContent');
  console.log('- Approval Workflow: approveContent, getPendingApprovals');
  console.log('- Content Calendar: getContentCalendar, scheduleContent, unscheduleContent');
  console.log('- Workflow Templates: createWorkflowTemplate, getWorkflowTemplates');
  console.log('- Analytics: getContentAnalytics');
}

start();