"use client";

import React, { useState } from 'react';
import { Task, Category } from '@/types/task';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Filter, CalendarIcon, ChevronDown, ArrowUpDown, X } from 'lucide-react';
import { format, addDays, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Filter state type ────────────────────────────────────────────────────────
export interface TaskFilterState {
  status: string[];      // [] means all; subset of ['todo', 'in-progress', 'done']
  deadline: string;      // 'All' | 'within1' | 'within7' | 'within30' | 'custom'
  deadlineStart?: Date;
  deadlineEnd?: Date;
  completedIn: string;   // 'All' | 'today' | 'within7' | 'within30' | 'custom'
  completedInStart?: Date;
  completedInEnd?: Date;
}

export const DEFAULT_DASH_FILTERS: TaskFilterState = { status: ['todo', 'in-progress'], deadline: 'All', completedIn: 'All' };
export const DEFAULT_CAT_FILTERS: TaskFilterState = { status: [], deadline: 'All', completedIn: 'All' };

// ─── Shared filter logic ──────────────────────────────────────────────────────
export function applyTaskFilters(tasks: Task[], filters: TaskFilterState): Task[] {
  const now = new Date();
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);

  return tasks.filter(t => {
    // Status
    if (filters.status.length > 0 && !filters.status.includes(t.status)) return false;

    // Deadline (future-focused)
    if (filters.deadline !== 'All') {
      if (!t.deadline) return false;
      const dl = new Date(t.deadline);
      if (filters.deadline === 'within1') {
        if (dl < today || dl > addDays(now, 1)) return false;
      } else if (filters.deadline === 'within7') {
        if (dl < today || dl > addDays(now, 7)) return false;
      } else if (filters.deadline === 'within30') {
        if (dl < today || dl > addDays(now, 30)) return false;
      } else if (filters.deadline === 'custom') {
        if (!filters.deadlineStart || !filters.deadlineEnd) return false;
        if (!isWithinInterval(dl, { start: startOfDay(filters.deadlineStart), end: endOfDay(filters.deadlineEnd) })) return false;
      }
    }

    // Completed In (past-focused — requires completedAt)
    if (filters.completedIn !== 'All') {
      if (!t.completedAt) return false;
      const ca = new Date(t.completedAt);
      if (filters.completedIn === 'today') {
        if (!isWithinInterval(ca, { start: today, end: todayEnd })) return false;
      } else if (filters.completedIn === 'within7') {
        if (!isWithinInterval(ca, { start: subDays(today, 6), end: todayEnd })) return false;
      } else if (filters.completedIn === 'within30') {
        if (!isWithinInterval(ca, { start: subDays(today, 29), end: todayEnd })) return false;
      } else if (filters.completedIn === 'custom') {
        if (!filters.completedInStart || !filters.completedInEnd) return false;
        if (!isWithinInterval(ca, { start: startOfDay(filters.completedInStart), end: endOfDay(filters.completedInEnd) })) return false;
      }
    }

    return true;
  });
}

// ─── Inline date range picker ─────────────────────────────────────────────────
interface DateRangePickerProps {
  label: string;
  start?: Date;
  end?: Date;
  onStartChange: (d: Date) => void;
  onEndChange: (d: Date) => void;
  futureOnly?: boolean;
  pastOnly?: boolean;
}

