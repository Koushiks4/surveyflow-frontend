'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AttendanceLog, PaginatedResponse } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MapPinIcon, LogInIcon, LogOutIcon, ClockIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface AttendanceLogProps {
  projectId: string;
  isAssigned: boolean;
}

export function AttendanceLogView({ projectId, isAssigned }: AttendanceLogProps) {
  const queryClient = useQueryClient();
  const [gpsError, setGpsError] = useState<string | null>(null);

  const { data: activeCheckIn } = useQuery({
    queryKey: ['attendance', 'active'],
    queryFn: () => api.get<AttendanceLog | null>('/api/attendance/active'),
    enabled: isAssigned,
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['attendance', projectId],
    queryFn: () => api.get<PaginatedResponse<AttendanceLog>>(`/api/attendance/project/${projectId}`),
  });

  const isCheckedInHere = activeCheckIn?.project_id === projectId;
  const isCheckedInElsewhere = activeCheckIn && activeCheckIn.project_id !== projectId;

  const getPosition = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error(`GPS error: ${err.message}`)),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      setGpsError(null);
      const { lat, lng } = await getPosition();
      return api.post('/api/attendance/check-in', { projectId, lat, lng });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Checked in successfully');
    },
    onError: (err: Error) => {
      if (err.message.includes('GPS')) setGpsError(err.message);
      else toast.error(err.message);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      setGpsError(null);
      const { lat, lng } = await getPosition();
      return api.post('/api/attendance/check-out', { lat, lng });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Checked out successfully');
    },
    onError: (err: Error) => {
      if (err.message.includes('GPS')) setGpsError(err.message);
      else toast.error(err.message);
    },
  });

  return (
    <div className="space-y-6">
      {isAssigned && (
        <div className="flex items-center gap-3">
          {isCheckedInHere ? (
            <Button
              variant="destructive"
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
            >
              <LogOutIcon className="mr-1" />
              {checkOutMutation.isPending ? 'Checking out...' : 'Check Out'}
            </Button>
          ) : (
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending || !!isCheckedInElsewhere}
            >
              <LogInIcon className="mr-1" />
              {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
            </Button>
          )}
          {isCheckedInHere && (
            <Badge variant="default" className="bg-green-600">
              <MapPinIcon className="size-3 mr-1" /> Active
            </Badge>
          )}
          {isCheckedInElsewhere && (
            <p className="text-sm text-muted-foreground">
              You are checked in to another project. Check out first.
            </p>
          )}
          {gpsError && <p className="text-sm text-red-500">{gpsError}</p>}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Visit History</h3>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : !logs?.data?.length ? (
          <p className="text-sm text-muted-foreground py-4">No site visits recorded yet</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {logs.data.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{log.user?.full_name}</span>
                    {!log.check_out_at && (
                      <Badge variant="default" className="bg-green-600 text-[10px]">On Site</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3" />
                      {format(new Date(log.check_in_at), 'dd MMM yyyy, HH:mm')}
                    </span>
                    {log.check_out_at && (
                      <span>→ {format(new Date(log.check_out_at), 'HH:mm')}</span>
                    )}
                  </div>
                </div>
                {log.check_out_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.check_in_at), { addSuffix: false })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
