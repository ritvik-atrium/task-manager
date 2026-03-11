
export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  categoryId: string;
  parentId?: string; // If undefined, it's a top-level task
  subtaskIds: string[];
  createdAt: number;
}

export interface TaskStore {
  tasks: Record<string, Task>;
  categories: Category[];
}
