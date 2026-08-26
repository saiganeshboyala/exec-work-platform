import { Router } from 'express';

import { activityRouter } from '@/modules/activity';
import { adminRouter } from '@/modules/admin';
import { authRouter } from '@/modules/auth';
import { automationsRouter } from '@/modules/automations';
import { boardsRouter } from '@/modules/boards';
import { collaborationRouter } from '@/modules/collaboration';
import { dashboardRouter } from '@/modules/dashboard';
import { healthRouter } from '@/modules/health';
import { integrationsRouter } from '@/modules/integrations';
import { itemsRouter } from '@/modules/items';
import { meetingsRouter } from '@/modules/meetings';
import { membersRouter } from '@/modules/members';
import { notificationsRouter } from '@/modules/notifications';
import { usersRouter } from '@/modules/users';
import { viewsRouter } from '@/modules/views';
import { workspacesRouter } from '@/modules/workspaces';

/**
 * The single mounting table for version 1. Adding a module means adding one
 * line here and nothing else - no route file elsewhere reaches into the app.
 */
export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/members', membersRouter);
v1Router.use('/workspaces', workspacesRouter);
v1Router.use('/boards', boardsRouter);
v1Router.use('/items', itemsRouter);
v1Router.use('/meetings', meetingsRouter);
v1Router.use('/activity', activityRouter);
v1Router.use('/dashboard', dashboardRouter);
v1Router.use('/notifications', notificationsRouter);
v1Router.use('/integrations', integrationsRouter);
v1Router.use('/views', viewsRouter);
v1Router.use('/collab', collaborationRouter);
v1Router.use('/automations', automationsRouter);
v1Router.use('/admin', adminRouter);
