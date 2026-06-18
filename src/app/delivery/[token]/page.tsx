'use client';

import { use, useState, useEffect } from 'react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileIcon, DownloadIcon, CheckCircle2Icon, CalendarIcon, UserIcon, BriefcaseIcon } from 'lucide-react';

interface TeamMember {
  name: string;
  role: string;
}

interface Deliverable {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

interface DeliveryData {
  project: {
    project_number: string;
    title: string;
    description: string | null;
    client: { name: string; email: string | null; mobile: string | null } | null;
    project_type: { name: string } | null;
    status: { name: string; color: string } | null;
    start_date: string | null;
    expected_end_date: string | null;
    delivery_confirmed: boolean;
    client_comment: string | null;
  };
  team: TeamMember[];
  deliverables: Deliverable[];
}

export default function PublicDeliveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [confirming, setConfirming] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL!;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/public/delivery/${token}`);
        if (!res.ok) {
          throw new Error('Invalid or expired link');
        }
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load delivery');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, API_URL]);

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const res = await fetch(`${API_URL}/public/delivery/${token}/file/${fileId}/url`);
      if (!res.ok) throw new Error('Failed to get download URL');
      const { url } = await res.json();
      window.open(url, '_blank');
      toast.success('Opening file...');
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleConfirm = async () => {
    if (!comment.trim()) {
      toast.error('Please add a comment');
      return;
    }

    setConfirming(true);
    try {
      const res = await fetch(`${API_URL}/public/delivery/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() }),
      });

      if (!res.ok) throw new Error('Failed to confirm');

      setData((prev) => prev ? {
        ...prev,
        project: { ...prev.project, delivery_confirmed: true, client_comment: comment.trim() },
      } : null);
      toast.success('Receipt confirmed successfully!');
      setComment('');
    } catch {
      toast.error('Failed to confirm receipt');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="rounded-xl border bg-white p-8 text-center space-y-4">
            <Logo className="mx-auto" />
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-red-600">Invalid or Expired Link</h1>
              <p className="text-sm text-muted-foreground">
                This delivery link is invalid or has expired. Please contact your project team for assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <Logo className="mx-auto" />
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Project Delivery</h1>
            <p className="text-sm text-muted-foreground mt-1">View and confirm receipt of your project deliverables</p>
          </div>
        </div>

        {/* Project Info Card */}
        <div className="rounded-xl border bg-white p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <BriefcaseIcon className="size-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Project</p>
                <p className="text-sm font-semibold text-stone-900">{data.project.project_number}</p>
                <p className="text-base font-medium text-stone-700 mt-1">{data.project.title}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <UserIcon className="size-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Client</p>
                <p className="text-sm font-medium text-stone-900">{data.project.client?.name}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarIcon className="size-5 text-violet-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Duration</p>
                <p className="text-sm text-stone-900">
                  {data.project.start_date ? format(new Date(data.project.start_date), 'dd MMM yyyy') : 'Not set'}
                  {data.project.expected_end_date && (
                    <>
                      {' → '}
                      {format(new Date(data.project.expected_end_date), 'dd MMM yyyy')}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Project Type</p>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                {data.project.project_type?.name || 'General'}
              </span>
            </div>
          </div>
        </div>

        {/* Deliverables Card */}
        <div className="rounded-xl border bg-white">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold">Deliverables</h2>
          </div>
          <div className="p-5">
            {data.deliverables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No deliverables available</p>
            ) : (
              <div className="space-y-3">
                {data.deliverables.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-lg border bg-white p-4 hover:bg-stone-50/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="size-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <FileIcon className="size-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(file.file_size / 1024).toFixed(1)} KB
                            <span className="mx-1.5">·</span>
                            {format(new Date(file.created_at), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file.id, file.file_name)}
                        className="shrink-0"
                      >
                        <DownloadIcon className="size-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Card */}
        <div className="rounded-xl border bg-white">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-semibold">
              {data.project.delivery_confirmed ? 'Receipt Confirmed' : 'Confirm Receipt'}
            </h2>
          </div>
          <div className="p-5">
            {data.project.delivery_confirmed ? (
              <div className="rounded-lg border-2 border-green-200 bg-green-50/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="size-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2Icon className="size-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-900">Thank you for confirming!</p>
                    <p className="text-xs text-green-700 mt-1">
                      Thank you for confirming receipt of the deliverables.
                    </p>
                    {data.project.client_comment && (
                      <div className="mt-3 rounded-md bg-white/60 border border-green-200 p-3">
                        <p className="text-xs font-medium text-green-900 mb-1">Your comment:</p>
                        <p className="text-xs text-green-800 leading-relaxed whitespace-pre-wrap">
                          {data.project.client_comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Please review the deliverables and confirm that you have received them.
                </p>
                <div className="space-y-2">
                  <label htmlFor="comment" className="text-xs font-medium text-muted-foreground">
                    Comment <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="comment"
                    placeholder="Add a comment about the delivery (e.g., 'All files received in good condition')"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleConfirm}
                  disabled={confirming || !comment.trim()}
                  className="w-full"
                >
                  <CheckCircle2Icon className="size-4" />
                  {confirming ? 'Confirming...' : 'Confirm Receipt'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-medium text-indigo-600">SurveyFlow</span>
          </p>
        </div>
      </div>
    </div>
  );
}
