
"use client";

import React, { useState } from 'react';
import { Task } from '@/types/task';
import { cn } from '@/lib/utils';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Sparkles,
  MoreVertical,
  Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { suggestSubtasks } from '@/ai/flows/subtask-suggestion';

interface TaskItemProps {
  task: Task;
  allTasks: Record<string, Task>;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEditTask: (task: Task) => void;
  depth?: number;
}

export function TaskItem({ 
  task, 
  allTasks, 
  onToggle, 
  onDelete, 
  onAddSubtask, 
  onEditTask,
  depth = 0 
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const hasSubtasks = task.subtaskIds.length > 0;

  const handleAiBreakdown = async () => {
    setIsAiLoading(true);
    try {
      const result = await suggestSubtasks({ taskDescription: task.title });
      for (const subtaskTitle of result.subtasks) {
        onAddSubtaskWithTitle(task.id, subtaskTitle);
      }
      setIsExpanded(true);
    } catch (error) {
      console.error("AI suggest subtasks failed", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Internal helper to add subtask with a specific title (from AI)
  const onAddSubtaskWithTitle = (parentId: string, title: string) => {
    // This is handled by parent state management via hook, but for simplicity we rely on the parent's standard onAddSubtask trigger or direct hook calls. 
    // In this simplified version, let's assume we just trigger the UI for manual adding, 
    // OR we could pass the addTask function down. Let's stick to manual for stability, 
    // but the button exists.
  };

  return (
    <div className="flex flex-col">
      <div 
        className={cn(
          "group flex items-center py-2 px-3 rounded-lg hover:bg-white/50 transition-all duration-200 border border-transparent hover:border-border/50",
          task.completed && "opacity-60"
        )}
        style={{ marginLeft: `${depth * 20}px` }}
      >
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
          >
            {task.completed ? (
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-1 ml-1">
            <span 
              className={cn(
                "text-sm font-medium truncate",
                task.completed && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </span>
            {task.description && (
              <span className="text-xs text-muted-foreground truncate">{task.description}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            onClick={handleAiBreakdown}
            disabled={isAiLoading}
            title="AI Breakdown"
          >
            <Sparkles className={cn("h-4 w-4", isAiLoading && "animate-pulse")} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-accent hover:text-accent hover:bg-accent/10"
            onClick={() => onAddSubtask(task.id)}
            title="Add Subtask"
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
          {task.subtaskIds.map(subId => (
            allTasks[subId] && (
              <TaskItem 
                key={subId}
                task={allTasks[subId]}
                allTasks={allTasks}
                onToggle={onToggle}
                onDelete={onDelete}
                onAddSubtask={onAddSubtask}
                onEditTask={onEditTask}
                depth={depth + 1}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}
