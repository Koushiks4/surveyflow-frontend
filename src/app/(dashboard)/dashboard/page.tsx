'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentProjects } from '@/components/dashboard/recent-projects';
import {
  PackageIcon,
  CheckCircle2Icon,
  CircleIcon,
  AlertCircleIcon,
  ClipboardCheckIcon,
  FileIcon,
  ArrowRightIcon,
} from 'lucide-react';

interface DeliveryProject {
  id: string;
  project_number: string;
  title: string;
  client_name: string;
  status: { name: string; color: string } | null;
  deliverables_count: number;
  checklist_total: number;
  checklist_completed: number;
  delivery_confirmed: boolean;
}

interface DeliveryTracker {
  pending: DeliveryProject[];
  delivered: DeliveryProject[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const canManage = user?.roles.some(r => ['super_admin', 'admin', 'team_lead'].includes(r));

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/api/dashboard/stats'),
  });

  const { data: deliveryTracker, isLoading: trackerLoading } = useQuery({
    queryKey: ['delivery-tracker'],
    queryFn: () => api.get<DeliveryTracker>('/api/dashboard/delivery-tracker'),
    enabled: canManage,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.fullName}</p>
      </div>

      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Tracker — only for Team Lead+ */}
          {canManage && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <PackageIcon className="size-5 text-indigo-600" />
                  <CardTitle>Delivery Tracker</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {trackerLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Pending Delivery */}
                    {(deliveryTracker?.pending?.length || 0) > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <AlertCircleIcon className="size-4 text-amber-500" />
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Pending Delivery ({deliveryTracker!.pending.length})
                          </h3>
                        </div>
                        <div className="space-y-1.5">
                          {deliveryTracker!.pending.map(project => (
                            <button
                              key={project.id}
                              onClick={() => router.push(`/projects/${project.id}`)}
                              className="w-full flex items-center gap-3 rounded-lg border bg-white p-3 text-left hover:border-indigo-200 hover:shadow-sm transition-all group"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">{project.project_number}</span>
                                  {project.status && (
                                    <Badge className="text-[10px]" style={{ backgroundColor: project.status.color, color: '#fff' }}>
                                      {project.status.name}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium mt-0.5 truncate">{project.title}</p>
                                <p className="text-xs text-muted-foreground">{project.client_name}</p>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-center">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <FileIcon className="size-3" />
                                    <span className="font-medium">{project.deliverables_count}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">Files</p>
                                </div>
                                <div className="text-center">
                                  <div className="flex items-center gap-1 text-xs">
                                    <ClipboardCheckIcon className="size-3 text-muted-foreground" />
                                    <span className={`font-medium ${project.checklist_completed === project.checklist_total && project.checklist_total > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                      {project.checklist_completed}/{project.checklist_total}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">Checklist</p>
                                </div>
                                <div className="text-center">
                                  {project.delivery_confirmed ? (
                                    <CheckCircle2Icon className="size-4 text-emerald-500 mx-auto" />
                                  ) : (
                                    <CircleIcon className="size-4 text-stone-300 mx-auto" />
                                  )}
                                  <p className="text-[10px] text-muted-foreground">Confirmed</p>
                                </div>
                                <ArrowRightIcon className="size-4 text-stone-300 group-hover:text-indigo-500 transition-colors" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recently Delivered */}
                    {(deliveryTracker?.delivered?.length || 0) > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <CheckCircle2Icon className="size-4 text-emerald-500" />
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Delivered ({deliveryTracker!.delivered.length})
                          </h3>
                        </div>
                        <div className="space-y-1.5">
                          {deliveryTracker!.delivered.map(project => (
                            <button
                              key={project.id}
                              onClick={() => router.push(`/projects/${project.id}`)}
                              className="w-full flex items-center gap-3 rounded-lg border bg-emerald-50/30 border-emerald-100 p-3 text-left hover:shadow-sm transition-all group"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-muted-foreground">{project.project_number}</span>
                                  {project.status && (
                                    <Badge className="text-[10px]" style={{ backgroundColor: project.status.color, color: '#fff' }}>
                                      {project.status.name}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium mt-0.5 truncate">{project.title}</p>
                                <p className="text-xs text-muted-foreground">{project.client_name}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <CheckCircle2Icon className="size-5 text-emerald-500" />
                                <ArrowRightIcon className="size-4 text-stone-300 group-hover:text-indigo-500 transition-colors" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!deliveryTracker?.pending?.length && !deliveryTracker?.delivered?.length && (
                      <p className="text-sm text-muted-foreground text-center py-6">No active delivery tracking</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentProjects />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.statuses && stats.statuses.length > 0 ? (
                <div className="space-y-3">
                  {stats.statuses.map((status) => (
                    <div key={status.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-sm">{status.name}</span>
                      </div>
                      <span className="text-sm font-medium">{status.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
