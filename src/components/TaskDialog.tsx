
"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Task } from '@/types/task';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
  taskToEdit?: Task;
}

export function TaskDialog({ isOpen, onClose, onSave, taskToEdit }: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
  }, [taskToEdit, isOpen]);

  const handleSave = () => {
    if (title.trim()) {
      onSave(title, description);
      setTitle('');
      setDescription('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="What needs to be done?"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Add some details..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{taskToEdit ? 'Save Changes' : 'Create Task'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
