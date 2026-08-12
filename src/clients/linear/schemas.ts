import { z } from 'zod';

export const LinearViewerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  organizationName: z.string().optional(),
});

export const LinearTeamSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
});

export const LinearWorkflowStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  position: z.number().optional(),
});

export const LinearUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export const LinearProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  state: z.string().optional(),
});

export const LinearLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
});

export const LinearIssueSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  priority: z.number().optional(),
  stateId: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  url: z.string().optional(),
});
