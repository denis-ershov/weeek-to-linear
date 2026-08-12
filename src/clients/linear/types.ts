export interface LinearViewer {
  id: string;
  name: string;
  email: string;
  organizationName?: string;
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled' | string;
  position?: number;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
  displayName?: string;
  active?: boolean;
}

export interface LinearProject {
  id: string;
  name: string;
  description?: string | null;
  state?: string;
}

export interface LinearLabel {
  id: string;
  name: string;
  color?: string | null;
}

export interface LinearIssue {
  id: string;
  identifier: string; // Например, ENG-123
  title: string;
  description?: string | null;
  priority?: number;
  stateId?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  projectId?: string | null;
  parentId?: string | null;
  url?: string;
}

export interface CreateProjectInput {
  teamId: string;
  name: string;
  description?: string;
}

export interface CreateLabelInput {
  teamId: string;
  name: string;
  color?: string;
}

export interface CreateIssueInput {
  teamId: string;
  title: string;
  description?: string;
  priority?: number;
  stateId?: string;
  dueDate?: string;
  assigneeId?: string;
  labelIds?: string[];
  projectId?: string;
  parentId?: string;
}

export interface UpdateIssueInput {
  parentId?: string;
  stateId?: string;
  assigneeId?: string;
  labelIds?: string[];
  dueDate?: string;
  description?: string;
}
