
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}

const COLORS = [
  '#1F83A7', '#3DBA8C', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'
];

export function CategoryDialog({ isOpen, onClose, onSave }: CategoryDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name, color);
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
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
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
