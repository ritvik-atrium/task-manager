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

  const copyTask = useCallback((id: string, targetCategoryId?: string, targetParentId?: string) => {
    setTasks(prev => {
      const source = prev[id];
      if (!source) return prev;
      const next = { ...prev };
      const copyRecursive = (taskId: string, newParentId?: string, catId?: string): string => {
        const t = next[taskId];
        if (!t) return taskId;
        const newId = crypto.randomUUID();
        next[newId] = {
          ...t,
          id: newId,
          categoryId: catId ?? t.categoryId,
          parentId: newParentId,
          subtaskIds: [],
          createdAt: Date.now(),
        };
        const newSubIds = t.subtaskIds.map(sid => copyRecursive(sid, newId, catId ?? t.categoryId));
        next[newId] = { ...next[newId], subtaskIds: newSubIds };
        return newId;
      };
      const effectiveParentId = targetParentId ?? source.parentId ?? undefined;
      const effectiveCategoryId = targetParentId
        ? (prev[targetParentId]?.categoryId ?? targetCategoryId)
        : targetCategoryId;
      const newRootId = copyRecursive(id, effectiveParentId, effectiveCategoryId);
      if (effectiveParentId && next[effectiveParentId]) {
        next[effectiveParentId] = {
          ...next[effectiveParentId],
          subtaskIds: [...next[effectiveParentId].subtaskIds, newRootId],
        };
      }
      return next;
    });
  }, []);

  const moveUnderTask = useCallback((taskId: string, newParentId: string) => {
    setTasks(prev => {
      const task = prev[taskId];
      const newParent = prev[newParentId];
      if (!task || !newParent) return prev;
      // Prevent moving into own descendants
      const isDescendant = (id: string): boolean => {
        if (id === taskId) return true;
        const t = prev[id];
        return !!t && t.subtaskIds.some(isDescendant);
      };
      if (isDescendant(newParentId)) return prev;

      const next = { ...prev };
      const newCategoryId = newParent.categoryId;

      // Remove from old parent's subtaskIds
      if (task.parentId && next[task.parentId]) {
        next[task.parentId] = {
          ...next[task.parentId],
          subtaskIds: next[task.parentId].subtaskIds.filter(id => id !== taskId),
        };
      }

      // Update categoryId recursively
      const updateCat = (tid: string) => {
        if (!next[tid]) return;
        next[tid] = { ...next[tid], categoryId: newCategoryId };
        next[tid].subtaskIds.forEach(updateCat);
      };
      updateCat(taskId);

      // Update parentId
      next[taskId] = { ...next[taskId], parentId: newParentId };

      // Add to new parent
      next[newParentId] = {
        ...next[newParentId],
        subtaskIds: [...next[newParentId].subtaskIds, taskId],
      };

      return next;
    });
  }, []);

  const bulkMoveToCategory = useCallback((ids: string[], categoryId: string) => {
    setTasks(prev => {
      const next = { ...prev };
      const moveRec = (taskId: string) => {
        if (!next[taskId]) return;
        next[taskId] = { ...next[taskId], categoryId };
        next[taskId].subtaskIds.forEach(moveRec);
      };
      ids.forEach(moveRec);
      return next;
    });
  }, []);

  const bulkCopyToCategory = useCallback((ids: string[], categoryId: string) => {
    setTasks(prev => {
      const next = { ...prev };
      const copyRec = (taskId: string, newParentId?: string, catId?: string): string => {
        const t = next[taskId];
        if (!t) return taskId;
        const newId = crypto.randomUUID();
        next[newId] = { ...t, id: newId, categoryId: catId ?? t.categoryId, parentId: newParentId, subtaskIds: [], createdAt: Date.now() };
        next[newId] = { ...next[newId], subtaskIds: t.subtaskIds.map(sid => copyRec(sid, newId, catId ?? t.categoryId)) };
        return newId;
      };
      ids.forEach(id => {
        const src = prev[id];
        if (!src) return;
        const newId = copyRec(id, src.parentId ?? undefined, categoryId);
        if (src.parentId && next[src.parentId]) {
          next[src.parentId] = { ...next[src.parentId], subtaskIds: [...next[src.parentId].subtaskIds, newId] };
        }
      });
      return next;
    });
  }, []);

  const bulkMoveUnderTask = useCallback((ids: string[], newParentId: string) => {
    setTasks(prev => {
      const newParent = prev[newParentId];
      if (!newParent) return prev;
      const next = { ...prev };
      const newCategoryId = newParent.categoryId;
      const allDescendants = new Set<string>();
      const collect = (id: string) => { allDescendants.add(id); prev[id]?.subtaskIds.forEach(collect); };
      ids.forEach(collect);
      if (allDescendants.has(newParentId)) return prev;
      ids.forEach(taskId => {
        const task = next[taskId];
        if (!task) return;
        if (task.parentId && next[task.parentId]) {
          next[task.parentId] = { ...next[task.parentId], subtaskIds: next[task.parentId].subtaskIds.filter(i => i !== taskId) };
        }
        const updateCat = (tid: string) => {
          if (!next[tid]) return;
          next[tid] = { ...next[tid], categoryId: newCategoryId };
          next[tid].subtaskIds.forEach(updateCat);
        };
        updateCat(taskId);
        next[taskId] = { ...next[taskId], parentId: newParentId };
      });
      next[newParentId] = { ...next[newParentId], subtaskIds: [...next[newParentId].subtaskIds, ...ids.filter(id => next[id])] };
      return next;
    });
  }, []);

  const bulkCopyUnderTask = useCallback((ids: string[], newParentId: string) => {
    setTasks(prev => {
      const newParent = prev[newParentId];
      if (!newParent) return prev;
      const next = { ...prev };
      const newCategoryId = newParent.categoryId;
      const copyRec = (taskId: string, parentId?: string, catId?: string): string => {
        const t = next[taskId];
        if (!t) return taskId;
        const newId = crypto.randomUUID();
        next[newId] = { ...t, id: newId, categoryId: catId ?? t.categoryId, parentId, subtaskIds: [], createdAt: Date.now() };
        next[newId] = { ...next[newId], subtaskIds: t.subtaskIds.map(sid => copyRec(sid, newId, catId ?? t.categoryId)) };
        return newId;
      };
      const newIds = ids.map(id => copyRec(id, newParentId, newCategoryId));
      next[newParentId] = { ...next[newParentId], subtaskIds: [...next[newParentId].subtaskIds, ...newIds] };
      return next;
    });
  }, []);

  const moveTask = useCallback((id: string, newCategoryId: string) => {
    setTasks(prev => {
      const next = { ...prev };
      const moveRecursive = (taskId: string) => {
        if (!next[taskId]) return;
        next[taskId] = { ...next[taskId], categoryId: newCategoryId };
        next[taskId].subtaskIds.forEach(moveRecursive);
      };
      moveRecursive(id);
      return next;
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
    copyTask,
    moveTask,
    moveUnderTask,
    bulkMoveToCategory,
    bulkCopyToCategory,
    bulkMoveUnderTask,
    bulkCopyUnderTask,
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
