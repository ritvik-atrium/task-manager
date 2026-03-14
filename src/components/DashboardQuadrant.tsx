
"use client";

import React, { useMemo } from 'react';
import { Task, Category, LifeArea } from '@/types/task';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { User, Briefcase, Users, Sparkles } from 'lucide-react';

interface DashboardQuadrantProps {
  tasks: Record<string, Task>;
  categories: Category[];
}

const AREA_ICONS = {
  Personal: <User className="w-5 h-5" />,
  Professional: <Briefcase className="w-5 h-5" />,
  Social: <Users className="w-5 h-5" />,
  Spiritual: <Sparkles className="w-5 h-5" />
};

export function DashboardQuadrant({ tasks, categories }: DashboardQuadrantProps) {
  const stats = useMemo(() => {
    const areas: LifeArea[] = ['Personal', 'Professional', 'Social', 'Spiritual'];
    const result: Record<LifeArea, any> = {} as any;

    areas.forEach(area => {
      const areaCategories = categories.filter(c => c.area === area).map(c => c.id);
      const areaTasks = Object.values(tasks).filter(t => areaCategories.includes(t.categoryId));
      const completed = areaTasks.filter(t => t.status === 'done').length;
      const total = areaTasks.length;
      const progress = total ? Math.round((completed / total) * 100) : 0;

      result[area] = { total, completed, progress };
    });

    return result;
  }, [tasks, categories]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
      {(['Personal', 'Professional', 'Social', 'Spiritual'] as LifeArea[]).map(area => (
        <Card key={area} className="border-none shadow-md bg-white/80 backdrop-blur-sm overflow-hidden group hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-lg font-bold tracking-tight">{area}</CardTitle>
            <div className="p-2 bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
              {AREA_ICONS[area]}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-black text-foreground">{stats[area].progress}%</p>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Efficiency</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{stats[area].completed} / {stats[area].total}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Completed Tasks</p>
                </div>
              </div>
              <Progress value={stats[area].progress} className="h-2 bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
