
"use client";

import React, { useMemo, useState } from 'react';
import { Task, Category, LifeArea, TaskStatus } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { differenceInDays } from 'date-fns';
import { Calendar, Filter, Clock } from 'lucide-react';
import { TaskItem } from './TaskItem';

interface ParallelViewProps {
  tasks: Record<string, Task>;
  categories: Category[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEditTask: (task: Task) => void;
}

export function ParallelView({ tasks, categories, onToggle, onDelete, onAddSubtask, onEditTask }: ParallelViewProps) {
  const [filterArea, setFilterArea] = useState<LifeArea | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');
  const [filterDeadline, setFilterDeadline] = useState<string>('All');

  const filteredCategories = useMemo(() => {
    return categories.filter(c => filterArea === 'All' || c.area === filterArea);
  }, [categories, filterArea]);

  const getFilteredTasks = (catId: string) => {
    return Object.values(tasks).filter(t => {
      if (t.categoryId !== catId || t.status === 'done') return false;
      if (filterStatus !== 'All' && t.status !== filterStatus) return false;
      
      if (filterDeadline !== 'All') {
        if (!t.deadline) return false;
        const days = differenceInDays(t.deadline, new Date());
        if (filterDeadline === 'within3' && days > 3) return false;
        if (filterDeadline === 'within7' && days > 7) return false;
      }

      return true;
    });
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-wrap items-center gap-4 bg-white/50 p-4 rounded-2xl border border-border/50">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Filters</span>
        </div>
        <Select value={filterArea} onValueChange={(v) => setFilterArea(v as any)}>
          <SelectTrigger className="w-40 h-9 rounded-xl border-none shadow-sm bg-white">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Areas</SelectItem>
            <SelectItem value="Personal">Personal</SelectItem>
            <SelectItem value="Professional">Professional</SelectItem>
            <SelectItem value="Social">Social</SelectItem>
            <SelectItem value="Spiritual">Spiritual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-40 h-9 rounded-xl border-none shadow-sm bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Active</SelectItem>
            <SelectItem value="todo">New Only</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterDeadline} onValueChange={(v) => setFilterDeadline(v)}>
          <SelectTrigger className="w-40 h-9 rounded-xl border-none shadow-sm bg-white">
            <SelectValue placeholder="Deadline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Any Deadline</SelectItem>
            <SelectItem value="within3">Next 3 Days</SelectItem>
            <SelectItem value="within7">Next 7 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1 w-full pb-4">
        <div className="flex gap-6 items-start pb-6">
          {filteredCategories.map(cat => {
            const catTasks = getFilteredTasks(cat.id);
            if (catTasks.length === 0 && filterArea === 'All') return null;

            return (
              <div key={cat.id} className="w-80 shrink-0 flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <h3 className="font-bold text-foreground truncate max-w-[150px]">{cat.name}</h3>
                  </div>
                  <Badge variant="secondary" className="bg-muted text-[10px] font-black uppercase">
                    {catTasks.length} Active
                  </Badge>
                </div>
                
                <div className="flex flex-col gap-2 p-3 bg-white/40 rounded-2xl border border-border/50 min-h-[100px]">
                  {catTasks.map(task => (
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
                  {catTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-24 opacity-30">
                      <Clock className="w-6 h-6 mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">No Active Tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
