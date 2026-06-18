'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ProjectDeliverable, ClosureChecklistItem, DeliveryStatus } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { FileViewer } from '@/components/file-viewer';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  UploadIcon,
  FileIcon,
  EyeIcon,
  DownloadIcon,
  Trash2Icon,
  CheckCircle2Icon,
  CircleIcon,
  ShieldCheckIcon,
  PackageIcon,
  ClipboardCheckIcon,
  LinkIcon,
  CopyIcon,
  ExternalLinkIcon,
} from 'lucide-react';

interface DeliveryTabProps {
  projectId: string;
}

export function DeliveryTab({ projectId }: DeliveryTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerFile, setViewerFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const canManage = user?.roles.some(r => ['super_admin', 'admin', 'team_lead'].includes(r));

  // Fetch deliverables
  const { data: deliverables, isLoading: deliverablesLoading } = useQuery({
    queryKey: ['project-deliverables', projectId],
    queryFn: () => api.get<ProjectDeliverable[]>(`/api/delivery/project/${projectId}/deliverables`),
  });

  // Fetch checklist
  const { data: checklist, isLoading: checklistLoading } = useQuery({
    queryKey: ['project-checklist', projectId],
    queryFn: () => api.get<ClosureChecklistItem[]>(`/api/delivery/project/${projectId}/checklist`),
  });

  // Fetch delivery status
  const { data: deliveryStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['delivery-status', projectId],
    queryFn: () => api.get<DeliveryStatus>(`/api/delivery/project/${projectId}/status`),
  });

  // Fetch delivery link
  const { data: deliveryLink, isLoading: linkLoading } = useQuery({
    queryKey: ['delivery-link', projectId],
    queryFn: () => api.get<{ token: string; created_at: string } | null>(`/api/delivery/project/${projectId}/link`),
  });

  // Upload deliverable mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.upload(`/api/delivery/project/${projectId}/deliverables`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-deliverables', projectId] });
      toast.success('Deliverable uploaded');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadDescription('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete deliverable mutation
  const deleteDeliverableMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/delivery/deliverables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-deliverables', projectId] });
      toast.success('Deliverable deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Toggle checklist item mutation
  const toggleChecklistMutation = useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      api.post(`/api/delivery/project/${projectId}/checklist/${itemId}/toggle`, { checked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-checklist', projectId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Confirm delivery mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: (notes: string) => api.post(`/api/delivery/project/${projectId}/confirm`, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-status', projectId] });
      toast.success('Delivery confirmed');
      setDeliveryNotes('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Revoke delivery mutation
  const revokeDeliveryMutation = useMutation({
    mutationFn: () => api.post(`/api/delivery/project/${projectId}/revoke`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-status', projectId] });
      toast.success('Delivery confirmation revoked');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Generate delivery link mutation
  const generateLinkMutation = useMutation({
    mutationFn: () => api.post<{ token: string }>(`/api/delivery/project/${projectId}/generate-link`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-link', projectId] });
      toast.success('Delivery link generated');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFileView = async (deliverableId: string, fileName: string, fileType: string) => {
    try {
      const { url } = await api.get<{ url: string }>(`/api/delivery/deliverables/${deliverableId}/url`);
      setViewerFile({ url, name: fileName, type: fileType });
    } catch {
      toast.error('Failed to load preview');
    }
  };

  const handleFileDownload = async (deliverableId: string, fileName: string) => {
    try {
      const { url } = await api.get<{ url: string }>(`/api/delivery/deliverables/${deliverableId}/url`);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch {
      toast.error('Failed to download');
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const isLoading = deliverablesLoading || checklistLoading || statusLoading || linkLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Deliverables */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <PackageIcon className="size-5 text-indigo-600" />
              <h2 className="text-base font-semibold">Deliverables</h2>
            </div>
            {canManage && (
              <div className="flex items-center gap-2">
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
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          {!deliverables?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No deliverables uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {deliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="rounded-lg border bg-white p-4 hover:bg-stone-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="size-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <FileIcon className="size-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{deliverable.file_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(deliverable.file_size / 1024).toFixed(1)} KB
                          <span className="mx-1.5">·</span>
                          {format(new Date(deliverable.created_at), 'dd MMM yyyy, h:mm a')}
                        </p>
                        {deliverable.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {deliverable.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Uploaded by <span className="font-medium">{deliverable.uploader.full_name}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => handleFileView(deliverable.id, deliverable.file_name, deliverable.file_type)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        title="Preview"
                      >
                        <EyeIcon className="size-4" />
                      </button>
                      <button
                        onClick={() => handleFileDownload(deliverable.id, deliverable.file_name)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-stone-100 hover:text-foreground transition-colors"
                        title="Download"
                      >
                        <DownloadIcon className="size-4" />
                      </button>
                      {canManage && (
                        <button
                          onClick={() => setDeleteTarget({ id: deliverable.id, name: deliverable.file_name })}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Share with Client */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <LinkIcon className="size-5 text-violet-600" />
            <h2 className="text-base font-semibold">Share with Client</h2>
          </div>
        </div>

        <div className="p-5">
          {!deliveryLink ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a secure link to share project deliverables with your client. They can view and confirm receipt without logging in.
              </p>
              {canManage ? (
                <Button
                  onClick={() => generateLinkMutation.mutate()}
                  disabled={generateLinkMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <LinkIcon className="size-4" />
                  {generateLinkMutation.isPending ? 'Generating...' : 'Generate Delivery Link'}
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Only Team Leads and above can generate delivery links
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Shareable Link
                </label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/delivery/${deliveryLink.token}`}
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyLink(`${window.location.origin}/delivery/${deliveryLink.token}`)}
                    className="shrink-0"
                  >
                    {linkCopied ? (
                      <>
                        <CheckCircle2Icon className="size-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-4" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/delivery/${deliveryLink.token}`, '_blank')}
                    className="shrink-0"
                  >
                    <ExternalLinkIcon className="size-4" />
                    Preview
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Generated on {format(new Date(deliveryLink.created_at), 'dd MMM yyyy, h:mm a')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Closure Checklist */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ClipboardCheckIcon className="size-5 text-emerald-600" />
            <h2 className="text-base font-semibold">Closure Checklist</h2>
          </div>
        </div>

        <div className="p-5">
          {!checklist?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No checklist items configured
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-stone-50/50 transition-colors"
                >
                  <Checkbox
                    checked={item.checked || false}
                    onCheckedChange={(checked) => {
                      if (canManage) {
                        toggleChecklistMutation.mutate({
                          itemId: item.id,
                          checked: checked === true,
                        });
                      }
                    }}
                    disabled={!canManage}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                      {item.title}
                    </p>
                    {item.checked && item.checked_by && item.checked_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Checked by <span className="font-medium">{item.checked_by.full_name}</span>
                        <span className="mx-1.5">·</span>
                        {format(new Date(item.checked_at), 'dd MMM yyyy, h:mm a')}
                      </p>
                    )}
                  </div>
                  {item.checked ? (
                    <CheckCircle2Icon className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <CircleIcon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Delivery Confirmation */}
      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheckIcon className="size-5 text-blue-600" />
            <h2 className="text-base font-semibold">Delivery Confirmation</h2>
          </div>
        </div>

        <div className="p-5">
          {deliveryStatus && deliveryStatus.confirmed ? (
            <div className="rounded-lg border-2 border-green-200 bg-green-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <CheckCircle2Icon className="size-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-900">Delivery Confirmed</p>
                  {deliveryStatus.confirmed_by && deliveryStatus.confirmed_at && (
                    <p className="text-xs text-green-700 mt-1">
                      Confirmed by <span className="font-medium">{deliveryStatus.confirmed_by.full_name}</span>
                      <span className="mx-1.5">·</span>
                      {format(new Date(deliveryStatus.confirmed_at), 'dd MMM yyyy, h:mm a')}
                    </p>
                  )}
                  {deliveryStatus.notes && (
                    <div className="mt-3 rounded-md bg-white/60 border border-green-200 p-3">
                      <p className="text-xs font-medium text-green-900 mb-1">Notes:</p>
                      <p className="text-xs text-green-800 leading-relaxed whitespace-pre-wrap">
                        {deliveryStatus.notes}
                      </p>
                    </div>
                  )}
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 text-xs"
                      onClick={() => revokeDeliveryMutation.mutate()}
                      disabled={revokeDeliveryMutation.isPending}
                    >
                      {revokeDeliveryMutation.isPending ? 'Revoking...' : 'Revoke Confirmation'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="delivery-notes" className="text-xs font-medium text-muted-foreground">
                  Notes (optional)
                </label>
                <Textarea
                  id="delivery-notes"
                  placeholder="Add any notes about the delivery..."
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  rows={4}
                  disabled={!canManage}
                />
              </div>
              {canManage && (
                <Button
                  onClick={() => confirmDeliveryMutation.mutate(deliveryNotes)}
                  disabled={confirmDeliveryMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <ShieldCheckIcon className="size-4" />
                  {confirmDeliveryMutation.isPending ? 'Confirming...' : 'Confirm Delivery'}
                </Button>
              )}
              {!canManage && (
                <p className="text-xs text-muted-foreground italic">
                  Only Team Leads and above can confirm delivery
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <FileViewer
        open={!!viewerFile}
        onOpenChange={(open) => {
          if (!open) setViewerFile(null);
        }}
        url={viewerFile?.url ?? null}
        fileName={viewerFile?.name ?? ''}
        fileType={viewerFile?.type ?? ''}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget) {
            deleteDeliverableMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        itemName={deleteTarget?.name}
        isPending={deleteDeliverableMutation.isPending}
      />
    </div>
  );
}
