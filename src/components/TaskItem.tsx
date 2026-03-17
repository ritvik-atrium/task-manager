
"use client";

import React, { useState, useMemo } from 'react';
import { Task, Category } from '@/types/task';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  MoreVertical,
  Edit2,
  Clock,
  Calendar,
  FolderInput,
  Copy,
  ArrowRightToLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { differenceInCalendarDays, isPast, isToday } from 'date-fns';
import { TaskPickerDialog } from './TaskPickerDialog';

interface TaskItemProps {
  task: Task;
  allTasks: Record<string, Task>;
  categories?: Category[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEditTask: (task: Task) => void;
  onMoveTask?: (taskId: string, newCategoryId: string) => void;
  onCopyTask?: (taskId: string, targetCategoryId?: string, targetParentId?: string) => void;
  onMoveUnderTask?: (taskId: string, newParentId: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onSelect?: (id: string) => void;
  sortByDeadline?: boolean;
  depth?: number;
}

function getMinDeadline(taskId: string, allTasks: Record<string, Task>): number {
  const task = allTasks[taskId];
  if (!task) return Infinity;
  const own = task.deadline ?? Infinity;
  const subMin = task.subtaskIds.reduce((min, sid) => Math.min(min, getMinDeadline(sid, allTasks)), Infinity);
  return Math.min(own, subMin);
}

function getDescendantIds(taskId: string, allTasks: Record<string, Task>): Set<string> {
  const ids = new Set<string>();
  const collect = (id: string) => {
    ids.add(id);
    const t = allTasks[id];
    if (t) t.subtaskIds.forEach(collect);
  };
  collect(taskId);
  return ids;
}

export function TaskItem({
  task,
  allTasks,
  categories,
  onToggle,
  onDelete,
  onAddSubtask,
  onEditTask,
  onMoveTask,
  onCopyTask,
  onMoveUnderTask,
  selectionMode = false,
  selectedIds,
  onSelect,
  sortByDeadline = false,
  depth = 0
}: TaskItemProps) {
  const isSelected = selectedIds?.has(task.id) ?? false;
  const [isExpanded, setIsExpanded] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'move-under' | 'copy-under'>('move-under');
  const hasSubtasks = task.subtaskIds.length > 0;

  const sortedSubtaskIds = useMemo(() => {
    if (!sortByDeadline) return task.subtaskIds;
    return [...task.subtaskIds].sort((a, b) => getMinDeadline(a, allTasks) - getMinDeadline(b, allTasks));
  }, [task.subtaskIds, allTasks, sortByDeadline]);

  const deadlineInfo = useMemo(() => {
    if (!task.deadline) return null;
    const days = differenceInCalendarDays(task.deadline, new Date());
    const isOverdue = isPast(task.deadline) && !isToday(task.deadline);

    let colorClass = "";
    if (task.status === 'done') {
      colorClass = "border-accent bg-accent/5";
    } else if (isOverdue || days === 0) {
      colorClass = "border-red-500 bg-red-100 dark:border-red-400 dark:bg-red-900/50";
    } else if (days < 4) {
      colorClass = "border-fuchsia-500 bg-fuchsia-100 dark:border-fuchsia-400 dark:bg-fuchsia-900/45";
    } else if (days < 7) {
      colorClass = "border-sky-500 bg-sky-100 dark:border-sky-400 dark:bg-sky-900/50";
    }

    return { days, isOverdue, colorClass };
  }, [task.deadline, task.status]);

  const excludeIds = useMemo(() => getDescendantIds(task.id, allTasks), [task.id, allTasks]);

  const getStatusIcon = () => {
    switch (task.status) {
      case 'done':
        return <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-primary shrink-0 animate-pulse" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground shrink-0" />;
    }
  };

  const handlePickerSelect = (targetId: string) => {
    if (pickerMode === 'move-under') {
      onMoveUnderTask?.(task.id, targetId);
    } else {
      onCopyTask?.(task.id, undefined, targetId);
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "group flex items-center py-2 px-3 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-200 border border-transparent mb-1",
          deadlineInfo?.colorClass,
          task.status === 'done' && !deadlineInfo && "opacity-60",
          isSelected && "ring-2 ring-primary/50 bg-primary/5"
        )}
        style={{ marginLeft: `${depth * 20}px` }}
        onClick={selectionMode && onSelect ? () => onSelect(task.id) : undefined}
      >
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect?.(task.id)}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="mr-2 shrink-0"
          />
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 p-0 transition-opacity",
              !hasSubtasks && "opacity-0 pointer-events-none"
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          <div
            className="cursor-pointer flex items-center"
            onClick={() => onToggle(task.id)}
            title={`Status: ${task.status} (Click to cycle)`}
          >
            {getStatusIcon()}
          </div>

          <div className="flex flex-col min-w-0 flex-1 ml-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium truncate",
                  task.status === 'done' && "line-through text-muted-foreground",
                  task.status === 'in-progress' && "text-primary"
                )}
              >
                {task.title}
              </span>
              {task.deadline && (
                <div className={cn(
                  "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                  task.status === 'done' ? "text-accent bg-accent/10" :
                  (deadlineInfo?.isOverdue || deadlineInfo?.days === 0) ? "text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-300" :
                  deadlineInfo?.days !== undefined && deadlineInfo.days < 4 ? "text-fuchsia-700 bg-fuchsia-100 dark:bg-fuchsia-900/50 dark:text-fuchsia-300" :
                  deadlineInfo?.days !== undefined && deadlineInfo.days < 7 ? "text-sky-700 bg-sky-100 dark:bg-sky-900/50 dark:text-sky-300" :
                  "text-muted-foreground bg-muted"
                )}>
                  <Calendar className="w-2.5 h-2.5" />
                  {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>
            {task.description && (
              <span className="text-xs text-muted-foreground truncate">{task.description}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-accent hover:text-accent hover:bg-accent/10"
            onClick={() => onAddSubtask(task.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditTask(task)}>
                <Edit2 className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              {onCopyTask && (
                <DropdownMenuItem onClick={() => onCopyTask(task.id)}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onMoveUnderTask && (
                <DropdownMenuItem onClick={() => { setPickerMode('move-under'); setTimeout(() => setPickerOpen(true), 80); }}>
                  <ArrowRightToLine className="h-4 w-4 mr-2" /> Move under task…
                </DropdownMenuItem>
              )}
              {onCopyTask && (
                <DropdownMenuItem onClick={() => { setPickerMode('copy-under'); setTimeout(() => setPickerOpen(true), 80); }}>
                  <ArrowRightToLine className="h-4 w-4 mr-2" /> Copy under task…
                </DropdownMenuItem>
              )}
              {onMoveTask && categories && categories.length > 1 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderInput className="h-4 w-4 mr-2" /> Move to category
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {categories
                      .filter(c => c.id !== task.categoryId)
                      .map(c => (
                        <DropdownMenuItem key={c.id} onClick={() => onMoveTask(task.id, c.id)}>
                          <div className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: c.color }} />
                          <span>{c.name}</span>
                          <span className="ml-1.5 text-[10px] text-muted-foreground uppercase">{c.area}</span>
                        </DropdownMenuItem>
                      ))
                    }
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              {onCopyTask && categories && categories.length > 1 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Copy className="h-4 w-4 mr-2" /> Copy to category
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {categories.map(c => (
                      <DropdownMenuItem key={c.id} onClick={() => onCopyTask(task.id, c.id)}>
                        <div className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: c.color }} />
                        <span>{c.name}</span>
                        <span className="ml-1.5 text-[10px] text-muted-foreground uppercase">{c.area}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && hasSubtasks && (
        <div className="animate-accordion-down overflow-hidden">
          {sortedSubtaskIds.map(subId => (
            allTasks[subId] && (
              <TaskItem
                key={subId}
                task={allTasks[subId]}
                allTasks={allTasks}
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
                onSelect={onSelect}
                sortByDeadline={sortByDeadline}
                depth={depth + 1}
              />
            )
          ))}
        </div>
      )}

      {categories && (
        <TaskPickerDialog
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handlePickerSelect}
          excludeIds={excludeIds}
          tasks={allTasks}
          categories={categories}
          title={pickerMode === 'move-under' ? 'Move under task' : 'Copy under task'}
        />
      )}
    </div>
  );
}
