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

export interface WeeekTag {
  id: string;
  title: string;
  color?: string | null;
}

export interface WeeekTask {
  id: string;
  parentId?: string | null;
  projectId?: string | null;
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
  assignees?: Array<string | { id: string; email?: string; name?: string }>;
  tags?: Array<string | { id: string; title?: string }>;
}

export interface WeeekTasksResponse {
  tasks: WeeekTask[];
  hasMore?: boolean;
  total?: number;
}
