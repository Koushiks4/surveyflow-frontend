'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/dashboard/stats'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const topStatuses = stats.statuses.slice(0, 2);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.projects.total}</div>
          <p className="text-sm text-muted-foreground">
            {stats.projects.thisMonth} this month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Total Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.clients.total}</div>
        </CardContent>
      </Card>

      {topStatuses.map((status) => (
        <Card key={status.id}>
          <CardHeader>
            <CardTitle>{status.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{status.count}</div>
            <div
              className="mt-2 h-1 rounded-full"
              style={{ backgroundColor: status.color, width: '60%' }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
