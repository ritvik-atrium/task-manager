"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Task } from '@/types/task';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, deadline: number) => void;
  taskToEdit?: Task;
}

export function TaskDialog({ isOpen, onClose, onSave, taskToEdit }: TaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || '');
        setDeadline(taskToEdit.deadline ? new Date(taskToEdit.deadline) : new Date());
      } else {
        setTitle('');
        setDescription('');
        setDeadline(new Date()); 
      }
    }
  }, [taskToEdit, isOpen]);

  const handleSave = () => {
    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }
    if (!deadline) {
      setError("Deadline is required.");
      return;
    }
    
    const t = title;
    const d = description;
    const dl = deadline.getTime();

    // Close first to ensure Radix cleanup happens before the heavy state re-render
    onClose();
    
    // Defer the save to avoid interaction locks
    setTimeout(() => {
      onSave(t, d, dl);
    }, 50);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="title" className="font-bold">Title *</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }} 
              placeholder="What needs to be done?"
              autoFocus
              className="rounded-xl border-muted-foreground/20 focus:ring-primary/20"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="font-bold">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Add some details..."
              className="rounded-xl border-muted-foreground/20 focus:ring-primary/20 min-h-[100px]"
            />
          </div>
          <div className="grid gap-2">
            <Label className="font-bold">Deadline *</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-11 rounded-xl border-muted-foreground/20 shadow-none hover:bg-muted/50 transition-colors",
                    !deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {deadline ? format(deadline, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={deadline}
                  onSelect={(date) => {
                    if (date) {
                      setDeadline(date);
                      if (error) setError(null);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold">Cancel</Button>
          <Button 
            onClick={handleSave} 
            className="rounded-xl font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
          >
            {taskToEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
