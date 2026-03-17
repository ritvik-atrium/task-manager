
"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { Task, Category } from '@/types/task';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TaskItem } from './TaskItem';
import { ArrowLeft, CheckCircle2, Clock, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskFilters, TaskFilterState, DEFAULT_CAT_FILTERS, applyTaskFilters } from './TaskFilters';
import { BulkActionBar } from './BulkActionBar';

interface CategoryViewProps {
  category: Category;
  categories: Category[];
  tasks: Record<string, Task>;
  onBack: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEditTask: (task: Task) => void;
  onMoveTask: (taskId: string, newCategoryId: string) => void;
  onCopyTask: (taskId: string, targetCategoryId?: string, targetParentId?: string) => void;
  onMoveUnderTask: (taskId: string, newParentId: string) => void;
  onBulkMoveToCategory: (ids: string[], categoryId: string) => void;
  onBulkCopyToCategory: (ids: string[], categoryId: string) => void;
  onBulkMoveUnderTask: (ids: string[], parentId: string) => void;
  onBulkCopyUnderTask: (ids: string[], parentId: string) => void;
}

export function CategoryView({ category, categories, tasks, onBack, onToggle, onDelete, onAddSubtask, onEditTask, onMoveTask, onCopyTask, onMoveUnderTask, onBulkMoveToCategory, onBulkCopyToCategory, onBulkMoveUnderTask, onBulkCopyUnderTask }: CategoryViewProps) {
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_CAT_FILTERS);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

  const catTasks = useMemo(() => Object.values(tasks).filter(t => t.categoryId === category.id), [tasks, category.id]);
  const rootTasks = useMemo(() => {
    const roots = catTasks.filter(t => !t.parentId);
    return applyTaskFilters(roots, filters);
  }, [catTasks, filters]);

  const stats = useMemo(() => {
    const total = catTasks.length;
    const completed = catTasks.filter(t => t.status === 'done').length;
    const inProgress = catTasks.filter(t => t.status === 'in-progress').length;
    const todo = catTasks.filter(t => t.status === 'todo').length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, todo, progress };
  }, [catTasks]);

  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight truncate">{category.name}</h2>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{category.area}</p>
          </div>
        </div>
      </div>

      {/* Compact stats — small screens only */}
      <div className="flex sm:hidden items-center gap-2 shrink-0 bg-white dark:bg-card px-4 py-2.5 rounded-2xl border border-border/50 shadow-sm text-sm">
        <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="font-semibold">{stats.todo}</span>
        <span className="text-muted-foreground mx-1">·</span>
        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="font-semibold text-primary">{stats.inProgress}</span>
        <span className="text-muted-foreground mx-1">·</span>
        <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
        <span className="font-semibold text-accent">{stats.completed}</span>
        <span className="text-muted-foreground mx-1">·</span>
        <span className="font-bold shrink-0">{stats.progress}%</span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden ml-1">
          <div className="h-full transition-all duration-700 rounded-full" style={{ width: `${stats.progress}%`, backgroundColor: category.color }} />
        </div>
      </div>

      {/* Full stats cards — sm+ only */}
      <div className="hidden sm:grid grid-cols-4 gap-4 shrink-0">
        <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">New</p>
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats.todo}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">In Progress</p>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            <p className="text-2xl font-bold text-accent">{stats.completed}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Progress</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold">{stats.progress}%</p>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full transition-all duration-700 rounded-full" style={{ width: `${stats.progress}%`, backgroundColor: category.color }} />
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar full width — sm+ only */}
      <div className="hidden sm:block shrink-0 bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-muted-foreground">Overall completion</span>
          <Badge className="bg-muted text-muted-foreground text-[10px] font-black uppercase">{stats.completed} of {stats.total} tasks done</Badge>
        </div>
        <Progress value={stats.progress} className="h-3 bg-muted" />
      </div>

      {/* Filters + Select toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex-1 min-w-0">
          <TaskFilters filters={filters} onChange={setFilters} />
        </div>
        <Button
          variant={selectionMode ? 'default' : 'outline'}
          size="sm"
          className="shrink-0 h-8 text-xs"
          onClick={() => { setSelectionMode(v => !v); setSelectedIds(new Set()); }}
        >
          {selectionMode ? 'Cancel' : 'Select'}
        </Button>
      </div>

      {/* Bulk action bar */}
      {selectionMode && (
        <BulkActionBar
          selectedIds={selectedIds}
          allTasks={tasks}
          categories={categories}
          onClear={clearSelection}
          onMoveToCategory={catId => onBulkMoveToCategory(Array.from(selectedIds), catId)}
          onCopyToCategory={catId => onBulkCopyToCategory(Array.from(selectedIds), catId)}
          onMoveUnderTask={parentId => onBulkMoveUnderTask(Array.from(selectedIds), parentId)}
          onCopyUnderTask={parentId => onBulkCopyUnderTask(Array.from(selectedIds), parentId)}
        />
      )}

      {/* Task list */}
      <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-sm border border-border/50">
        {rootTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 opacity-40">
            <Circle className="w-8 h-8 mb-2" />
            <p className="text-sm font-bold uppercase tracking-widest">No tasks yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {rootTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                allTasks={tasks}
                categories={categories}
                onToggle={onToggle}
                onDelete={onDelete}
                onAddSubtask={onAddSubtask}
                onEditTask={onEditTask}
                onMoveTask={onMoveTask}
                onCopyTask={onCopyTask}
                onMoveUnderTask={onMoveUnderTask}
                selectionMode={selectionMode}
                selectedIds={selectedIds}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