function DateRangePicker({ label, start, end, onStartChange, onEndChange, futureOnly, pastOnly }: DateRangePickerProps) {
  const today = startOfDay(new Date());
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 pl-1">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">{label}:</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 rounded-xl border-muted-foreground/20 text-xs gap-1.5 bg-white dark:bg-muted">
            <CalendarIcon className="w-3 h-3 text-primary" />
            {start ? format(start, 'MMM d, yyyy') : 'From date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={start}
            onSelect={(d) => { if (d) onStartChange(d); }}
            disabled={(date) => {
              if (futureOnly && date < today) return true;
              if (pastOnly && date > new Date()) return true;
              return false;
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <span className="text-xs text-muted-foreground">→</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 rounded-xl border-muted-foreground/20 text-xs gap-1.5 bg-white dark:bg-muted">
            <CalendarIcon className="w-3 h-3 text-primary" />
            {end ? format(end, 'MMM d, yyyy') : 'To date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={end}
            onSelect={(d) => { if (d) onEndChange(d); }}
            disabled={(date) => {
              if (futureOnly && date < today) return true;
              if (pastOnly && date > new Date()) return true;
              if (start && date < start) return true;
              return false;
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const LIFE_AREAS = ['Personal', 'Professional', 'Social', 'Spiritual'] as const;

// ─── Filter bar UI ────────────────────────────────────────────────────────────
export type SortBy = 'default' | 'deadline-asc' | 'deadline-desc';

interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (f: TaskFilterState) => void;
  categories?: Category[];        // dashboard only — enables category + area multi-select
  selectedCategories?: string[] | null;  // null means all; [] means none
  onCategoriesChange?: (ids: string[] | null) => void;
  selectedAreas?: string[] | null;       // null means all; [] means none
  onAreasChange?: (areas: string[] | null) => void;
  sortBy?: SortBy;
  onSortChange?: (s: SortBy) => void;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'New' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Completed' },
] as const;

export function TaskFilters({ filters, onChange, categories, selectedCategories, onCategoriesChange, selectedAreas, onAreasChange, sortBy, onSortChange }: TaskFiltersProps) {
  const [catOpen, setCatOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const update = (partial: Partial<TaskFilterState>) => onChange({ ...filters, ...partial });
  const allAreasSelected = selectedAreas === null || selectedAreas === undefined;
  const allStatusSelected = filters.status.length === 0;

  // Categories visible in the dropdown — restricted to selected areas
  const areaFilteredCategories = !categories ? undefined
    : allAreasSelected ? categories
    : categories.filter(c => (selectedAreas as string[]).includes(c.area));

  const allCatsSelected = selectedCategories === null || selectedCategories === undefined;

  const toggleStatus = (value: string) => {
    const cur = filters.status;
    const next = cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value];
    update({ status: next.length === STATUS_OPTIONS.length ? [] : next });
  };

  const toggleCat = (id: string) => {
    if (!onCategoriesChange || !areaFilteredCategories) return;
    const cur = allCatsSelected ? areaFilteredCategories.map(c => c.id) : (selectedCategories ?? []);
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    onCategoriesChange(next.length === areaFilteredCategories.length ? null : next);
  };

  const setAreas = (next: string[] | null) => {
    onAreasChange?.(next);
    // Reset category selection so it auto-follows the new area set
    onCategoriesChange?.(null);
  };

  const toggleArea = (area: string) => {
    if (!onAreasChange) return;
    const cur = allAreasSelected ? [...LIFE_AREAS] : (selectedAreas ?? []);
    const next = cur.includes(area) ? cur.filter(x => x !== area) : [...cur, area];
    setAreas(next.length === LIFE_AREAS.length ? null : next);
  };

  return (
    <div className="flex flex-col gap-2 bg-white/50 dark:bg-white/5 p-4 rounded-2xl border border-border/50 shrink-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Filters</span>
        </div>

        {/* Area multi-select (dashboard only) */}
        {onAreasChange && (
          <Popover open={areaOpen} onOpenChange={setAreaOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 px-3 rounded-xl border-none shadow-sm bg-white dark:bg-muted text-sm font-medium gap-1.5">
                {allAreasSelected ? 'All Areas' : selectedAreas?.length === 0 ? 'No Areas' : `${selectedAreas?.length} Area${(selectedAreas?.length ?? 0) > 1 ? 's' : ''}`}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted transition-colors text-sm cursor-pointer"
                onClick={() => { setAreas(allAreasSelected ? [] : null); setAreaOpen(false); }}
                onKeyDown={(e) => e.key === 'Enter' && setAreas(allAreasSelected ? [] : null)}
              >
                <Checkbox checked={allAreasSelected} onCheckedChange={() => setAreas(allAreasSelected ? [] : null)} />
                <span>All Areas</span>
              </div>
              {LIFE_AREAS.map(area => {
                const checked = allAreasSelected || (selectedAreas?.includes(area) ?? false);
                return (
                  <div
                    key={area}
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted transition-colors text-sm cursor-pointer"
                    onClick={() => toggleArea(area)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleArea(area)}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleArea(area)} />
                    <span>{area}</span>
                  </div>
                );
              })}
            </PopoverContent>
          </Popover>
        )}

        {/* Category multi-select (dashboard only) */}
        {categories && onCategoriesChange && (
          <Popover open={catOpen} onOpenChange={setCatOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 px-3 rounded-xl border-none shadow-sm bg-white dark:bg-muted text-sm font-medium gap-1.5">
                {allCatsSelected ? 'All Categories' : selectedCategories?.length === 0 ? 'No Categories' : `${selectedCategories?.length} Selected`}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div
                role="button"
                tabIndex={0}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted transition-colors text-sm cursor-pointer"
                onClick={() => { onCategoriesChange(allCatsSelected ? [] : null); setCatOpen(false); }}
                onKeyDown={(e) => e.key === 'Enter' && onCategoriesChange(allCatsSelected ? [] : null)}
              >
                <Checkbox checked={allCatsSelected} onCheckedChange={() => onCategoriesChange(allCatsSelected ? [] : null)} />
                <span>All Categories</span>
              </div>
              {(areaFilteredCategories ?? []).map(cat => {
                const checked = allCatsSelected || (selectedCategories?.includes(cat.id) ?? false);
                return (
                  <div
                    key={cat.id}
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted transition-colors text-sm cursor-pointer"
                    onClick={() => toggleCat(cat.id)}
                    onKeyDown={(e) => e.key === 'Enter' && toggleCat(cat.id)}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleCat(cat.id)} />
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate">{cat.name}</span>
                  </div>
                );
              })}
            </PopoverContent>
          </Popover>
        )}

        {/* Status multi-select */}
        <Popover open={statusOpen} onOpenChange={setStatusOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 px-3 rounded-xl border-none shadow-sm bg-white dark:bg-muted text-sm font-medium gap-1.5">
              {allStatusSelected ? 'All Statuses' : filters.status.length === 1
                ? STATUS_OPTIONS.find(o => o.value === filters.status[0])?.label
                : `${filters.status.length} Statuses`}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="start">
            <div
              role="button"
              tabIndex={0}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted transition-colors text-sm cursor-pointer"
              onClick={() => { update({ status: [] }); setStatusOpen(false); }}
              onKeyDown={(e) => e.key === 'Enter' && update({ status: [] })}
            >
              <Checkbox checked={allStatusSelected} onCheckedChange={() => update({ status: [] })} />
              <span>All Statuses</span>
            </div>
            {STATUS_OPTIONS.map(opt => {
              const checked = allStatusSelected || filters.status.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted transition-colors text-sm cursor-pointer"
                  onClick={() => toggleStatus(opt.value)}
                  onKeyDown={(e) => e.key === 'Enter' && toggleStatus(opt.value)}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleStatus(opt.value)} />
                  <span>{opt.label}</span>
                </div>
              );
            })}
          </PopoverContent>
        </Popover>

        {/* Deadline (future) */}
        <div className="flex items-center gap-1">
          <Select value={filters.deadline} onValueChange={(v) => update({ deadline: v, deadlineStart: undefined, deadlineEnd: undefined })}>
            <SelectTrigger className={cn("w-44 h-9 rounded-xl border-none shadow-sm bg-white dark:bg-muted", filters.deadline === 'custom' && "ring-2 ring-primary/30")}>
              <SelectValue placeholder="Deadline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Any Deadline</SelectItem>
              <SelectItem value="within1">Within 1 Day</SelectItem>
              <SelectItem value="within7">Within a Week</SelectItem>
              <SelectItem value="within30">Within a Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {filters.deadline !== 'All' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => update({ deadline: 'All', deadlineStart: undefined, deadlineEnd: undefined })}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Completed In (past) */}
        <div className="flex items-center gap-1">
          <Select value={filters.completedIn} onValueChange={(v) => update({ completedIn: v, completedInStart: undefined, completedInEnd: undefined })}>
            <SelectTrigger className={cn("w-48 h-9 rounded-xl border-none shadow-sm bg-white dark:bg-muted", filters.completedIn === 'custom' && "ring-2 ring-primary/30")}>
              <SelectValue placeholder="Completed In" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Any Time Completed</SelectItem>
              <SelectItem value="today">Completed Today</SelectItem>
              <SelectItem value="within7">Completed This Week</SelectItem>
              <SelectItem value="within30">Completed This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {filters.completedIn !== 'All' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => update({ completedIn: 'All', completedInStart: undefined, completedInEnd: undefined })}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Sort (dashboard only) */}
        {onSortChange && sortBy && (
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortBy)}>
              <SelectTrigger className="h-9 text-sm w-44 rounded-xl border-none shadow-sm bg-white dark:bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline-asc">Closest deadline first</SelectItem>
                <SelectItem value="deadline-desc">Farthest deadline first</SelectItem>
                <SelectItem value="default">Default order</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Deadline custom range */}
      {filters.deadline === 'custom' && (
        <DateRangePicker
          label="Deadline range"
          start={filters.deadlineStart}
          end={filters.deadlineEnd}
          onStartChange={(d) => update({ deadlineStart: d })}
          onEndChange={(d) => update({ deadlineEnd: d })}
          futureOnly
        />
      )}

      {/* Completed In custom range */}
      {filters.completedIn === 'custom' && (
        <DateRangePicker
          label="Completed range"
          start={filters.completedInStart}
          end={filters.completedInEnd}
          onStartChange={(d) => update({ completedInStart: d })}
          onEndChange={(d) => update({ completedInEnd: d })}
          pastOnly
        />
      )}
    </div>
  );
}
