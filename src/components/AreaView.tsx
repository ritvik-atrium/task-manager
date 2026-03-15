
"use client";

import React, { useMemo } from 'react';
import { Task, Category, LifeArea } from '@/types/task';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TaskItem } from './TaskItem';
import { ArrowLeft, User, Briefcase, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AREA_ICONS: Record<LifeArea, React.ReactNode> = {
  Personal: <User className="w-5 h-5" />,
  Professional: <Briefcase className="w-5 h-5" />,
  Social: <Users className="w-5 h-5" />,
  Spiritual: <Sparkles className="w-5 h-5" />,
};

interface AreaViewProps {
  area: LifeArea;
  categories: Category[];
  tasks: Record<string, Task>;
  onBack: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEditTask: (task: Task) => void;
}

export function AreaView({ area, categories, tasks, onBack, onToggle, onDelete, onAddSubtask, onEditTask }: AreaViewProps) {
  const areaCategories = useMemo(() => categories.filter(c => c.area === area), [categories, area]);

  const areaTasks = useMemo(() => Object.values(tasks).filter(t => areaCategories.some(c => c.id === t.categoryId)), [tasks, areaCategories]);

  const stats = useMemo(() => {
    const total = areaTasks.length;
    const completed = areaTasks.filter(t => t.status === 'done').length;
    const inProgress = areaTasks.filter(t => t.status === 'in-progress').length;
    const todo = areaTasks.filter(t => t.status === 'todo').length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, todo, progress };
  }, [areaTasks]);

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            {AREA_ICONS[area]}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight truncate">{area}</h2>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Area of Life</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">New</p>
          <p className="text-2xl font-bold">{stats.todo}</p>
        </div>
        <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">In Progress</p>
          <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
          <p className="text-2xl font-bold text-accent">{stats.completed}</p>
        </div>
        <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Progress</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold">{stats.progress}%</p>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700 rounded-full" style={{ width: `${stats.progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="shrink-0 bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-muted-foreground">Overall completion — {areaCategories.length} categories</span>
          <Badge className="bg-muted text-muted-foreground text-[10px] font-black uppercase">{stats.completed} of {stats.total} tasks done</Badge>
        </div>
        <Progress value={stats.progress} className="h-3 bg-muted" />
      </div>

      {/* Categories with tasks */}
      <div className="flex-1 bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 shadow-sm border border-border/50 overflow-auto min-h-0">
        {areaCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 opacity-40">
            <p className="text-sm font-bold uppercase tracking-widest">No categories in this area</p>
          </div>
        ) : (
          <div className="space-y-8">
            {areaCategories.map(cat => {
              const catRootTasks = Object.values(tasks).filter(t => t.categoryId === cat.id && !t.parentId);
              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{cat.name}</h3>
                    <span className="text-xs text-muted-foreground">({catRootTasks.length})</span>
                  </div>
                  {catRootTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-5 italic">No tasks</p>
                  ) : (
                    <div className="space-y-1">
                      {catRootTasks.map(task => (
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
