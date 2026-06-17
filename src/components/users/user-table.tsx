'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EditIcon } from 'lucide-react';

interface UserTableProps {
  onEdit?: (user: User) => void;
}

export function UserTable({ onEdit }: UserTableProps) {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/api/users'),
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

  if (!users?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No users found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Roles</TableHead>
          <TableHead>Status</TableHead>
          {onEdit && <TableHead className="w-[80px]"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.full_name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.phone || '-'}</TableCell>
            <TableCell>
              <div className="flex gap-1 flex-wrap">
                {user.roles.map((role) => (
                  <Badge key={role.id} variant="secondary">
                    {role.display_name}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={user.is_active ? 'default' : 'outline'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            {onEdit && (
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(user)}
                >
                  <EditIcon />
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
