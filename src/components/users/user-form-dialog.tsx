'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User, Role } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/providers/auth-provider';
import { toast } from 'sonner';

const createUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
});

const editUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  isActive: z.boolean(),
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isEdit = !!user;
  const isSelf = isEdit && user.id === currentUser?.id;

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<Role[]>('/api/users/roles'),
    enabled: open,
  });

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
      roleIds: [],
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      isActive: true,
      roleIds: [],
    },
  });

  useEffect(() => {
    if (user && isEdit) {
      editForm.reset({
        fullName: user.full_name,
        phone: user.phone || '',
        isActive: user.is_active,
        roleIds: user.roles.map((r) => r.id),
      });
    } else if (!user) {
      createForm.reset({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        roleIds: [],
      });
    }
  }, [user, isEdit, editForm, createForm]);

  const createMutation = useMutation({
    mutationFn: (data: CreateUserFormData) =>
      api.post('/api/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      onOpenChange(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create user');
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: EditUserFormData) => {
      const payload = isSelf
        ? { fullName: data.fullName, phone: data.phone }
        : data;
      return api.patch(`/api/users/${user!.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update user');
    },
  });

  const onSubmitCreate = (data: CreateUserFormData) => {
    createMutation.mutate(data);
  };

  const onSubmitEdit = (data: EditUserFormData) => {
    editMutation.mutate(data);
  };

  const roleIds = isEdit ? editForm.watch('roleIds') : createForm.watch('roleIds');

  const toggleRole = (roleId: string) => {
    const current = roleIds || [];
    if (current.includes(roleId)) {
      if (isEdit) {
        editForm.setValue('roleIds', current.filter((id) => id !== roleId));
      } else {
        createForm.setValue('roleIds', current.filter((id) => id !== roleId));
      }
    } else {
      if (isEdit) {
        editForm.setValue('roleIds', [...current, roleId]);
      } else {
        createForm.setValue('roleIds', [...current, roleId]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Add User'}</DialogTitle>
        </DialogHeader>

        {isEdit ? (
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                {...editForm.register('fullName')}
                aria-invalid={!!editForm.formState.errors.fullName}
              />
              {editForm.formState.errors.fullName && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...editForm.register('phone')}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={editForm.watch('isActive')}
                onCheckedChange={(checked) =>
                  editForm.setValue('isActive', !!checked)
                }
                disabled={isSelf}
              />
              <Label htmlFor="isActive" className={isSelf ? 'text-muted-foreground' : ''}>Active</Label>
            </div>

            <div className="space-y-2">
              <Label>Roles *</Label>
              {isSelf && (
                <p className="text-xs text-muted-foreground">You cannot change your own roles. Ask another admin to update them.</p>
              )}
              <div className="space-y-2">
                {roles?.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={roleIds?.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                      disabled={isSelf}
                    />
                    <Label htmlFor={`role-${role.id}`} className={isSelf ? 'text-muted-foreground' : ''}>{role.display_name}</Label>
                  </div>
                ))}
              </div>
              {editForm.formState.errors.roleIds && (
                <p className="text-xs text-destructive">
                  {editForm.formState.errors.roleIds.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editMutation.isPending}
              >
                Update
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                {...createForm.register('fullName')}
                aria-invalid={!!createForm.formState.errors.fullName}
              />
              {createForm.formState.errors.fullName && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...createForm.register('email')}
                aria-invalid={!!createForm.formState.errors.email}
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                {...createForm.register('password')}
                aria-invalid={!!createForm.formState.errors.password}
              />
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...createForm.register('phone')}
              />
            </div>

            <div className="space-y-2">
              <Label>Roles *</Label>
              <div className="space-y-2">
                {roles?.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={roleIds?.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <Label htmlFor={`role-${role.id}`}>{role.display_name}</Label>
                  </div>
                ))}
              </div>
              {createForm.formState.errors.roleIds && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.roleIds.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                Create
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
