
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Task, Category, TaskStore } from '@/types/task';

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
        setTasks(parsed.tasks || {});
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
      completed: false,
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
      
      // Recursive delete subtasks
      const deleteRecursive = (taskId: string) => {
        const subIds = next[taskId]?.subtaskIds || [];
        subIds.forEach(deleteRecursive);
        delete next[taskId];
      };

      // Remove from parent's subtask list
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

  const toggleComplete = useCallback((id: string) => {
    setTasks(prev => {
      const task = prev[id];
      if (!task) return prev;
      
      const newStatus = !task.completed;
      const next = { ...prev, [id]: { ...task, completed: newStatus } };

      // Helper to toggle all descendants
      const toggleDescendants = (tid: string, status: boolean) => {
        const t = next[tid];
        if (!t) return;
        next[tid] = { ...t, completed: status };
        t.subtaskIds.forEach(sid => toggleDescendants(sid, status));
      };

      // If completing, complete all children
      if (newStatus) {
        task.subtaskIds.forEach(sid => toggleDescendants(sid, true));
      }

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
    toggleComplete,
    addCategory,
    deleteCategory,
    exportToJson,
    importFromJson,
    isLoaded,
  };
}
