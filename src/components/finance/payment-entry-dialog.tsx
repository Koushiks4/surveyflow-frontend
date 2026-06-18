'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import type { PaymentEntry } from '@/types';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

interface ExpenseCategory {
  id: string;
  name: string;
}

interface PaymentEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  entry?: PaymentEntry | null;
}

export function PaymentEntryDialog({ open, onOpenChange, projectId, entry }: PaymentEntryDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!entry;
  const fileRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<'advance' | 'expense'>('advance');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.get<ExpenseCategory[]>('/api/config/expense-categories'),
    enabled: open,
  });

  useEffect(() => {
    if (entry) {
      setType(entry.type);
      setAmount(String(entry.amount));
      setCategoryId(entry.category?.id || '');
      setPaymentMethod(entry.payment_method || '');
      setDate(entry.date);
      setDescription(entry.description || '');
      setReceiptFile(null);
    } else {
      setType('advance');
      setAmount('');
      setCategoryId('');
      setPaymentMethod('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setReceiptFile(null);
    }
  }, [entry, open]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['project-payments', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-summary', projectId] });
    queryClient.invalidateQueries({ queryKey: ['monthly-report'] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (isNaN(n) || n <= 0) { toast.error('Enter a valid amount'); return; }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.patch(`/api/payments/${entry!.id}`, {
          amount: n,
          categoryId: categoryId || undefined,
          description: description || undefined,
          paymentMethod: paymentMethod || undefined,
          date,
        });
        toast.success('Entry updated');
      } else {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        const formData = new FormData();
        formData.append('projectId', projectId);
        formData.append('type', type);
        formData.append('amount', String(n));
        if (categoryId) formData.append('categoryId', categoryId);
        if (description) formData.append('description', description);
        if (paymentMethod) formData.append('paymentMethod', paymentMethod);
        formData.append('date', date);
        if (receiptFile) formData.append('receipt', receiptFile);

        const res = await fetch(`${API_URL}/api/payments`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        });

        if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Failed'); }
        toast.success('Entry added');
      }

      invalidateAll();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Payment Entry' : 'New Payment Entry'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle — only for create */}
          {!isEdit && (
            <div className="flex rounded-lg border p-0.5 bg-stone-50">
              <button type="button" onClick={() => setType('advance')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${type === 'advance' ? 'bg-white shadow-sm text-emerald-700' : 'text-muted-foreground'}`}>
                Advance
              </button>
              <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${type === 'expense' ? 'bg-white shadow-sm text-rose-700' : 'text-muted-foreground'}`}>
                Expense
              </button>
            </div>
          )}

          {isEdit && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${entry!.type === 'advance' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {entry!.type === 'advance' ? 'Advance' : 'Expense'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7" placeholder="0" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date *</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Payment Method</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full h-8 rounded-lg border border-input bg-transparent px-3 text-sm">
                <option value="">Select</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            {(isEdit ? entry!.type : type) === 'expense' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full h-8 rounded-lg border border-input bg-transparent px-3 text-sm">
                  <option value="">Select</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            ) : <div />}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this for?" />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Receipt (optional)</label>
              <Input ref={fileRef} type="file" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} accept="image/*,application/pdf" />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update' : `Add ${type === 'advance' ? 'Advance' : 'Expense'}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
