'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectTask, User } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  task?: ProjectTask | null;
}

export function TaskFormDialog({ open, onOpenChange, projectId, task }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!task;

  const { data: users } = useQuery({
    queryKey: ['users-directory'],
    queryFn: () => api.get<Pick<User, 'id' | 'full_name' | 'roles'>[]>('/api/users/directory'),
    enabled: open,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', assignedTo: '', dueDate: '' },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || '',
        assignedTo: task.assigned_to || '',
        dueDate: task.due_date || '',
      });
    } else {
      form.reset({ title: '', description: '', assignedTo: '', dueDate: '' });
    }
  }, [task, form]);

  const mutation = useMutation({
    mutationFn: (data: TaskFormData) => {
      const payload = {
        ...data,
        assignedTo: data.assignedTo || undefined,
        dueDate: data.dueDate || undefined,
      };
      if (isEdit) return api.patch(`/api/tasks/${task!.id}`, payload);
      return api.post('/api/tasks', { ...payload, projectId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success(isEdit ? 'Task updated' : 'Task created');
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input {...form.register('title')} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...form.register('description')} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <select
                {...form.register('assignedTo')}
                className="h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-2 pr-8 pl-3 text-sm outline-none"
              >
                <option value="">Unassigned</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" {...form.register('dueDate')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
