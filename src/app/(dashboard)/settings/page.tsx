'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Organization, ProjectType, ProjectStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PlusIcon, Trash2Icon, AlertTriangleIcon } from 'lucide-react';

interface ExpenseCategory {
  id: string;
  name: string;
  is_active: boolean;
}

interface DeleteTarget {
  id: string;
  name: string;
  endpoint: string;
  queryKey: string;
}

function ConfirmDeleteDialog({
  target,
  onClose,
}: {
  target: DeleteTarget | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [blocked, setBlocked] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(target!.endpoint),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [target!.queryKey] });
      toast.success(`"${target!.name}" deleted`);
      onClose();
    },
    onError: (error: Error) => {
      if (error.message.includes('active project')) {
        setBlocked(error.message);
      } else {
        toast.error(error.message);
        onClose();
      }
    },
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setBlocked(null);
      onClose();
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        {blocked ? (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-amber-50">
                <AlertTriangleIcon className="size-5 text-amber-600" />
              </div>
              <DialogTitle className="text-center">Cannot Delete</DialogTitle>
              <DialogDescription className="text-center">
                {blocked}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" className="w-full sm:w-auto" />}>
                Understood
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-red-50">
                <Trash2Icon className="size-5 text-red-600" />
              </div>
              <DialogTitle className="text-center">Delete "{target?.name}"?</DialogTitle>
              <DialogDescription className="text-center">
                This action cannot be undone. This will permanently remove this item from your configuration.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" className="w-full sm:w-auto" />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfigList({
  items,
  onAdd,
  onRequestDelete,
  isAdding,
}: {
  items: Array<{ id: string; name: string }>;
  onAdd: (name: string) => void;
  onRequestDelete: (item: { id: string; name: string }) => void;
  isAdding: boolean;
}) {
  const [newItemName, setNewItemName] = useState('');

  const handleAdd = () => {
    if (newItemName.trim()) {
      onAdd(newItemName.trim());
      setNewItemName('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Add new item..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button onClick={handleAdd} disabled={isAdding || !newItemName.trim()} size="default">
          <PlusIcon />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No items configured yet</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <span className="text-sm font-medium">{item.name}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-red-600"
                onClick={() => onRequestDelete(item)}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data: organization } = useQuery({
    queryKey: ['organization'],
    queryFn: () => api.get<Organization>('/api/config/organization'),
  });

  const { data: projectTypes } = useQuery({
    queryKey: ['project-types'],
    queryFn: () => api.get<ProjectType[]>('/api/config/project-types'),
  });

  const { data: projectStatuses } = useQuery({
    queryKey: ['project-statuses'],
    queryFn: () => api.get<ProjectStatus[]>('/api/config/project-statuses'),
  });

  const { data: expenseCategories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.get<ExpenseCategory[]>('/api/config/expense-categories'),
  });

  const [orgName, setOrgName] = useState('');
  const [projectIdPrefix, setProjectIdPrefix] = useState('');
  const [newStatusName, setNewStatusName] = useState('');

  const updateOrgMutation = useMutation({
    mutationFn: (data: { name?: string; projectIdPrefix?: string }) =>
      api.patch('/api/config/organization', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Organization updated');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addProjectTypeMutation = useMutation({
    mutationFn: (name: string) => api.post('/api/config/project-types', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      toast.success('Project type added');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addProjectStatusMutation = useMutation({
    mutationFn: (name: string) => api.post('/api/config/project-statuses', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-statuses'] });
      toast.success('Project status added');
      setNewStatusName('');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addExpenseCategoryMutation = useMutation({
    mutationFn: (name: string) => api.post('/api/config/expense-categories', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category added');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSaveOrganization = () => {
    const updates: { name?: string; projectIdPrefix?: string } = {};
    if (orgName && orgName !== organization?.name) updates.name = orgName;
    if (projectIdPrefix && projectIdPrefix !== organization?.project_id_prefix)
      updates.projectIdPrefix = projectIdPrefix;

    if (Object.keys(updates).length > 0) {
      updateOrgMutation.mutate(updates);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName" className="text-xs text-muted-foreground">Name</Label>
              <Input
                id="orgName"
                placeholder={organization?.name || 'Organization name'}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="projectIdPrefix" className="text-xs text-muted-foreground">Project ID Prefix</Label>
              <Input
                id="projectIdPrefix"
                placeholder={organization?.project_id_prefix || 'PRJ'}
                value={projectIdPrefix}
                onChange={(e) => setProjectIdPrefix(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Next project: {organization?.project_id_prefix || 'PRJ'}-{new Date().getFullYear()}-{String((organization?.project_id_counter || 0) + 1).padStart(4, '0')}
            </p>
            <Button
              size="sm"
              onClick={handleSaveOrganization}
              disabled={updateOrgMutation.isPending || (!orgName && !projectIdPrefix)}
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="project-types">
            <TabsList>
              <TabsTrigger value="project-types">
                Project Types
                {projectTypes && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{projectTypes.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="project-statuses">
                Statuses
                {projectStatuses && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{projectStatuses.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="expense-categories">
                Expenses
                {expenseCategories && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{expenseCategories.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="project-types" className="mt-4">
              <ConfigList
                items={projectTypes || []}
                onAdd={(name) => addProjectTypeMutation.mutate(name)}
                onRequestDelete={(item) =>
                  setDeleteTarget({
                    ...item,
                    endpoint: `/api/config/project-types/${item.id}`,
                    queryKey: 'project-types',
                  })
                }
                isAdding={addProjectTypeMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="project-statuses" className="mt-4">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new status..."
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newStatusName.trim()) {
                        e.preventDefault();
                        addProjectStatusMutation.mutate(newStatusName.trim());
                      }
                    }}
                  />
                  <Button
                    onClick={() => newStatusName.trim() && addProjectStatusMutation.mutate(newStatusName.trim())}
                    disabled={addProjectStatusMutation.isPending || !newStatusName.trim()}
                  >
                    <PlusIcon />
                    Add
                  </Button>
                </div>

                {!projectStatuses?.length ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No statuses configured yet</p>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {projectStatuses.map((status) => (
                      <div
                        key={status.id}
                        className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="size-3 rounded-full ring-1 ring-black/10"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="text-sm font-medium">{status.name}</span>
                          {status.is_default && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-red-600"
                          onClick={() =>
                            setDeleteTarget({
                              id: status.id,
                              name: status.name,
                              endpoint: `/api/config/project-statuses/${status.id}`,
                              queryKey: 'project-statuses',
                            })
                          }
                          disabled={status.is_default}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="expense-categories" className="mt-4">
              <ConfigList
                items={expenseCategories || []}
                onAdd={(name) => addExpenseCategoryMutation.mutate(name)}
                onRequestDelete={(item) =>
                  setDeleteTarget({
                    ...item,
                    endpoint: `/api/config/expense-categories/${item.id}`,
                    queryKey: 'expense-categories',
                  })
                }
                isAdding={addExpenseCategoryMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
