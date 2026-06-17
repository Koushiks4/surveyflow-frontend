'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectNote } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { SendIcon, Trash2Icon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  projectId: string;
  taskId?: string;
  isAssigned: boolean;
}

export function ActivityFeed({ projectId, taskId, isAssigned }: ActivityFeedProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const queryKey = taskId ? ['notes', 'task', taskId] : ['notes', 'project', projectId];
  const endpoint = taskId ? `/api/notes/task/${taskId}` : `/api/notes/project/${projectId}`;

  const { data: notes, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get<ProjectNote[]>(endpoint),
  });

  const addMutation = useMutation({
    mutationFn: () => api.post('/api/notes', {
      projectId,
      taskId: taskId || undefined,
      content,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setContent('');
      toast.success('Note added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => api.delete(`/api/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) addMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {isAssigned && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!content.trim() || addMutation.isPending}>
            <SendIcon />
          </Button>
        </form>
      )}

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
      ) : !notes?.length ? (
        <p className="text-sm text-muted-foreground py-4">No notes yet</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-3">
              <div className="size-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-medium text-indigo-600 shrink-0">
                {note.user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{note.user?.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                  {note.user?.id === user?.id && (
                    <button
                      onClick={() => deleteMutation.mutate(note.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors ml-auto"
                    >
                      <Trash2Icon className="size-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{note.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
