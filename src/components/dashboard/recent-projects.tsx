'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Project } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export function RecentProjects() {
  const router = useRouter();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['dashboard-recent-projects'],
    queryFn: () => api.get<Project[]>('/api/dashboard/recent-projects?limit=10'),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!projects?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No recent projects
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project #</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow
            key={project.id}
            onClick={() => router.push(`/projects/${project.id}`)}
            className="cursor-pointer"
          >
            <TableCell className="font-medium">
              {project.project_number}
            </TableCell>
            <TableCell>{project.title}</TableCell>
            <TableCell>{project.client.name}</TableCell>
            <TableCell>
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
            </TableCell>
            <TableCell>
              {format(new Date(project.created_at), 'MMM d, yyyy')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
