
"use client";

import React, { useMemo, useState } from 'react';
import { Task, Category } from '@/types/task';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TaskItem } from './TaskItem';
import { ArrowLeft, CheckCircle2, Clock, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskFilters, TaskFilterState, DEFAULT_CAT_FILTERS, applyTaskFilters } from './TaskFilters';

interface CategoryViewProps {
  category: Category;
  tasks: Record<string, Task>;
  onBack: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEditTask: (task: Task) => void;
}

export function CategoryView({ category, tasks, onBack, onToggle, onDelete, onAddSubtask, onEditTask }: CategoryViewProps) {
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_CAT_FILTERS);

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
    <div className="flex flex-col h-full gap-6">
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

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
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

      {/* Progress bar full width */}
      <div className="shrink-0 bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-muted-foreground">Overall completion</span>
          <Badge className="bg-muted text-muted-foreground text-[10px] font-black uppercase">{stats.completed} of {stats.total} tasks done</Badge>
        </div>
        <Progress value={stats.progress} className="h-3 bg-muted" />
      </div>

      {/* Filters */}
      <TaskFilters filters={filters} onChange={setFilters} />

      {/* Task list */}
      <div className="flex-1 bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-sm border border-border/50 overflow-auto min-h-0">
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
                onToggle={onToggle}
                onDelete={onDelete}
                onAddSubtask={onAddSubtask}
                onEditTask={onEditTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
