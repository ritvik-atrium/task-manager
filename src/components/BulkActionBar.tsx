
"use client";

import React, { useState, useMemo } from 'react';
import { Task, Category } from '@/types/task';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FolderInput, Copy, ArrowRightToLine, X } from 'lucide-react';
import { TaskPickerDialog } from './TaskPickerDialog';

interface BulkActionBarProps {
  selectedIds: Set<string>;
  allTasks: Record<string, Task>;
  categories: Category[];
  onClear: () => void;
  onMoveToCategory: (categoryId: string) => void;
  onCopyToCategory: (categoryId: string) => void;
  onMoveUnderTask: (parentId: string) => void;
  onCopyUnderTask: (parentId: string) => void;
}

export function BulkActionBar({
  selectedIds,
  allTasks,
  categories,
  onClear,
  onMoveToCategory,
  onCopyToCategory,
  onMoveUnderTask,
  onCopyUnderTask,
}: BulkActionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'move' | 'copy'>('move');

  const excludeIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (id: string) => {
      ids.add(id);
      allTasks[id]?.subtaskIds.forEach(collect);
    };
    selectedIds.forEach(collect);
    return ids;
  }, [selectedIds, allTasks]);

  if (selectedIds.size === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-xl border border-primary/20 text-sm flex-wrap shrink-0">
        <span className="font-semibold text-primary shrink-0">{selectedIds.size} selected</span>
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-primary/30">
                <FolderInput className="w-3.5 h-3.5" /> Move to category
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => { onMoveToCategory(c.id); onClear(); }}>
                  <div className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: c.color }} />
                  <span>{c.name}</span>
                  <span className="ml-1.5 text-[10px] text-muted-foreground uppercase">{c.area}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-primary/30">
                <Copy className="w-3.5 h-3.5" /> Copy to category
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {categories.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => { onCopyToCategory(c.id); onClear(); }}>
                  <div className="w-2.5 h-2.5 rounded-full mr-2 shrink-0" style={{ backgroundColor: c.color }} />
                  <span>{c.name}</span>
                  <span className="ml-1.5 text-[10px] text-muted-foreground uppercase">{c.area}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-primary/30"
            onClick={() => { setPickerMode('move'); setTimeout(() => setPickerOpen(true), 80); }}
          >
            <ArrowRightToLine className="w-3.5 h-3.5" /> Move under task…
          </Button>

          <Button
            variant="outline" size="sm" className="h-7 text-xs gap-1.5 border-primary/30"
            onClick={() => { setPickerMode('copy'); setTimeout(() => setPickerOpen(true), 80); }}
          >
            <ArrowRightToLine className="w-3.5 h-3.5" /> Copy under task…
          </Button>
        </div>

        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClear}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <TaskPickerDialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={targetId => {
          if (pickerMode === 'move') onMoveUnderTask(targetId);
          else onCopyUnderTask(targetId);
          onClear();
        }}
        excludeIds={excludeIds}
        tasks={allTasks}
        categories={categories}
        title={pickerMode === 'move' ? 'Move tasks under…' : 'Copy tasks under…'}
      />
    </>
  );
}
