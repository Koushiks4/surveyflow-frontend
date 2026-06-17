'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectTask } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskFormDialog } from './task-form-dialog';
import { TaskDetailSheet } from './task-detail-sheet';
import { toast } from 'sonner';
import {
  PlusIcon,
  CheckCircle2Icon,
  CircleIcon,
  CircleDotIcon,
  CalendarIcon,
  UserIcon,
  MessageSquareIcon,
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const statusConfig = {
  pending: { label: 'Pending', color: '#F59E0B', bg: 'bg-amber-50 text-amber-700', icon: CircleIcon },
  in_progress: { label: 'In Progress', color: '#3B82F6', bg: 'bg-blue-50 text-blue-700', icon: CircleDotIcon },
  completed: { label: 'Done', color: '#10B981', bg: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2Icon },
} as const;

interface TaskListProps {
  projectId: string;
  isAssigned: boolean;
}

export function TaskList({ projectId, isAssigned }: TaskListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const canCreate = user?.roles.some(r => ['super_admin', 'admin', 'team_lead'].includes(r));

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get<ProjectTask[]>(`/api/tasks/project/${projectId}`),
  });

  const pendingTasks = tasks?.filter(t => t.status === 'pending') || [];
  const inProgressTasks = tasks?.filter(t => t.status === 'in_progress') || [];
  const completedTasks = tasks?.filter(t => t.status === 'completed') || [];

  const handleEdit = (task: ProjectTask) => {
    setEditTask(task);
    setDialogOpen(true);
  };

  const renderTask = (task: ProjectTask) => {
    const config = statusConfig[task.status];
    const StatusIcon = config.icon;
    const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
    const isDueToday = task.due_date && isToday(new Date(task.due_date));

    return (
      <button
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className="group w-full flex items-start gap-3 rounded-lg border bg-white px-4 py-3 text-left transition-all hover:shadow-sm hover:border-indigo-200"
      >
        <StatusIcon className="size-[18px] mt-0.5 shrink-0" style={{ color: config.color }} />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </p>

          {task.description && task.status !== 'completed' && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            {task.assigned_user && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <UserIcon className="size-3" />
                {task.assigned_user.full_name}
              </span>
            )}
            {task.due_date && (
              <span className={`inline-flex items-center gap-1 text-[11px] rounded-full px-1.5 py-0.5 ${
                isOverdue
                  ? 'bg-red-50 text-red-600 font-medium'
                  : isDueToday
                    ? 'bg-amber-50 text-amber-600 font-medium'
                    : 'text-muted-foreground'
              }`}>
                <CalendarIcon className="size-3" />
                {isOverdue ? 'Overdue · ' : isDueToday ? 'Today · ' : ''}
                {format(new Date(task.due_date), 'dd MMM')}
              </span>
            )}
          </div>
        </div>

        <MessageSquareIcon className="size-4 text-stone-300 group-hover:text-indigo-400 mt-0.5 shrink-0 transition-colors" />
      </button>
    );
  };

  const renderSection = (title: string, sectionTasks: ProjectTask[], status: keyof typeof statusConfig) => {
    if (sectionTasks.length === 0) return null;
    const config = statusConfig[status];

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-0.5 ${config.bg}`}>
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{sectionTasks.length}</span>
        </div>
        <div className="space-y-1.5">
          {sectionTasks.map(renderTask)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {canCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { setEditTask(null); setDialogOpen(true); }}>
            <PlusIcon /> Add Task
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : !tasks?.length ? (
        <div className="text-center py-12">
          <CircleIcon className="size-10 text-stone-200 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tasks yet</p>
          {canCreate && (
            <p className="text-xs text-muted-foreground mt-1">Click "Add Task" to get started</p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {renderSection('In Progress', inProgressTasks, 'in_progress')}
          {renderSection('Pending', pendingTasks, 'pending')}
          {renderSection('Done', completedTasks, 'completed')}
        </div>
      )}

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        task={editTask}
      />

      <TaskDetailSheet
        task={selectedTask}
        projectId={projectId}
        isAssigned={isAssigned}
        onClose={() => setSelectedTask(null)}
        onEdit={handleEdit}
      />
    </div>
  );
}
