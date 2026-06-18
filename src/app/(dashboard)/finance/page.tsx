'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { MonthlyReport } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpDownIcon,
  IndianRupeeIcon,
  TrendingUpIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from 'lucide-react';

function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

type SortKey = 'project_number' | 'client_name' | 'quoted' | 'advances' | 'expenses' | 'balance' | 'profit';
type SortDirection = 'asc' | 'desc';

export default function FinancePage() {
  const { user } = useAuth();
  const router = useRouter();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [sortKey, setSortKey] = useState<SortKey>('project_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: report, isLoading } = useQuery({
    queryKey: ['monthly-report', selectedYear, selectedMonth],
    queryFn: () => api.get<MonthlyReport>(`/api/payments/report/monthly?year=${selectedYear}&month=${selectedMonth}`),
  });

  const sortedProjects = useMemo(() => {
    if (!report?.projects) return [];
    return [...report.projects].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal as string).toLowerCase(); }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [report?.projects, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection('asc'); }
  };

  const canView = user?.roles.some(r => ['super_admin', 'admin', 'team_lead'].includes(r));

  if (!canView) {
    return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">No permission.</p></div>;
  }

  const SortHeader = ({ column, label, align = 'left' }: { column: SortKey; label: string; align?: string }) => (
    <th className={`px-4 py-3 text-${align}`}>
      <button onClick={() => handleSort(column)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDownIcon className={`size-3 ${sortKey === column ? 'text-indigo-500' : ''}`} />
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="h-8 rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(2000, m - 1).toLocaleDateString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-8 rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => today.getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Total Quoted</p>
                <div className="size-8 rounded-lg bg-indigo-50 flex items-center justify-center"><IndianRupeeIcon className="size-4 text-indigo-600" /></div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{formatINR(report?.totals.quoted || 0)}</p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Total Received</p>
                <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center"><ArrowDownIcon className="size-4 text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-emerald-600">{formatINR(report?.totals.advances || 0)}</p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
                <div className="size-8 rounded-lg bg-rose-50 flex items-center justify-center"><ArrowUpIcon className="size-4 text-rose-600" /></div>
              </div>
              <p className="text-2xl font-bold tracking-tight text-rose-600">{formatINR(report?.totals.expenses || 0)}</p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">Net Profit</p>
                <div className={`size-8 rounded-lg flex items-center justify-center ${(report?.totals.profit || 0) >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <TrendingUpIcon className={`size-4 ${(report?.totals.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold tracking-tight ${(report?.totals.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatINR(report?.totals.profit || 0)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Project Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-stone-50/80">
              <tr className="text-xs font-medium text-muted-foreground">
                <SortHeader column="project_number" label="Project #" />
                <SortHeader column="client_name" label="Client" />
                <SortHeader column="quoted" label="Quoted" align="right" />
                <SortHeader column="advances" label="Received" align="right" />
                <SortHeader column="expenses" label="Expenses" align="right" />
                <SortHeader column="balance" label="Balance" align="right" />
                <SortHeader column="profit" label="Profit" align="right" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No payment data for this period
                  </td>
                </tr>
              ) : (
                sortedProjects.map(project => (
                  <tr
                    key={project.project_id}
                    onClick={() => router.push(`/finance/${project.project_id}`)}
                    className="hover:bg-stone-50 cursor-pointer text-sm transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs font-medium">{project.project_number}</td>
                    <td className="px-4 py-3.5">{project.client_name}</td>
                    <td className="px-4 py-3.5 text-right">{formatINR(project.quoted)}</td>
                    <td className="px-4 py-3.5 text-right text-emerald-600 font-medium">{formatINR(project.advances)}</td>
                    <td className="px-4 py-3.5 text-right text-rose-600 font-medium">{formatINR(project.expenses)}</td>
                    <td className="px-4 py-3.5 text-right">{formatINR(project.balance)}</td>
                    <td className={`px-4 py-3.5 text-right font-semibold ${project.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatINR(project.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {sortedProjects.length > 0 && (
              <tfoot className="border-t bg-stone-50/50">
                <tr className="text-sm font-semibold">
                  <td className="px-4 py-3" colSpan={2}>Totals</td>
                  <td className="px-4 py-3 text-right">{formatINR(report?.totals.quoted || 0)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatINR(report?.totals.advances || 0)}</td>
                  <td className="px-4 py-3 text-right text-rose-600">{formatINR(report?.totals.expenses || 0)}</td>
                  <td className="px-4 py-3 text-right">{formatINR(report?.totals.balance || 0)}</td>
                  <td className={`px-4 py-3 text-right ${(report?.totals.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatINR(report?.totals.profit || 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
