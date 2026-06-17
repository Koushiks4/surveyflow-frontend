'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User, Role } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { XIcon, PlusIcon } from 'lucide-react';

interface Assignment {
  userId: string;
  roleId: string;
}

interface AssignmentFormProps {
  assignments: Assignment[];
  onChange: (assignments: Assignment[]) => void;
}

export function AssignmentForm({ assignments, onChange }: AssignmentFormProps) {
  const { data: users } = useQuery({
    queryKey: ['users-directory'],
    queryFn: () => api.get<Pick<User, 'id' | 'full_name' | 'roles'>[]>('/api/users/directory'),
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<Role[]>('/api/users/roles'),
  });

  const addAssignment = () => {
    onChange([...assignments, { userId: '', roleId: '' }]);
  };

  const removeAssignment = (index: number) => {
    onChange(assignments.filter((_, i) => i !== index));
  };

  const updateAssignment = (index: number, field: 'userId' | 'roleId', value: string) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const assignedUserIds = assignments.map(a => a.userId).filter(Boolean);

  const getAvailableUsers = (currentUserId: string) =>
    users?.filter(u => u.id === currentUserId || !assignedUserIds.includes(u.id)) || [];

  const getUserName = (userId: string) =>
    users?.find(u => u.id === userId)?.full_name;

  const getRoleName = (roleId: string) =>
    roles?.find(r => r.id === roleId)?.display_name;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Team Members</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAssignment}
          disabled={!!users && assignedUserIds.length >= users.length}
        >
          <PlusIcon />
          Add Member
        </Button>
      </div>

      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No team members assigned yet
        </p>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1">
                <Select
                  value={assignment.userId || undefined}
                  onValueChange={(value) => updateAssignment(index, 'userId', value || '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select user">
                      {getUserName(assignment.userId) || 'Select user'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableUsers(assignment.userId).map((user) => (
                      <SelectItem key={user.id} value={user.id} label={user.full_name}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <Select
                  value={assignment.roleId || undefined}
                  onValueChange={(value) => updateAssignment(index, 'roleId', value || '')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role">
                      {getRoleName(assignment.roleId) || 'Select role'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id} label={role.display_name}>
                        {role.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeAssignment(index)}
              >
                <XIcon />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
