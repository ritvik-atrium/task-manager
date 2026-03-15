
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type LifeArea = 'Personal' | 'Professional' | 'Social' | 'Spiritual';

export interface Category {
  id: string;
  name: string;
  color: string;
  area: LifeArea;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  categoryId: string;
  parentId?: string;
  subtaskIds: string[];
  createdAt: number;
  completedAt?: number; // timestamp, set when status becomes 'done', cleared when unmarked
  deadline?: number; // timestamp
}

export interface TaskStore {
  tasks: Record<string, Task>;
  categories: Category[];
}
