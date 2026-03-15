"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';
import { TaskItem } from '@/components/TaskItem';
import { TaskDialog } from '@/components/TaskDialog';
import { CategoryDialog } from '@/components/CategoryDialog';
import { SubtaskSelectionDialog } from '@/components/SubtaskSelectionDialog';
import { DashboardQuadrant } from '@/components/DashboardQuadrant';
import { ParallelView } from '@/components/ParallelView';
import { CategoryView } from '@/components/CategoryView';
import { AreaView } from '@/components/AreaView';
import { TaskFilters, TaskFilterState, DEFAULT_DASH_FILTERS, applyTaskFilters } from '@/components/TaskFilters';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FolderPlus,
  Settings2,
  Download,
  Upload,
  ListTodo,
  Search,
  LayoutGrid,
  ChevronRight,
  Columns,
  Grid2X2,
  List,
  Pencil,
  Trash2,
  Moon,
  Sun,
  ChevronDown,
  GripVertical
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Task, Category, TaskStatus, LifeArea } from '@/types/task';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function TaskNest() {
  const {
    tasks,
    categories,
    activeCategoryId,
    setActiveCategoryId,
    addTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    setMultipleTasksStatus,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    exportToJson,
    importFromJson,
    isLoaded
  } = useTasks();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | undefined>();
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const [view, setView] = useState<'dashboard' | 'category' | 'area'>('dashboard');
  const [dashboardView, setDashboardView] = useState<'parallel' | 'list' | 'quadrant'>('parallel');
  const [activeArea, setActiveArea] = useState<LifeArea | null>(null);
  const [dashFilters, setDashFilters] = useState<TaskFilterState>(DEFAULT_DASH_FILTERS);
  const [dashSelectedCategories, setDashSelectedCategories] = useState<string[] | null>(null);
  const [dashSelectedAreas, setDashSelectedAreas] = useState<string[] | null>(null);
  
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>();
  const [pendingParentId, setPendingParentId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isUnmarkPromptOpen, setIsUnmarkPromptOpen] = useState(false);
  const [unmarkTargetId, setUnmarkTargetId] = useState<string | null>(null);

  const dragCatRef = useRef<string | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);

  const handleCatDragStart = useCallback((e: React.DragEvent, id: string) => {
    dragCatRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleCatDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCatId(id);
  }, []);

  const handleCatDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverCatId(null);
    const srcId = dragCatRef.current;
    if (!srcId || srcId === targetId) return;
    const ids = categories.map(c => c.id);
    const from = ids.indexOf(srcId);
    const to = ids.indexOf(targetId);
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, srcId);
    reorderCategories(next);
    dragCatRef.current = null;
  }, [categories, reorderCategories]);

  const handleCatDragEnd = useCallback(() => {
    setDragOverCatId(null);
    dragCatRef.current = null;
  }, []);

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const dark = saved !== 'light';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);
  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const activeCategory = useMemo(() => 
    categories.find(c => c.id === activeCategoryId) || categories[0],
    [categories, activeCategoryId]
  );

  const allCategoriesWithTasks = useMemo(() => {
    return categories
      .filter(cat =>
        (!dashSelectedAreas || dashSelectedAreas.includes(cat.area)) &&
        (!dashSelectedCategories || dashSelectedCategories.includes(cat.id))
      )
      .map(cat => {
        const allCatTasks = Object.values(tasks).filter(t => t.categoryId === cat.id);
        const roots = searchQuery
          ? allCatTasks.filter(t =>
              t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              t.description?.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : allCatTasks.filter(t => !t.parentId);
        return { category: cat, tasks: applyTaskFilters(roots as Task[], dashFilters) };
      });
  }, [tasks, categories, searchQuery, dashFilters, dashSelectedCategories]);

  const stats = useMemo(() => {
    const all = Object.values(tasks);
    const completed = all.filter(t => t.status === 'done').length;
    const inProgress = all.filter(t => t.status === 'in-progress').length;
    const newCount = all.filter(t => t.status === 'todo').length;
    return {
      all: all.length,
      completed,
      inProgress,
      newCount,
      progress: all.length ? Math.round((completed / all.length) * 100) : 0
    };
  }, [tasks]);

  const handleToggleTaskStatus = useCallback((id: string) => {
    const task = tasks[id];
    if (!task) return;
    const currentStatus = task.status || 'todo';
    let nextStatus: TaskStatus;
    if (currentStatus === 'todo') nextStatus = 'in-progress';
    else if (currentStatus === 'in-progress') nextStatus = 'done';
    else nextStatus = 'todo';

    if (currentStatus === 'done' && nextStatus === 'todo' && task.subtaskIds.length > 0) {
      setUnmarkTargetId(id);
      setIsUnmarkPromptOpen(true);
    } else {
      setTaskStatus(id, nextStatus);
    }
  }, [tasks, setTaskStatus]);

  const confirmUnmarkAll = () => {
    if (unmarkTargetId) {
      const targetId = unmarkTargetId;
      setIsUnmarkPromptOpen(false);
      setTimeout(() => {
        setTaskStatus(targetId, 'todo', true);
        setUnmarkTargetId(null);
      }, 150);
    }
  };

  const confirmUnmarkNone = () => {
    if (unmarkTargetId) {
      const targetId = unmarkTargetId;
      setIsUnmarkPromptOpen(false);
      setTimeout(() => {
        setTaskStatus(targetId, 'todo', false);
        setUnmarkTargetId(null);
      }, 150);
    }
  };

  const openSelectionDialog = () => {
    setIsUnmarkPromptOpen(false);
    setTimeout(() => setIsSelectionDialogOpen(true), 250);
  };

  const handlePartialUnmark = (selectedIds: string[]) => {
    if (unmarkTargetId) {
      const targetId = unmarkTargetId;
      setIsSelectionDialogOpen(false);
      setTimeout(() => {
        const updates = [
          { id: targetId, status: 'todo' as TaskStatus, recursive: false },
          ...selectedIds.map(id => ({ id, status: 'todo' as TaskStatus, recursive: true }))
        ];
        setMultipleTasksStatus(updates);
        setUnmarkTargetId(null);
      }, 200);
    }
  };

  const handleAddTask = (parentId?: string) => {
    setTaskToEdit(undefined);
    setPendingParentId(parentId);
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setPendingParentId(undefined);
    setIsTaskDialogOpen(true);
  };

  const saveTask = (title: string, description: string, deadline: number, categoryId: string) => {
    if (taskToEdit) {
      updateTask(taskToEdit.id, { title, description, deadline });
    } else if (pendingParentId) {
      // subtask — inherit parent's category
      const parentCatId = tasks[pendingParentId]?.categoryId ?? activeCategory?.id;
      addTask(title, pendingParentId, parentCatId, description, deadline);
    } else {
      addTask(title, undefined, categoryId, description, deadline);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (importFromJson(content)) alert("Import successful!");
        else alert("Invalid JSON file.");
      };
      reader.readAsText(file);
    }
  };

  if (!isLoaded) return null;

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <Sidebar className="border-r border-border/50 bg-white/30 dark:bg-card/80 backdrop-blur-xl">
          <SidebarHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                  <ListTodo className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight text-primary truncate">TaskNest</h1>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Productivity Nest</p>
                </div>
              </div>
              <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary shrink-0" />
            </div>
          </SidebarHeader>

          <SidebarContent className="px-4">
            <SidebarGroup>
              <div className="flex items-center justify-between mb-2">
                <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider">Categories</SidebarGroupLabel>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-primary/10 text-primary"
                  onClick={() => setIsCategoryDialogOpen(true)}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <SidebarMenu>
                {categories.map((cat) => (
                  <SidebarMenuItem
                    key={cat.id}
                    draggable
                    onDragStart={(e) => handleCatDragStart(e, cat.id)}
                    onDragOver={(e) => handleCatDragOver(e, cat.id)}
                    onDrop={(e) => handleCatDrop(e, cat.id)}
                    onDragEnd={handleCatDragEnd}
                    className={dragOverCatId === cat.id ? 'opacity-50 ring-1 ring-primary/40 rounded-lg' : ''}
                  >
                    <div className="group/cat flex items-center gap-1 rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="pl-1 opacity-0 group-hover/cat:opacity-40 cursor-grab active:cursor-grabbing shrink-0">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <SidebarMenuButton
                        isActive={activeCategoryId === cat.id}
                        onClick={() => { setActiveCategoryId(cat.id); setView('category'); }}
                        className="flex-1 flex items-center gap-3 py-5 rounded-lg"
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium text-xs truncate">{cat.name}</span>
                          <span className="text-[8px] uppercase tracking-tighter opacity-50 font-bold truncate">{cat.area}</span>
                        </div>
                        <Badge variant="secondary" className="bg-muted text-[10px] font-bold shrink-0">
                          {Object.values(tasks).filter(t => t.categoryId === cat.id).length}
                        </Badge>
                      </SidebarMenuButton>
                      <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover/cat:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setCategoryToEdit(cat); setIsCategoryDialogOpen(true); }}
                          className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteCategoryId(cat.id); }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 mt-auto">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="w-full text-xs gap-2 px-1" onClick={exportToJson}>
                <Download className="w-3 h-3" /> Backup
              </Button>
              <div className="relative">
                <input 
                  type="file" 
                  className="hidden" 
                  id="import-json-main" 
                  accept=".json"
                  onChange={handleImport}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs gap-2 px-1"
                  onClick={() => document.getElementById('import-json-main')?.click()}
                >
                  <Upload className="w-3 h-3" /> Restore
                </Button>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-background p-4 sm:p-6 lg:p-10 overflow-hidden min-w-0">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10 shrink-0 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-primary font-semibold mb-1">
                <SidebarTrigger className="h-7 w-7 text-primary hover:bg-primary/10 shrink-0" />
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span className="text-sm uppercase tracking-widest truncate">
                  {view === 'category' ? 'Category' : view === 'area' ? 'Area of Life' : dashboardView === 'list' ? 'List View' : dashboardView === 'quadrant' ? 'Quadrant View' : 'Parallel View'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                {view === 'category' ? (activeCategory?.name ?? 'Category') : view === 'area' ? (activeArea ?? 'Area') : dashboardView === 'list' ? 'All Tasks' : dashboardView === 'quadrant' ? 'Priority Matrix' : 'Scheduling Board'}
              </h2>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 min-w-0">
              {view === 'dashboard' ? (
                <>
                  <Tabs value={dashboardView} onValueChange={(v) => setDashboardView(v as any)} className="w-full sm:w-auto">
                    <TabsList className="bg-white/50 dark:bg-white/10 backdrop-blur-sm p-1 h-11 rounded-xl w-full flex">
                      <TabsTrigger value="parallel" className="flex-1 rounded-lg h-9 gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Columns className="w-4 h-4" /> <span className="hidden xs:inline">Parallel</span>
                      </TabsTrigger>
                      <TabsTrigger value="list" className="flex-1 rounded-lg h-9 gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                        <List className="w-4 h-4" /> <span className="hidden xs:inline">List</span>
                      </TabsTrigger>
                      <TabsTrigger value="quadrant" className="flex-1 rounded-lg h-9 gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Grid2X2 className="w-4 h-4" /> <span className="hidden xs:inline">Quadrant</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {dashboardView === 'list' && (
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tasks..."
                        className="pl-9 h-11 bg-white dark:bg-muted border-none shadow-sm rounded-xl focus:ring-2 focus:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  )}
                </>
              ) : (
                <Button variant="outline" size="sm" className="h-11 px-4 gap-2 rounded-xl bg-white/50 dark:bg-white/10 border-none" onClick={() => setView('dashboard')}>
                  <ChevronDown className="w-4 h-4 rotate-90" /> Dashboard
                </Button>
              )}
              
              <Button
                variant="outline"
                size="icon"
                onClick={toggleDark}
                className="h-11 w-11 rounded-xl border-none shadow-sm bg-white/50 dark:bg-white/10 shrink-0"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              <Button
                onClick={() => handleAddTask()}
                className="h-11 px-6 gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95 rounded-xl font-semibold w-full sm:w-auto shrink-0"
              >
                <Plus className="w-5 h-5" />
                Add Task
              </Button>
            </div>
          </header>

          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {view === 'dashboard' && dashboardView === 'list' && (
              <>
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4 mb-8 shrink-0">
                  <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">New</p>
                    <p className="text-2xl font-bold">{stats.newCount}</p>
                  </div>
                  <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">In Progress</p>
                    <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
                  </div>
                  <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-accent">{stats.completed}</p>
                      <p className="text-sm text-muted-foreground">of {stats.all}</p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-card p-4 rounded-2xl shadow-sm border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Success Rate</p>
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-bold">{stats.progress}%</p>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent transition-all duration-700" style={{ width: `${stats.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <TaskFilters
                  filters={dashFilters}
                  onChange={setDashFilters}
                  categories={categories}
                  selectedCategories={dashSelectedCategories}
                  onCategoriesChange={setDashSelectedCategories}
                  selectedAreas={dashSelectedAreas}
                  onAreasChange={setDashSelectedAreas}
                />
                <div className="flex-1 bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-border/50 overflow-auto min-w-0 mt-4">
                  <div className="space-y-8">
                    {allCategoriesWithTasks.map(({ category, tasks: catTasks }) => (
                      <div key={category.id}>
                        <button
                          className="flex items-center gap-2 mb-3 hover:opacity-70 transition-opacity cursor-pointer"
                          onClick={() => { setActiveCategoryId(category.id); setView('category'); }}
                        >
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{category.name}</h3>
                          <span className="text-xs text-muted-foreground">({catTasks.length})</span>
                        </button>
                        {catTasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground pl-5 italic">No tasks</p>
                        ) : (
                          <div className="space-y-1">
                            {catTasks.map(task => (
                              <TaskItem
                                key={task.id}
                                task={task}
                                allTasks={tasks}
                                onToggle={handleToggleTaskStatus}
                                onDelete={deleteTask}
                                onAddSubtask={handleAddTask}
                                onEditTask={handleEditTask}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {view === 'dashboard' && dashboardView === 'quadrant' && (
              <div className="flex-1 overflow-auto min-w-0">
                <DashboardQuadrant
                  tasks={tasks}
                  categories={categories}
                  onAreaClick={(area: LifeArea) => { setActiveArea(area); setView('area'); }}
                />
              </div>
            )}

            {view === 'dashboard' && dashboardView === 'parallel' && (
              <div className="flex-1 overflow-hidden min-w-0">
                <ParallelView
                  tasks={tasks}
                  categories={categories}
                  onToggle={handleToggleTaskStatus}
                  onDelete={deleteTask}
                  onAddSubtask={handleAddTask}
                  onEditTask={handleEditTask}
                  onCategoryClick={(catId) => { setActiveCategoryId(catId); setView('category'); }}
                />
              </div>
            )}

            {view === 'category' && activeCategory && (
              <div className="flex-1 overflow-hidden min-w-0">
                <CategoryView
                  category={activeCategory}
                  tasks={tasks}
                  onBack={() => setView('dashboard')}
                  onToggle={handleToggleTaskStatus}
                  onDelete={deleteTask}
                  onAddSubtask={handleAddTask}
                  onEditTask={handleEditTask}
                />
              </div>
            )}

            {view === 'area' && activeArea && (
              <div className="flex-1 overflow-hidden min-w-0">
                <AreaView
                  area={activeArea}
                  categories={categories}
                  tasks={tasks}
                  onBack={() => setView('dashboard')}
                  onToggle={handleToggleTaskStatus}
                  onDelete={deleteTask}
                  onAddSubtask={handleAddTask}
                  onEditTask={handleEditTask}
                />
              </div>
            )}
          </div>
        </main>

        <TaskDialog
          isOpen={isTaskDialogOpen}
          onClose={() => setIsTaskDialogOpen(false)}
          onSave={saveTask}
          taskToEdit={taskToEdit}
          categories={!taskToEdit && !pendingParentId ? categories : undefined}
          defaultCategoryId={view === 'category' ? activeCategory?.id : categories[0]?.id}
        />

        <CategoryDialog
          isOpen={isCategoryDialogOpen}
          onClose={() => { setIsCategoryDialogOpen(false); setCategoryToEdit(undefined); }}
          onSave={(name, color, area) => {
            if (categoryToEdit) updateCategory(categoryToEdit.id, name, color, area);
            else addCategory(name, color, area);
          }}
          categoryToEdit={categoryToEdit}
        />

        <AlertDialog open={!!deleteCategoryId} onOpenChange={(open) => { if (!open) setDeleteCategoryId(null); }}>
          <AlertDialogContent className="sm:max-w-[400px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the category and all its tasks. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setDeleteCategoryId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => { if (deleteCategoryId) deleteCategory(deleteCategoryId); setDeleteCategoryId(null); }}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <SubtaskSelectionDialog
          isOpen={isSelectionDialogOpen}
          onClose={() => setIsSelectionDialogOpen(false)}
          parentTask={unmarkTargetId ? tasks[unmarkTargetId] : null}
          allTasks={tasks}
          onConfirm={handlePartialUnmark}
        />

        <AlertDialog open={isUnmarkPromptOpen} onOpenChange={(open) => {
          setIsUnmarkPromptOpen(open);
          if (!open) setUnmarkTargetId(null);
        }}>
          <AlertDialogContent className="sm:max-w-[450px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Subtasks?</AlertDialogTitle>
              <AlertDialogDescription>
                You're moving a completed task back to active. How would you like to handle its subtasks?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" className="sm:flex-1" onClick={confirmUnmarkNone}>Keep Done</Button>
              <Button variant="secondary" className="sm:flex-1" onClick={openSelectionDialog}>Choose Specific...</Button>
              <Button className="sm:flex-1" onClick={confirmUnmarkAll}>Reset All</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
}
