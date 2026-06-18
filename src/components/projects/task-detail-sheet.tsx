'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectTask, ProjectNote, TaskFile } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { FileViewer } from '@/components/file-viewer';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
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
  UploadIcon,
  FileIcon,
  DownloadIcon,
  EyeIcon,
  ChevronRightIcon,
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
  const [activeTab, setActiveTab] = useState<'notes' | 'files'>('notes');
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canCreate = user?.roles.some(r => ['super_admin', 'admin', 'team_lead'].includes(r));
  const canUpdateStatus = isAssigned || canCreate;
  const canUpload = isAssigned || canCreate;

  const { data: notes } = useQuery({
    queryKey: ['notes', 'task', task?.id],
    queryFn: () => api.get<ProjectNote[]>(`/api/notes/task/${task!.id}`),
    enabled: !!task,
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ['task-files', task?.id],
    queryFn: () => api.get<TaskFile[]>(`/api/tasks/${task!.id}/files`),
    enabled: !!task,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/api/tasks/${task!.id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addNoteMutation = useMutation({
    mutationFn: () => api.post('/api/notes', { projectId, taskId: task!.id, content: noteContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', 'task', task?.id] });
      setNoteContent('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => api.delete(`/api/notes/${noteId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', 'task', task?.id] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const uploadFileMutation = useMutation({
    mutationFn: (file: File) => api.upload<TaskFile>(`/api/tasks/${task!.id}/files`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-files', task?.id] });
      toast.success('File uploaded');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => api.delete(`/api/tasks/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-files', task?.id] });
      toast.success('File deleted');
      setDeleteFileTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFileMutation.mutate(file);
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const { url } = await api.get<{ url: string }>(`/api/tasks/files/${fileId}/url`);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleView = async (fileId: string, fileName: string, fileType: string) => {
    try {
      const { url } = await api.get<{ url: string }>(`/api/tasks/files/${fileId}/url`);
      setViewerFile({ url, name: fileName, type: fileType });
    } catch {
      toast.error('Failed to load file preview');
    }
  };

  if (!task) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Sheet open={!!task} onOpenChange={(open) => { if (!open) { onClose(); setActiveTab('notes'); } }}>
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

        {/* Tab Switcher: Notes / Files */}
        <div className="px-5 pt-3 flex gap-1">
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'notes'
                ? 'bg-stone-100 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-50'
            }`}
          >
            Notes
            {notes?.length ? <span className="text-[10px] text-muted-foreground">({notes.length})</span> : null}
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'files'
                ? 'bg-stone-100 text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-stone-50'
            }`}
          >
            Files
            {files?.length ? <span className="text-[10px] text-muted-foreground">({files.length})</span> : null}
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'notes' ? (
          <>
            <div className="flex-1 flex flex-col min-h-0 px-5 py-3">
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
                  <p className="text-sm text-muted-foreground text-center py-6">No notes yet</p>
                )}
              </div>
            </div>

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
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-h-0 px-5 py-3">
              <div className="flex-1 overflow-y-auto min-h-0">
                {filesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                  </div>
                ) : files?.length ? (
                  <div className="space-y-4">
                    {(() => {
                      const grouped = new Map<string, typeof files>();
                      for (const file of files) {
                        const key = file.file_name;
                        if (!grouped.has(key)) grouped.set(key, []);
                        grouped.get(key)!.push(file);
                      }

                      return Array.from(grouped.entries()).map(([fileName, versions]) => {
                        const latest = versions[0];
                        const hasHistory = versions.length > 1;

                        return (
                          <div key={fileName} className="rounded-lg border overflow-hidden">
                            {/* Latest version — always visible */}
                            <div className="flex items-start gap-3 p-3 bg-white">
                              <div className="size-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                                <FileIcon className="size-4 text-indigo-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{latest.file_name}</p>
                                  <span className="text-[10px] font-medium rounded px-1.5 py-0.5 bg-indigo-100 text-indigo-700 shrink-0">
                                    v{latest.version}
                                  </span>
                                  {hasHistory && (
                                    <span className="text-[10px] text-muted-foreground">
                                      ({versions.length} versions)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                  <span>{formatFileSize(latest.file_size)}</span>
                                  <span>·</span>
                                  <span>{latest.uploader?.full_name}</span>
                                  <span>·</span>
                                  <span>{formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0 mt-1">
                                <button onClick={() => handleView(latest.id, latest.file_name, latest.file_type)} className="rounded-md p-1.5 text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Preview">
                                  <EyeIcon className="size-4" />
                                </button>
                                <button onClick={() => handleDownload(latest.id, latest.file_name)} className="rounded-md p-1.5 text-muted-foreground hover:bg-stone-100 hover:text-foreground transition-colors" title="Download">
                                  <DownloadIcon className="size-4" />
                                </button>
                                {canCreate && (
                                  <button onClick={() => setDeleteFileTarget({ id: latest.id, name: `${latest.file_name} (v${latest.version})` })} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                                    <Trash2Icon className="size-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Older versions */}
                            {hasHistory && (
                              <div className="border-t bg-stone-50/50">
                                <details className="group">
                                  <summary className="px-3 py-1.5 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground select-none flex items-center gap-1">
                                    <ChevronRightIcon className="size-3 transition-transform group-open:rotate-90" />
                                    Older versions
                                  </summary>
                                  <div className="divide-y">
                                    {versions.slice(1).map((file) => (
                                      <div key={file.id} className="flex items-center gap-3 px-3 py-2">
                                        <div className="size-7 rounded bg-stone-100 flex items-center justify-center shrink-0">
                                          <FileIcon className="size-3 text-stone-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-medium rounded px-1.5 py-0.5 bg-stone-100 text-stone-500">v{file.version}</span>
                                            <span className="text-[11px] text-muted-foreground">{formatFileSize(file.file_size)}</span>
                                            <span className="text-[11px] text-muted-foreground">· {file.uploader?.full_name}</span>
                                            <span className="text-[11px] text-muted-foreground">· {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-0.5 shrink-0">
                                          <button onClick={() => handleView(file.id, file.file_name, file.file_type)} className="rounded p-1 text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Preview">
                                            <EyeIcon className="size-3.5" />
                                          </button>
                                          <button onClick={() => handleDownload(file.id, file.file_name)} className="rounded p-1 text-muted-foreground hover:bg-stone-100 hover:text-foreground transition-colors" title="Download">
                                            <DownloadIcon className="size-3.5" />
                                          </button>
                                          {canCreate && (
                                            <button onClick={() => setDeleteFileTarget({ id: file.id, name: `${file.file_name} (v${file.version})` })} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                                              <Trash2Icon className="size-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileIcon className="size-8 text-stone-200 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                  </div>
                )}
              </div>
            </div>

            {canUpload && (
              <div className="border-t px-5 py-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadFileMutation.isPending}
                >
                  <UploadIcon className="size-4" />
                  {uploadFileMutation.isPending ? 'Uploading...' : files?.length ? 'Upload New Version' : 'Upload File'}
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>

      <FileViewer
        open={!!viewerFile}
        onOpenChange={(open) => { if (!open) setViewerFile(null); }}
        url={viewerFile?.url ?? null}
        fileName={viewerFile?.name ?? ''}
        fileType={viewerFile?.type ?? ''}
      />

      <ConfirmDeleteDialog
        open={!!deleteFileTarget}
        onOpenChange={(open) => { if (!open) setDeleteFileTarget(null); }}
        onConfirm={() => {
          if (deleteFileTarget) deleteFileMutation.mutate(deleteFileTarget.id);
        }}
        itemName={deleteFileTarget?.name}
        isPending={deleteFileMutation.isPending}
      />
    </Sheet>
  );
}
