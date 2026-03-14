
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Task } from '@/types/task';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SubtaskSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  parentTask: Task | null;
  allTasks: Record<string, Task>;
  onConfirm: (selectedIds: string[]) => void;
}

export function SubtaskSelectionDialog({ 
  isOpen, 
  onClose, 
  parentTask, 
  allTasks, 
  onConfirm 
}: SubtaskSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const subtasks = parentTask?.subtaskIds
    .map(id => allTasks[id])
    .filter(Boolean) || [];

  useEffect(() => {
    if (isOpen && subtasks.length > 0) {
      // By default, select all completed subtasks
      setSelectedIds(subtasks.filter(t => t.status === 'done').map(t => t.id));
    }
  }, [isOpen, parentTask]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
  };

  if (!parentTask) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Subtasks to Reset</DialogTitle>
          <DialogDescription>
            Choose which subtasks of "{parentTask.title}" should be moved back to "New".
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[300px] pr-4 py-2">
          <div className="space-y-4">
            {subtasks.map((subtask) => (
              <div key={subtask.id} className="flex items-center space-x-3 space-y-0">
                <Checkbox 
                  id={`subtask-${subtask.id}`} 
                  checked={selectedIds.includes(subtask.id)}
                  onCheckedChange={() => handleToggle(subtask.id)}
                />
                <Label 
                  htmlFor={`subtask-${subtask.id}`}
                  className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {subtask.title}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Update Selection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
