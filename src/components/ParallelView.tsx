
"use client";

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Task, Category } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { Clock, ChevronsRight } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { TaskFilters, TaskFilterState, DEFAULT_DASH_FILTERS, applyTaskFilters } from './TaskFilters';

interface ParallelViewProps {
  tasks: Record<string, Task>;
  categories: Category[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string) => void;
  onEditTask: (task: Task) => void;
  onCategoryClick?: (catId: string) => void;
}

export function ParallelView({ tasks, categories, onToggle, onDelete, onAddSubtask, onEditTask, onCategoryClick }: ParallelViewProps) {
  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_DASH_FILTERS);
  const [selectedCategories, setSelectedCategories] = useState<string[] | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[] | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [showRightFade, setShowRightFade] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ catId: string; startX: number; startWidth: number } | null>(null);

  const getColumnWidth = (catId: string) => columnWidths[catId] ?? 320;

  const onResizeStart = useCallback((e: React.MouseEvent, catId: string, currentWidth: number) => {
    e.preventDefault();
    dragRef.current = { catId, startX: e.clientX, startWidth: currentWidth };

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      const newWidth = Math.max(200, Math.min(600, dragRef.current.startWidth + delta));
      setColumnWidths(prev => ({ ...prev, [dragRef.current!.catId]: newWidth }));
    };

    const onMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const visibleCategories = useMemo(() => {
    return categories.filter(c =>
      (!selectedAreas || selectedAreas.includes(c.area)) &&
      (!selectedCategories || selectedCategories.includes(c.id))
    );
  }, [categories, selectedCategories, selectedAreas]);

  const getFilteredTasks = (catId: string) => {
    const catTasks = Object.values(tasks).filter(t => t.categoryId === catId && !t.parentId);
    return applyTaskFilters(catTasks, filters);
  };

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const t = setTimeout(checkScroll, 50);
    return () => clearTimeout(t);
  }, [visibleCategories, columnWidths, checkScroll]);

  return (
    <div className="flex flex-col h-full gap-6 overflow-hidden">
      <TaskFilters
        filters={filters}
        onChange={setFilters}
        categories={categories}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedAreas={selectedAreas}
        onAreasChange={setSelectedAreas}
      />

      {/* Scrollable columns with right-fade scroll hint */}
      <div className="relative flex-1 min-h-0">
        {showRightFade && (
          <div className="absolute right-0 top-0 bottom-4 w-20 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none flex items-center justify-end pr-2">
            <ChevronsRight className="w-5 h-5 text-muted-foreground/60 animate-pulse" />
          </div>
        )}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="h-full overflow-x-auto overflow-y-auto rounded-2xl"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="flex items-start pb-6 pr-6 min-h-full w-max">
            {visibleCategories.map(cat => {
              const catTasks = getFilteredTasks(cat.id);
              if (catTasks.length === 0 && !selectedCategories) return null;
              const colWidth = getColumnWidth(cat.id);

              return (
                <div key={cat.id} className="relative shrink-0 flex flex-col gap-4 mr-6" style={{ width: colWidth }}>
                  <div className="flex items-center justify-between px-2">
                    <button
                      className="flex items-center gap-2 min-w-0 hover:opacity-70 transition-opacity cursor-pointer"
                      onClick={() => onCategoryClick?.(cat.id)}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <h3 className="font-bold text-foreground truncate max-w-[160px]">{cat.name}</h3>
                    </button>
                    <Badge className="bg-muted text-muted-foreground text-[10px] font-black uppercase shrink-0">
                      {catTasks.length}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-2 p-3 bg-white/40 dark:bg-white/5 rounded-2xl border border-border/50 min-h-[100px]">
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
                        <p className="text-[10px] font-bold uppercase tracking-widest">No Tasks</p>
                      </div>
                    )}
                  </div>

                  {/* Drag-to-resize handle */}
                  <div
                    className="absolute top-0 bottom-0 -right-6 w-6 flex items-stretch justify-center group cursor-col-resize z-20"
                    onMouseDown={(e) => onResizeStart(e, cat.id, colWidth)}
                  >
                    <div className="w-px bg-border/50 group-hover:bg-primary/60 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
