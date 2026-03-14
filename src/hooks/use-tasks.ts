
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Task, Category, TaskStore, TaskStatus } from '@/types/task';

const STORAGE_KEY = 'tasknest_data';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Work', color: '#1F83A7' },
  { id: 'cat-2', name: 'Personal', color: '#3DBA8C' },
  { id: 'cat-3', name: 'Shopping', color: '#f59e0b' },
];

export function useTasks() {
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: TaskStore = JSON.parse(saved);
        
        // Migration: Ensure all tasks have a status field (handling legacy boolean 'completed')
        const rawTasks = parsed.tasks || {};
        const migratedTasks: Record<string, Task> = {};
        
        Object.keys(rawTasks).forEach(id => {
          const task = rawTasks[id];
          if (!task.status) {
            const isDone = (task as any).completed === true;
            task.status = isDone ? 'done' : 'todo';
          }
          migratedTasks[id] = task;
        });

        setTasks(migratedTasks);
        setCategories(parsed.categories || DEFAULT_CATEGORIES);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, categories }));
    }
  }, [tasks, categories, isLoaded]);

  const addTask = useCallback((title: string, parentId?: string, categoryId?: string, description?: string) => {
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
      const task = prev[id];
      if (!task) return prev;

      const next = { ...prev, [id]: { ...task, status: nextStatus } };

      const updateDescendants = (tid: string, status: TaskStatus) => {
        const t = next[tid];
        if (!t) return;
        next[tid] = { ...t, status: status };
        t.subtaskIds.forEach(sid => updateDescendants(sid, status));
      };

      if (recursive || nextStatus === 'done') {
        task.subtaskIds.forEach(sid => updateDescendants(sid, nextStatus));
      }

      return next;
    });
  }, []);

  const setMultipleTasksStatus = useCallback((updates: { id: string, status: TaskStatus, recursive?: boolean }[]) => {
    setTasks(prev => {
      const next = { ...prev };

      const updateDescendants = (tid: string, status: TaskStatus) => {
        const t = next[tid];
        if (!t) return;
        next[tid] = { ...t, status: status };
        t.subtaskIds.forEach(sid => updateDescendants(sid, status));
      };

      updates.forEach(({ id, status, recursive }) => {
        const task = next[id];
        if (!task) return;

        next[id] = { ...task, status: status };

        if (recursive || status === 'done') {
          task.subtaskIds.forEach(sid => updateDescendants(sid, status));
        }
      });

      return next;
    });
  }, []);

  const addCategory = useCallback((name: string, color: string) => {
    const id = crypto.randomUUID();
    const newCategory = { id, name, color };
    setCategories(prev => [...prev, newCategory]);
    return id;
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
    deleteCategory,
    exportToJson,
    importFromJson,
    isLoaded,
  };
}
