import { z } from 'zod';
import { normalizeDocumentContentToMarkdown } from '../../utils/markdown.js';

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

export const WeeekBoardSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().nullish().transform(val => val?.trim() || 'Доска').default('Доска'),
  projectId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
  order: z.number().nullish().transform(v => (v !== null && v !== undefined ? v : 0)).default(0),
});

export const WeeekBoardColumnSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string().nullish().transform(val => val?.trim() || 'Колонка').default('Колонка'),
  boardId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
  projectId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
  order: z.number().nullish().transform(v => (v !== null && v !== undefined ? v : 0)).default(0),
  color: z.string().nullish().transform(v => (v ? String(v) : null)),
});

export const WeeekDocumentSchema = z.preprocess(
  (val: unknown) => {
    if (!val || typeof val !== 'object') return val;
    const obj = val as Record<string, unknown>;
    const id = obj.id ?? obj.uuid ?? obj.articleId ?? obj.documentId ?? obj.doc_id ?? obj._id;
    const title = obj.title ?? obj.name ?? obj.header ?? obj.subject ?? 'Документ без названия';
    const content = obj.content ?? obj.body ?? obj.text ?? obj.description ?? obj.data ?? obj.html ?? obj.blocks ?? '';
    const projectId = obj.projectId ?? obj.project_id ?? obj.project;
    const parentId = obj.parentId ?? obj.parent_id ?? obj.folderId ?? obj.folder_id;

    return {
      ...obj,
      id: id !== undefined ? id : 'doc_' + Math.random().toString(36).slice(2, 9),
      title,
      content,
      projectId,
      parentId,
    };
  },
  z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    title: z
      .union([z.string(), z.number()])
      .nullish()
      .transform(val => (val !== null && val !== undefined ? String(val).trim() : 'Документ без названия'))
      .default('Документ без названия'),
    content: z
      .any()
      .nullish()
      .transform(v => normalizeDocumentContentToMarkdown(v))
      .default(''),
    parentId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
    projectId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish(),
  }),
);

export const WeeekTagSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string().nullish().transform(v => v?.trim() || 'Tag').default('Tag'),
  color: z.string().nullish().transform(v => (v ? String(v) : null)),
});

export const WeeekTaskSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  parentId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
  projectId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
  boardId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
  boardColumnId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
  columnId: z.union([z.string(), z.number()]).nullish().transform(v => (v ? String(v) : null)),
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
