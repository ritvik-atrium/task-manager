
"use client";

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task, Category } from '@/types/task';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (taskId: string) => void;
  excludeIds: Set<string>;
  tasks: Record<string, Task>;
  categories: Category[];
  title: string;
}

export function TaskPickerDialog({ isOpen, onClose, onSelect, excludeIds, tasks, categories, title }: TaskPickerDialogProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const map = new Map<string, Task[]>();
    Object.values(tasks)
      .filter(t => !excludeIds.has(t.id) && t.title.toLowerCase().includes(q))
      .forEach(t => {
        if (!map.has(t.categoryId)) map.set(t.categoryId, []);
        map.get(t.categoryId)!.push(t);
      });
    return map;
  }, [tasks, excludeIds, search]);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    setSelected(null);
    setSearch('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()} modal>
      <DialogContent className="sm:max-w-[480px]" onCloseAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-[360px] pr-2">
          {grouped.size === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No tasks found</p>
          ) : (
            <div className="space-y-4 py-1">
              {Array.from(grouped.entries()).map(([catId, catTasks]) => {
                const cat = catMap.get(catId);
                return (
                  <div key={catId}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat?.color }} />
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{cat?.name ?? catId}</span>
                    </div>
                    <div className="space-y-0.5">
                      {catTasks.map(task => (
                        <button
                          key={task.id}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2",
                            selected === task.id
                              ? "bg-primary/15 text-primary font-medium"
                              : "hover:bg-muted"
                          )}
                          onClick={() => setSelected(task.id)}
                        >
                          {task.parentId && <span className="text-muted-foreground text-xs shrink-0">↳</span>}
                          <span className="flex-1 truncate">{task.title}</span>
                          {selected === task.id && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selected}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
