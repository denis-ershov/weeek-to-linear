import { type WeeekPriority } from '../../core/types.js';

export interface WeeekUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface WeeekProject {
  id: string;
  name: string;
  description?: string | null;
  isPrivate?: boolean;
}

export interface WeeekBoard {
  id: string;
  name: string;
  projectId?: string | null;
  order?: number;
}

export interface WeeekBoardColumn {
  id: string;
  name: string;
  boardId?: string | null;
  projectId?: string | null;
  order?: number;
  color?: string | null;
}

export interface WeeekDocument {
  id: string;
  title: string;
  content?: string | null;
  parentId?: string | null;
  projectId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface WeeekTag {
  id: string;
  title: string;
  color?: string | null;
}

export interface WeeekTask {
  id: string;
  parentId?: string | null;
  projectId?: string | null;
  boardId?: string | null;
  boardColumnId?: string | null;
  columnId?: string | null;
  title: string;
  description?: string | null;
  date?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  timeStart?: string | null;
  timeEnd?: string | null;
  priority?: WeeekPriority | number;
  isCompleted?: boolean;
  isDeleted?: boolean;
  assignees?: Array<string | { id?: string; email?: string; name?: string }>;
  tags?: Array<string | { id?: string; title?: string }>;
}

export interface WeeekTasksResponse {
  tasks: WeeekTask[];
  hasMore?: boolean;
  total?: number;
}
