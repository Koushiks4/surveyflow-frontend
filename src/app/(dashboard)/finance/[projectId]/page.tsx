'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { PaymentEntry, ProjectSummary, Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { FileViewer } from '@/components/file-viewer';
import { PaymentEntryDialog } from '@/components/finance/payment-entry-dialog';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  Trash2Icon,
  PlusIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  WalletIcon,
  ReceiptIcon,
  CalendarIcon,
  EyeIcon,
  IndianRupeeIcon,
  BanknoteIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from 'lucide-react';
import { format } from 'date-fns';

function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectFinancePage({ params }: PageProps) {
  const { projectId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [editingQuote, setEditingQuote] = useState(false);
  const [quotedAmount, setQuotedAmount] = useState('');
  const [deleteEntry, setDeleteEntry] = useState<PaymentEntry | null>(null);
  const [viewReceipt, setViewReceipt] = useState<{ url: string; name: string; type: string } | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PaymentEntry | null>(null);

  const canView = user?.roles.some(r => ['super_admin', 'admin', 'team_lead'].includes(r));

  const { data: project } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => api.get<Project>(`/api/projects/${projectId}`),
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['project-payments', projectId],
    queryFn: () => api.get<PaymentEntry[]>(`/api/payments/project/${projectId}`),
    enabled: canView,
  });

  const { data: summary } = useQuery({
    queryKey: ['project-summary', projectId],
    queryFn: () => api.get<ProjectSummary>(`/api/payments/project/${projectId}/summary`),
    enabled: canView,
  });

  const updateQuoteMutation = useMutation({
    mutationFn: (amount: number) => api.patch(`/api/payments/project/${projectId}/quote`, { quotedAmount: amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
      setEditingQuote(false);
      toast.success('Quote updated');
    },
    onError: () => toast.error('Failed to update quote'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-payments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
      setDeleteEntry(null);
      toast.success('Entry deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleViewReceipt = async (entry: PaymentEntry) => {
    try {
      const { url } = await api.get<{ url: string }>(`/api/payments/${entry.id}/receipt-url`);
      setViewReceipt({ url, name: entry.receipt_name || 'Receipt', type: '' });
    } catch { toast.error('Failed to load receipt'); }
  };

  const openCreateDialog = () => {
    setEditingEntry(null);
    setEntryDialogOpen(true);
  };

  const openEditDialog = (entry: PaymentEntry) => {
    setEditingEntry(entry);
    setEntryDialogOpen(true);
  };

  if (!canView) {
    return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">No permission.</p></div>;
  }

  const advances = payments?.filter(e => e.type === 'advance') || [];
  const expenses = payments?.filter(e => e.type === 'expense') || [];
  const profitPercent = summary && summary.advances > 0 ? ((summary.profit / summary.advances) * 100) : 0;

  const renderEntry = (entry: PaymentEntry) => (
    <div key={entry.id} className="group rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className={`text-lg font-semibold ${entry.type === 'advance' ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatINR(entry.amount)}
            </p>
            {entry.category && <Badge variant="secondary" className="text-[10px]">{entry.category.name}</Badge>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarIcon className="size-3" />{format(new Date(entry.date), 'dd MMM yyyy')}</span>
            {entry.payment_method && <Badge variant="secondary" className="text-[10px] font-normal">{entry.payment_method.replace('_', ' ')}</Badge>}
          </div>
          {entry.description && <p className="text-sm text-foreground">{entry.description}</p>}
          <p className="text-[11px] text-muted-foreground">by {entry.created_by_user?.full_name}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {entry.receipt_path && (
            <button onClick={() => handleViewReceipt(entry)} className="rounded-md p-1.5 text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="View receipt">
              <EyeIcon className="size-4" />
            </button>
          )}
          <button onClick={() => openEditDialog(entry)} className="rounded-md p-1.5 text-muted-foreground hover:bg-stone-100 hover:text-foreground transition-colors" title="Edit">
            <PencilIcon className="size-4" />
          </button>
          <button onClick={() => setDeleteEntry(entry)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <button onClick={() => router.push('/finance')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeftIcon className="size-3" /> Back to Finance
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {project?.project_number || '...'}
              <span className="text-muted-foreground font-normal ml-2">{project?.title}</span>
            </h1>
            {project?.client && <p className="text-sm text-muted-foreground mt-0.5">{project.client.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            {project?.status && (
              <Badge style={{ backgroundColor: project.status.color, color: '#fff' }}>{project.status.name}</Badge>
            )}
            <Button size="sm" onClick={openCreateDialog}>
              <PlusIcon className="size-4" /> Add Entry
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Quoted</p>
              <div className="size-8 rounded-lg bg-indigo-50 flex items-center justify-center"><IndianRupeeIcon className="size-4 text-indigo-600" /></div>
            </div>
            {editingQuote ? (
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-semibold">₹</span>
                <Input type="number" value={quotedAmount} onChange={(e) => setQuotedAmount(e.target.value)} className="h-8 w-28 text-lg font-semibold" autoFocus />
                <button onClick={() => { const n = Number(quotedAmount); if (n >= 0) updateQuoteMutation.mutate(n); }} className="rounded-md p-1 hover:bg-emerald-50 text-emerald-600"><CheckIcon className="size-4" /></button>
                <button onClick={() => setEditingQuote(false)} className="rounded-md p-1 hover:bg-stone-100 text-muted-foreground"><XIcon className="size-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold tracking-tight">{formatINR(summary?.quoted || 0)}</p>
                <button onClick={() => { setQuotedAmount(String(summary?.quoted || 0)); setEditingQuote(true); }} className="rounded-md p-1 text-muted-foreground hover:bg-stone-100 hover:text-foreground"><PencilIcon className="size-3" /></button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><p className="text-xs font-medium text-muted-foreground">Received</p><div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center"><ArrowDownIcon className="size-4 text-emerald-600" /></div></div><p className="text-2xl font-bold tracking-tight text-emerald-600">{formatINR(summary?.advances || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><p className="text-xs font-medium text-muted-foreground">Expenses</p><div className="size-8 rounded-lg bg-rose-50 flex items-center justify-center"><ArrowUpIcon className="size-4 text-rose-600" /></div></div><p className="text-2xl font-bold tracking-tight text-rose-600">{formatINR(summary?.expenses || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><p className="text-xs font-medium text-muted-foreground">Balance Due</p><div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center"><WalletIcon className="size-4 text-amber-600" /></div></div><p className="text-2xl font-bold tracking-tight">{formatINR(summary?.balance || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><p className="text-xs font-medium text-muted-foreground">Profit</p><div className={`size-8 rounded-lg flex items-center justify-center ${(summary?.profit || 0) >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>{(summary?.profit || 0) >= 0 ? <TrendingUpIcon className="size-4 text-emerald-600" /> : <TrendingDownIcon className="size-4 text-rose-600" />}</div></div><p className={`text-2xl font-bold tracking-tight ${(summary?.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatINR(summary?.profit || 0)}</p>{summary && summary.advances > 0 && <p className={`text-xs mt-0.5 ${profitPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}% margin</p>}</CardContent></Card>
      </div>

      {/* Two-column: Advances + Expenses */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500" /> Advances Received
              <span className="text-muted-foreground font-normal">({advances.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {paymentsLoading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
            ) : advances.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-white py-8 text-center">
                <BanknoteIcon className="size-8 text-stone-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No advances recorded</p>
              </div>
            ) : advances.map(renderEntry)}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <div className="size-2 rounded-full bg-rose-500" /> Expenses
              <span className="text-muted-foreground font-normal">({expenses.length})</span>
            </h2>
          </div>
          <div className="space-y-2">
            {paymentsLoading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
            ) : expenses.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-white py-8 text-center">
                <ReceiptIcon className="size-8 text-stone-200 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No expenses recorded</p>
              </div>
            ) : expenses.map(renderEntry)}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <PaymentEntryDialog
        open={entryDialogOpen}
        onOpenChange={setEntryDialogOpen}
        projectId={projectId}
        entry={editingEntry}
      />

      <ConfirmDeleteDialog
        open={!!deleteEntry}
        onOpenChange={(open) => { if (!open) setDeleteEntry(null); }}
        onConfirm={() => deleteEntry && deleteMutation.mutate(deleteEntry.id)}
        title="Delete payment entry?"
        description="This action cannot be undone."
        itemName={deleteEntry ? `${deleteEntry.type === 'advance' ? 'Advance' : 'Expense'} of ${formatINR(deleteEntry.amount)}` : undefined}
        isPending={deleteMutation.isPending}
      />

      {viewReceipt && (
        <FileViewer open onOpenChange={(open) => { if (!open) setViewReceipt(null); }} url={viewReceipt.url} fileName={viewReceipt.name} fileType={viewReceipt.type} />
      )}
    </div>
  );
}
