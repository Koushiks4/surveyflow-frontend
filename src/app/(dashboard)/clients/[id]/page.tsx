'use client';

import { use, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Client } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientForm } from '@/components/clients/client-form';
import { FileViewer } from '@/components/file-viewer';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileIcon, EyeIcon, DownloadIcon, UploadIcon, Trash2Icon } from 'lucide-react';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = user?.roles.some(r => ['super_admin', 'admin', 'team_lead', 'office_staff'].includes(r));

  const { data: client, isLoading } = useQuery({
    queryKey: ['clients', id],
    queryFn: () => api.get<Client>(`/api/clients/${id}`),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.upload(`/api/clients/${id}/documents`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', id] });
      toast.success('Document uploaded');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => api.delete(`/api/clients/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', id] });
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
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Client not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <p className="text-muted-foreground">{client.email || client.mobile}</p>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">
            Documents {client.documents && `(${client.documents.length})`}
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects {client.projects && `(${client.projects.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <ClientForm client={client} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
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
          {client.documents && client.documents.length > 0 ? (
            <div className="divide-y rounded-lg border bg-white">
              {client.documents.map((doc) => (
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
            <div className="text-center py-12 text-muted-foreground">
              No documents uploaded
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          {client.projects && client.projects.length > 0 ? (
            <div className="space-y-2">
              {client.projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {project.project_number} - {project.title}
                    </p>
                  </div>
                  {project.status && (
                    <Badge
                      style={{
                        backgroundColor: project.status.color,
                        color: '#fff',
                      }}
                    >
                      {project.status.name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No projects yet
            </div>
          )}
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
