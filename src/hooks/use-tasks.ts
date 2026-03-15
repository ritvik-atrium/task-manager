"use client";

import { useState, useEffect, useCallback } from 'react';
import { Task, Category, TaskStore, TaskStatus, LifeArea } from '@/types/task';

// Legacy key — only used once for migration to server-side storage
const LEGACY_STORAGE_KEY = 'tasknest_data_v2';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Work', color: '#1F83A7', area: 'Professional' },
  { id: 'cat-2', name: 'Health', color: '#3DBA8C', area: 'Personal' },
  { id: 'cat-3', name: 'Family', color: '#f59e0b', area: 'Social' },
  { id: 'cat-4', name: 'Meditation', color: '#8b5cf6', area: 'Spiritual' },
];

function migrateStore(parsed: TaskStore): TaskStore {
  const tasks = { ...parsed.tasks };
  Object.keys(tasks).forEach(id => {
    if (!tasks[id].status) tasks[id].status = 'todo';
  });
  return { tasks, categories: parsed.categories || DEFAULT_CATEGORIES };
}

async function saveToServer(data: TaskStore) {
  await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function useTasks() {
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from server on mount; fall back to localStorage migration if server has no data
  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then((serverData: TaskStore | null) => {
        if (serverData?.tasks) {
          const { tasks, categories } = migrateStore(serverData);
          setTasks(tasks);
          setCategories(categories);
        } else {
          // First run — migrate from localStorage if available
          try {
            const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (legacy) {
              const { tasks, categories } = migrateStore(JSON.parse(legacy));
              setTasks(tasks);
              setCategories(categories);
              // Persist migrated data to server immediately
              saveToServer({ tasks, categories }).catch(console.error);
            }
          } catch (e) {
            console.error('Failed to migrate from localStorage', e);
          }
        }
        setIsLoaded(true);
      })
      .catch(() => setIsLoaded(true));
  }, []);

  // Save to server whenever data changes after load
  useEffect(() => {
    if (isLoaded) {
      saveToServer({ tasks, categories }).catch(console.error);
    }
  }, [tasks, categories, isLoaded]);

  const addTask = useCallback((title: string, parentId?: string, categoryId?: string, description?: string, deadline?: number) => {
    const id = crypto.randomUUID();
    const taskCategoryId = categoryId || activeCategoryId || categories[0]?.id;
    
    if (!taskCategoryId) return;

    const newTask: Task = {
      id,
      title,
      description,
      status: 'todo',
      categoryId: taskCategoryId,
      parentId,
      subtaskIds: [],
      createdAt: Date.now(),
      deadline: deadline || Date.now(),
    };

    setTasks(prev => {
      const next = { ...prev, [id]: newTask };
      if (parentId && prev[parentId]) {
        next[parentId] = {
          ...prev[parentId],
          subtaskIds: [...prev[parentId].subtaskIds, id],
        };
      }
      return next;
    });

    return id;
  }, [activeCategoryId, categories]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], ...updates }
      };
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const taskToDelete = prev[id];
      if (!taskToDelete) return prev;

      const next = { ...prev };
      const deleteRecursive = (taskId: string) => {
        const subIds = next[taskId]?.subtaskIds || [];
        subIds.forEach(deleteRecursive);
        delete next[taskId];
      };

      if (taskToDelete.parentId && next[taskToDelete.parentId]) {
        next[taskToDelete.parentId] = {
          ...next[taskToDelete.parentId],
          subtaskIds: next[taskToDelete.parentId].subtaskIds.filter(sid => sid !== id),
        };
      }

      deleteRecursive(id);
      return next;
    });
  }, []);

  const setTaskStatus = useCallback((id: string, nextStatus: TaskStatus, recursive: boolean = false) => {
    setTasks(prev => {
      const next = { ...prev };
      const now = Date.now();
      const updateDescendants = (tid: string, status: TaskStatus) => {
        const t = next[tid];
        if (!t) return;
        next[tid] = { ...t, status, completedAt: status === 'done' ? now : undefined };
        t.subtaskIds.forEach(sid => updateDescendants(sid, status));
      };

      const task = next[id];
      if (!task) return next;

      next[id] = { ...task, status: nextStatus, completedAt: nextStatus === 'done' ? now : undefined };
      if (recursive || nextStatus === 'done') {
        task.subtaskIds.forEach(sid => updateDescendants(sid, nextStatus));
      }
      return next;
    });
  }, []);

  const setMultipleTasksStatus = useCallback((updates: { id: string, status: TaskStatus, recursive?: boolean }[]) => {
    setTasks(prev => {
      const next = { ...prev };
      const updateDescendants = (tid: string, status: TaskStatus, now: number) => {
        const t = next[tid];
        if (!t) return;
        next[tid] = { ...t, status, completedAt: status === 'done' ? now : undefined };
        t.subtaskIds.forEach(sid => updateDescendants(sid, status, now));
      };

      const now = Date.now();
      updates.forEach(({ id, status, recursive }) => {
        const task = next[id];
        if (!task) return;
        next[id] = { ...task, status, completedAt: status === 'done' ? now : undefined };
        if (recursive || status === 'done') {
          task.subtaskIds.forEach(sid => updateDescendants(sid, status, now));
        }
      });
      return next;
    });
  }, []);

  const updateCategory = useCallback((id: string, name: string, color: string, area: LifeArea) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name, color, area } : c));
  }, []);

  const addCategory = useCallback((name: string, color: string, area: LifeArea) => {
    const id = crypto.randomUUID();
    const newCategory: Category = { id, name, color, area };
    setCategories(prev => [...prev, newCategory]);
    return id;
  }, []);

  const reorderCategories = useCallback((ids: string[]) => {
    setCategories(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      return ids.map(id => map.get(id)).filter(Boolean) as Category[];
    });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        if (next[key].categoryId === id) delete next[key];
      });
      return next;
    });
    if (activeCategoryId === id) setActiveCategoryId(null);
  }, [activeCategoryId]);

  const exportToJson = useCallback(() => {
    const data = JSON.stringify({ tasks, categories }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tasknest-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [tasks, categories]);

  const importFromJson = useCallback((jsonString: string) => {
    try {
      const parsed: TaskStore = JSON.parse(jsonString);
      if (parsed.tasks && Array.isArray(parsed.categories)) {
        setTasks(parsed.tasks);
        setCategories(parsed.categories);
        return true;
      }
    } catch (e) {
      console.error("Failed to import JSON", e);
    }
    return false;
  }, []);

  return {
    tasks,
    categories,
    activeCategoryId,
    setActiveCategoryId,
    addTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    setMultipleTasksStatus,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    exportToJson,
    importFromJson,
    isLoaded,
  };
}
