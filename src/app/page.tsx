
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { TaskItem } from '@/components/TaskItem';
import { TaskDialog } from '@/components/TaskDialog';
import { CategoryDialog } from '@/components/CategoryDialog';
import { SubtaskSelectionDialog } from '@/components/SubtaskSelectionDialog';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  FolderPlus, 
  Settings2, 
  Download, 
  Upload, 
  ListTodo, 
  Search,
  CheckCircle,
  LayoutGrid,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Task, TaskStatus } from '@/types/task';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    deleteCategory,
    exportToJson,
    importFromJson,
    isLoaded
  } = useTasks();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>();
  const [pendingParentId, setPendingParentId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  
  // States for the recursive unmark prompt
  const [isUnmarkPromptOpen, setIsUnmarkPromptOpen] = useState(false);
  const [unmarkTargetId, setUnmarkTargetId] = useState<string | null>(null);

  const activeCategory = useMemo(() => 
    categories.find(c => c.id === activeCategoryId) || categories[0],
    [categories, activeCategoryId]
  );

  const filteredRootTasks = useMemo(() => {
    if (!activeCategory) return [];
    
    const categoryTasks = Object.values(tasks).filter(t => 
      t.categoryId === activeCategory.id && !t.parentId
    );

    if (!searchQuery) return categoryTasks;

    return Object.values(tasks).filter(t => 
      t.categoryId === activeCategory.id && 
      (t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       t.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [tasks, activeCategory, searchQuery]);

  const stats = useMemo(() => {
    const all = Object.values(tasks).filter(t => t.categoryId === activeCategory?.id);
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
  }, [tasks, activeCategory]);

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
      setTaskStatus(targetId, 'todo', true);
      setUnmarkTargetId(null);
    }
  };

  const confirmUnmarkNone = () => {
    if (unmarkTargetId) {
      const targetId = unmarkTargetId;
      setIsUnmarkPromptOpen(false);
      setTaskStatus(targetId, 'todo', false);
      setUnmarkTargetId(null);
    }
  };

  const openSelectionDialog = () => {
    setIsUnmarkPromptOpen(false);
    // Use a small timeout to ensure the AlertDialog closes completely before opening the next dialog
    // This prevents focus trapping and "unclickable" issues in Radix UI
    setTimeout(() => {
      setIsSelectionDialogOpen(true);
    }, 150);
  };

  const handlePartialUnmark = (selectedIds: string[]) => {
    if (unmarkTargetId) {
      const targetId = unmarkTargetId;
      setIsSelectionDialogOpen(false);
      
      const updates = [
        { id: targetId, status: 'todo' as TaskStatus, recursive: false },
        ...selectedIds.map(id => ({ id, status: 'todo' as TaskStatus, recursive: false }))
      ];
      
      setMultipleTasksStatus(updates);
      setUnmarkTargetId(null);
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

  const saveTask = (title: string, description: string) => {
    if (taskToEdit) {
      updateTask(taskToEdit.id, { title, description });
    } else {
      addTask(title, pendingParentId, activeCategory?.id, description);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (importFromJson(content)) {
          alert("Import successful!");
        } else {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isLoaded) return null;

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <Sidebar className="border-r border-border/50 bg-white/30 backdrop-blur-xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <ListTodo className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-primary">TaskNest</h1>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Productivity Nest</p>
              </div>
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
                  <SidebarMenuItem key={cat.id}>
                    <SidebarMenuButton 
                      isActive={activeCategoryId === cat.id || (!activeCategoryId && categories[0]?.id === cat.id)}
                      onClick={() => setActiveCategoryId(cat.id)}
                      className="group flex items-center gap-3 rounded-lg py-5"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="flex-1 font-medium">{cat.name}</span>
                      <Badge variant="secondary" className="bg-muted text-[10px] font-bold">
                        {Object.values(tasks).filter(t => t.categoryId === cat.id).length}
                      </Badge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 mt-auto">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={exportToJson}>
                <Download className="w-3 h-3" /> Backup
              </Button>
              <div className="relative">
                <Input 
                  type="file" 
                  className="hidden" 
                  id="import-json" 
                  accept=".json"
                  onChange={handleImport}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs gap-2"
                  onClick={() => document.getElementById('import-json')?.click()}
                >
                  <Upload className="w-3 h-3" /> Restore
                </Button>
              </div>
            </div>
            <Separator className="my-4 opacity-50" />
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <Settings2 className="w-3.5 h-3.5" />
              <span>v1.0.5 Stable</span>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-background p-6 lg:p-10 overflow-auto">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold mb-1">
                <LayoutGrid className="w-4 h-4" />
                <span className="text-sm uppercase tracking-widest">{activeCategory?.name || 'All Tasks'}</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                My Workspace
              </h2>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search tasks..." 
                  className="pl-9 h-11 bg-white border-none shadow-sm rounded-xl focus:ring-2 focus:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                onClick={() => handleAddTask()}
                className="h-11 px-6 gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95 rounded-xl font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add New Task
              </Button>
            </div>
          </header>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">New</p>
                <p className="text-2xl font-bold">{stats.newCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">In Progress</p>
                <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-accent">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">of {stats.all}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Success Rate</p>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-bold">{stats.progress}%</p>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-700 ease-out" 
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-3xl p-6 lg:p-8 shadow-sm border border-border/50 overflow-auto">
              {filteredRootTasks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-50">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Clean Nest!</h3>
                  <p className="max-w-[260px] text-sm leading-relaxed">
                    You have no tasks in this category. Start by adding a task or a nested subtask.
                  </p>
                  <Button variant="ghost" className="mt-6 text-primary" onClick={() => handleAddTask()}>
                    Create your first task <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredRootTasks.map(task => (
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
          </div>
        </main>

        <TaskDialog 
          isOpen={isTaskDialogOpen}
          onClose={() => setIsTaskDialogOpen(false)}
          onSave={saveTask}
          taskToEdit={taskToEdit}
        />

        <CategoryDialog 
          isOpen={isCategoryDialogOpen}
          onClose={() => setIsCategoryDialogOpen(false)}
          onSave={(name, color) => addCategory(name, color)}
        />

        <SubtaskSelectionDialog
          isOpen={isSelectionDialogOpen}
          onClose={() => {
            setIsSelectionDialogOpen(false);
            setUnmarkTargetId(null);
          }}
          parentTask={unmarkTargetId ? tasks[unmarkTargetId] : null}
          allTasks={tasks}
          onConfirm={handlePartialUnmark}
        />

        <AlertDialog open={isUnmarkPromptOpen} onOpenChange={(open) => {
          setIsUnmarkPromptOpen(open);
          if (!open) {
            // Only clear target if we're not transitioning to the selection dialog
            if (!isSelectionDialogOpen) setUnmarkTargetId(null);
          }
        }}>
          <AlertDialogContent className="sm:max-w-[450px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Subtasks?</AlertDialogTitle>
              <AlertDialogDescription>
                You're moving a completed task back to "New". How would you like to handle its subtasks?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" className="sm:flex-1" onClick={confirmUnmarkNone}>
                Keep All Done
              </Button>
              <Button variant="secondary" className="sm:flex-1" onClick={openSelectionDialog}>
                Choose Specific...
              </Button>
              <Button className="sm:flex-1" onClick={confirmUnmarkAll}>
                Reset All
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SidebarProvider>
  );
}
