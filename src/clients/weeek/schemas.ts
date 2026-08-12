import { z } from 'zod';

export const WeeekUserSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  email: z.string().nullish().transform(v => v?.trim() || ''),
  name: z.string().nullish().transform(v => v?.trim() || 'Пользователь').default('Пользователь'),
  avatarUrl: z.string().nullish().transform(v => (v ? String(v) : null)),
});

export const WeeekProjectSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().nullish().transform(val => val?.trim() || 'Без названия').default('Без названия'),
  description: z.string().nullish().transform(v => (v ? String(v) : null)),
  isPrivate: z.union([z.boolean(), z.number()]).nullish().transform(v => Boolean(v)).default(false),
});

export const WeeekTagSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string().nullish().transform(v => v?.trim() || 'Tag').default('Tag'),
  color: z.string().nullish().transform(v => (v ? String(v) : null)),
});

export const WeeekTaskSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  parentId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
  projectId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
  title: z.string().nullish().transform(val => val?.trim() || 'Untitled task').default('Untitled task'),
  description: z.string().nullish().transform(v => (v ? String(v) : null)),
  date: z.union([z.string(), z.number()]).nullish().transform(v => (v !== null && v !== undefined ? String(v) : null)),
  dateStart: z.union([z.string(), z.number()]).nullish().transform(v => (v !== null && v !== undefined ? String(v) : null)),
  dateEnd: z.union([z.string(), z.number()]).nullish().transform(v => (v !== null && v !== undefined ? String(v) : null)),
  timeStart: z.union([z.string(), z.number()]).nullish().transform(v => (v !== null && v !== undefined ? String(v) : null)),
  timeEnd: z.union([z.string(), z.number()]).nullish().transform(v => (v !== null && v !== undefined ? String(v) : null)),
  priority: z.union([z.number(), z.string()]).nullish().transform(val => {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : Math.max(0, Math.min(num, 3));
  }).default(0),
  isCompleted: z.union([z.boolean(), z.number(), z.string()]).nullish().transform(val => Boolean(val === true || val === 1 || val === '1')).default(false),
  isDeleted: z.union([z.boolean(), z.number(), z.string()]).nullish().transform(val => Boolean(val === true || val === 1 || val === '1')).default(false),
  assignees: z.array(z.any()).nullish().transform(val => (Array.isArray(val) ? val : [])).default([]),
  tags: z.array(z.any()).nullish().transform(val => (Array.isArray(val) ? val : [])).default([]),
});

export const WeeekTasksListSchema = z.object({
  tasks: z.array(WeeekTaskSchema).default([]),
  hasMore: z.boolean().optional(),
  total: z.number().optional(),
});
