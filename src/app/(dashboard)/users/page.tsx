'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserTable } from '@/components/users/user-table';
import { UserFormDialog } from '@/components/users/user-form-dialog';
import { useAuth } from '@/providers/auth-provider';
import type { User } from '@/types';
import { PlusIcon } from 'lucide-react';

const canManage = ['super_admin', 'admin'];

export default function UsersPage() {
  const { user } = useAuth();
  const showAdd = user?.roles.some(r => canManage.includes(r));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        {showAdd && (
          <Button onClick={() => setDialogOpen(true)}>
            <PlusIcon />
            Add User
          </Button>
        )}
      </div>

      <UserTable onEdit={showAdd ? handleEdit : undefined} />

      <UserFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        user={selectedUser}
      />
    </div>
  );
}
