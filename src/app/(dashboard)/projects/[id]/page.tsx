'use client';

import { use, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Project } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectForm } from '@/components/projects/project-form';
import { AttendanceLogView } from '@/components/projects/attendance-log';
import { TaskList } from '@/components/projects/task-list';
import { ActivityFeed } from '@/components/projects/activity-feed';
import { DeliveryTab } from '@/components/projects/delivery-tab';
import { FileViewer } from '@/components/file-viewer';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  FileTextIcon,
  ClipboardListIcon,
  MessageSquareIcon,
  UsersIcon,
  FileIcon,
  EyeIcon,
  DownloadIcon,
  UploadIcon,
  Trash2Icon,
  PackageIcon,
} from 'lucide-react';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = user?.roles.some(r => ['super_admin', 'admin', 'team_lead', 'office_staff'].includes(r));

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.get<Project>(`/api/projects/${id}`),
  });

  const isAssigned = project?.project_assignments?.some(a => a.user?.id === user?.id) ?? false;

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.upload(`/api/projects/${id}/documents`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      toast.success('Document uploaded');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => api.delete(`/api/projects/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
      toast.success('Document deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDocView = async (docId: string, fileName: string, fileType: string) => {
    try {
      const { url } = await api.get<{ url: string }>(`/api/clients/documents/${docId}/url`);
      setViewerFile({ url, name: fileName, type: fileType });
    } catch { toast.error('Failed to load preview'); }
  };

  const handleDocDownload = async (docId: string, fileName: string) => {
    try {
      const { url } = await api.get<{ url: string }>(`/api/clients/documents/${docId}/url`);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch { toast.error('Failed to download'); }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Project not found
      </div>
    );
  }

  const taskCount = 0;
  const teamCount = project.project_assignments?.length || 0;
  const docCount = project.documents?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <button
              onClick={() => router.push('/projects')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeftIcon className="size-3" />
              Back to projects
            </button>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold tracking-tight">{project.title}</h1>
                {project.status && (
                  <Badge
                    className="text-[11px] font-medium"
                    style={{ backgroundColor: project.status.color, color: '#fff' }}
                  >
                    {project.status.name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="font-mono text-xs bg-stone-100 px-2 py-0.5 rounded">
                  {project.project_number}
                </span>
                {project.client && (
                  <span className="flex items-center gap-1.5">
                    <UserIcon className="size-3.5" />
                    {project.client.name}
                  </span>
                )}
                {project.project_type && (
                  <span className="flex items-center gap-1.5">
                    <FileTextIcon className="size-3.5" />
                    {project.project_type.name}
                  </span>
                )}
                {project.start_date && (
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="size-3.5" />
                    {format(new Date(project.start_date), 'dd MMM yyyy')}
                    {project.expected_end_date && (
                      <> → {format(new Date(project.expected_end_date), 'dd MMM yyyy')}</>
                    )}
                  </span>
                )}
              </div>
            </div>

            {project.description && (
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}

            {project.location_address && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPinIcon className="size-3.5 text-indigo-500" />
                {project.location_address}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <div className="border-b">
          <TabsList variant="line" className="gap-0">
            <TabsTrigger value="tasks" className="gap-2 px-4 py-2.5 text-[13px]">
              <ClipboardListIcon className="size-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2 px-4 py-2.5 text-[13px]">
              <MessageSquareIcon className="size-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2 px-4 py-2.5 text-[13px]">
              <UsersIcon className="size-4" />
              Team
              {teamCount > 0 && (
                <span className="ml-0.5 rounded-full bg-stone-100 px-1.5 py-0 text-[10px] font-medium text-stone-600">
                  {teamCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2 px-4 py-2.5 text-[13px]">
              <MapPinIcon className="size-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2 px-4 py-2.5 text-[13px]">
              <PackageIcon className="size-4" />
              Delivery
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 px-4 py-2.5 text-[13px]">
              <FileIcon className="size-4" />
              Documents
              {docCount > 0 && (
                <span className="ml-0.5 rounded-full bg-stone-100 px-1.5 py-0 text-[10px] font-medium text-stone-600">
                  {docCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2 px-4 py-2.5 text-[13px]">
              <FileTextIcon className="size-4" />
              Details
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tasks" className="mt-5">
          <TaskList projectId={id} isAssigned={isAssigned} />
        </TabsContent>

        <TabsContent value="activity" className="mt-5">
          <ActivityFeed projectId={id} isAssigned={isAssigned} />
        </TabsContent>

        <TabsContent value="team" className="mt-5">
          {teamCount > 0 ? (
            <div className="divide-y rounded-lg border bg-white">
              {project.project_assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-xs font-medium text-indigo-600">
                      {assignment.user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{assignment.user.full_name}</p>
                      <p className="text-xs text-muted-foreground">{assignment.user.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{assignment.role.display_name}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No team members assigned</p>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-5">
          <AttendanceLogView projectId={id} isAssigned={isAssigned} />
        </TabsContent>

        <TabsContent value="delivery" className="mt-5">
          <DeliveryTab projectId={id} />
        </TabsContent>

        <TabsContent value="documents" className="mt-5">
          {canUpload && (
            <div className="flex justify-end mb-4">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
              >
                <UploadIcon className="size-4" />
                {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          )}
          {docCount > 0 ? (
            <div className="divide-y rounded-lg border bg-white">
              {project.documents!.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-stone-100 flex items-center justify-center">
                      <FileIcon className="size-4 text-stone-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.file_size / 1024).toFixed(1)} KB
                        <span className="mx-1.5">·</span>
                        {format(new Date(doc.created_at), 'dd MMM yyyy')}
                        {doc.category && doc.category !== 'other' && (
                          <>
                            <span className="mx-1.5">·</span>
                            {doc.category.replace(/_/g, ' ')}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleDocView(doc.id, doc.file_name, doc.file_type)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                      title="Preview"
                    >
                      <EyeIcon className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDocDownload(doc.id, doc.file_name)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-stone-100 hover:text-foreground transition-colors"
                      title="Download"
                    >
                      <DownloadIcon className="size-4" />
                    </button>
                    {canUpload && (
                      <button
                        onClick={() => setDeleteTarget({ id: doc.id, name: doc.file_name })}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No documents uploaded</p>
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-5">
          <ProjectForm project={project} />
        </TabsContent>
      </Tabs>

      <FileViewer
        open={!!viewerFile}
        onOpenChange={(open) => { if (!open) setViewerFile(null); }}
        url={viewerFile?.url ?? null}
        fileName={viewerFile?.name ?? ''}
        fileType={viewerFile?.type ?? ''}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => {
          if (deleteTarget) {
            deleteDocMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        itemName={deleteTarget?.name}
        isPending={deleteDocMutation.isPending}
      />
    </div>
  );
}
