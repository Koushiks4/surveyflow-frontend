'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectTask, ProjectNote } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  CheckCircle2Icon,
  CircleIcon,
  CircleDotIcon,
  CalendarIcon,
  UserIcon,
  SendIcon,
  Trash2Icon,
  PencilIcon,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const statusOptions = [
  { value: 'pending', label: 'Pending', color: '#F59E0B', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: CircleIcon },
  { value: 'in_progress', label: 'In Progress', color: '#3B82F6', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: CircleDotIcon },
  { value: 'completed', label: 'Done', color: '#10B981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2Icon },
] as const;

interface TaskDetailSheetProps {
  task: ProjectTask | null;
  projectId: string;
  isAssigned: boolean;
  onClose: () => void;
  onEdit: (task: ProjectTask) => void;
}

export function TaskDetailSheet({ task, projectId, isAssigned, onClose, onEdit }: TaskDetailSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState('');
  const canCreate = user?.roles.some(r => ['super_admin', 'admin', 'team_lead'].includes(r));
  const canUpdateStatus = isAssigned || canCreate;

  const { data: notes } = useQuery({
    queryKey: ['notes', 'task', task?.id],
    queryFn: () => api.get<ProjectNote[]>(`/api/notes/task/${task!.id}`),
    enabled: !!task,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/api/tasks/${task!.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['notes', 'task', task?.id] });
      toast.success('Status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addNoteMutation = useMutation({
    mutationFn: () => api.post('/api/notes', { projectId, taskId: task!.id, content: noteContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'task', task?.id] });
      setNoteContent('');
      toast.success('Note added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.delete(`/api/notes/${noteId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', 'task', task?.id] }),
    onError: (err: Error) => toast.error(err.message),
  });

  if (!task) return null;

  const currentStatus = statusOptions.find(s => s.value === task.status)!;

  return (
    <Sheet open={!!task} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col" showCloseButton>
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="flex items-start justify-between pr-8">
            <SheetTitle className="text-base leading-snug">{task.title}</SheetTitle>
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{task.description}</p>
          )}
        </SheetHeader>

        {/* Meta */}
        <div className="px-5 py-3 space-y-3">
          <div className="flex items-center gap-4 text-sm">
            {task.assigned_user && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <UserIcon className="size-3.5" />
                {task.assigned_user.full_name}
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarIcon className="size-3.5" />
                {format(new Date(task.due_date), 'dd MMM yyyy')}
              </span>
            )}
          </div>

          {canCreate && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => { onClose(); onEdit(task); }}>
              <PencilIcon className="size-3" />
              Edit Task
            </Button>
          )}
        </div>

        <Separator />

        {/* Status Switcher */}
        <div className="px-5 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
          <div className="flex gap-1.5">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              const isActive = task.status === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    if (!isActive && canUpdateStatus) statusMutation.mutate(option.value);
                  }}
                  disabled={isActive || !canUpdateStatus || statusMutation.isPending}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? option.bg + ' border-current'
                      : canUpdateStatus
                        ? 'border-stone-200 text-muted-foreground hover:border-stone-300 hover:bg-stone-50'
                        : 'border-stone-200 text-muted-foreground opacity-50 cursor-default'
                  }`}
                >
                  <Icon className="size-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Notes Section */}
        <div className="flex-1 flex flex-col min-h-0 px-5 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Notes
            {notes?.length ? ` (${notes.length})` : ''}
          </p>

          {/* Notes list — scrollable */}
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
            {notes?.length ? (
              [...notes].reverse().map((note) => (
                <div key={note.id} className="flex gap-2.5 group">
                  <div className="size-7 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-medium text-indigo-600 shrink-0 mt-0.5">
                    {note.user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium">{note.user?.full_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                      {note.user?.id === user?.id && (
                        <button
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          className="ml-auto text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2Icon className="size-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No notes on this task yet</p>
            )}
          </div>
        </div>

        {/* Add Note — pinned at bottom */}
        {(isAssigned || canCreate) && (
          <div className="border-t px-5 py-3">
            <form
              onSubmit={(e) => { e.preventDefault(); if (noteContent.trim()) addNoteMutation.mutate(); }}
              className="flex gap-2"
            >
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="flex-1 text-sm resize-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!noteContent.trim() || addNoteMutation.isPending}
                className="shrink-0 self-end"
              >
                <SendIcon className="size-4" />
              </Button>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
