'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Project, Client, PaginatedResponse, ProjectStatus } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchIcon, LoaderIcon, ChevronDownIcon, DownloadIcon } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function ProjectTable() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: statuses } = useQuery({
    queryKey: ['project-statuses'],
    queryFn: () => api.get<ProjectStatus[]>('/api/config/project-statuses'),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => api.get<PaginatedResponse<Client>>('/api/clients?limit=100'),
  });

  const clients = clientsData?.data || [];

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['projects', debouncedSearch, statusId, clientId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusId) params.set('statusId', statusId);
      if (clientId) params.set('clientId', clientId);
      return api.get<PaginatedResponse<Project>>(`/api/projects?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  const projects = data?.data || [];

  const exportToExcel = useCallback(() => {
    if (!projects.length) return;

    const rows = projects.map((p) => ({
      'Project #': p.project_number,
      'Title': p.title,
      'Client': p.client?.name || '',
      'Type': p.project_type?.name || '',
      'Status': p.status?.name || '',
      'Description': p.description || '',
      'Location': p.location_address || '',
      'Start Date': p.start_date ? format(new Date(p.start_date), 'dd/MM/yyyy') : '',
      'Expected End': p.expected_end_date ? format(new Date(p.expected_end_date), 'dd/MM/yyyy') : '',
      'Team': p.project_assignments?.map(a => `${a.user?.full_name} (${a.role?.display_name})`).join(', ') || '',
      'Created': format(new Date(p.created_at), 'dd/MM/yyyy'),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0]).map((key) => {
      const maxLen = Math.max(key.length, ...rows.map(r => String((r as Record<string, string>)[key] || '').length));
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');
    XLSX.writeFile(wb, `projects-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, [projects]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {isFetching && (
            <LoaderIcon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
          )}
        </div>

        <div className="relative">
          <select
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
            className="h-8 w-[180px] appearance-none rounded-lg border border-input bg-transparent py-2 pr-8 pl-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All statuses</option>
            {statuses?.map((status) => (
              <option key={status.id} value={status.id}>{status.name}</option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        </div>

        <div className="relative">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-8 w-[180px] appearance-none rounded-lg border border-input bg-transparent py-2 pr-8 pl-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        </div>

        <div className="ml-auto">
          <Button
            variant="outline"
            size="default"
            onClick={exportToExcel}
            disabled={!projects.length}
          >
            <DownloadIcon />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {debouncedSearch || statusId || clientId ? 'No projects matching your filters' : 'No projects yet'}
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-sm">{project.project_number}</TableCell>
                  <TableCell className="font-medium">{project.title}</TableCell>
                  <TableCell>{project.client?.name}</TableCell>
                  <TableCell>{project.project_type?.name || '—'}</TableCell>
                  <TableCell>
                    {project.status && (
                      <Badge style={{ backgroundColor: project.status.color, color: '#fff' }}>
                        {project.status.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(project.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
