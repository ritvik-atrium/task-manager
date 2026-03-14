
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LifeArea } from '@/types/task';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string, area: LifeArea) => void;
}

const COLORS = [
  '#1F83A7', '#3DBA8C', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'
];

const AREAS: LifeArea[] = ['Personal', 'Professional', 'Social', 'Spiritual'];

export function CategoryDialog({ isOpen, onClose, onSave }: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [area, setArea] = useState<LifeArea>('Personal');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name, color, area);
      setName('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Work, Life, Study..."
            />
          </div>
          <div className="grid gap-2">
            <Label>Area of Life</Label>
            <Select value={area} onValueChange={(v) => setArea(v as LifeArea)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Area" />
              </SelectTrigger>
              <SelectContent>
                {AREAS.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-primary scale-110 shadow-sm' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Create Category</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
