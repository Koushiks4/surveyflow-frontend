'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Project, Client, ProjectType, ProjectStatus, PaginatedResponse } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationPicker } from '@/components/clients/location-picker';
import { AssignmentForm } from './assignment-form';
import { toast } from 'sonner';

const projectSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  projectTypeId: z.string().optional(),
  statusId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  locationLat: z.number().nullable(),
  locationLng: z.number().nullable(),
  locationAddress: z.string().nullable(),
  assignments: z.array(z.object({
    userId: z.string(),
    roleId: z.string(),
  })),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  project?: Project;
}

export function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!project;

  const [assignments, setAssignments] = useState<Array<{ userId: string; roleId: string }>>([]);

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: () => api.get<PaginatedResponse<Client>>('/api/clients?limit=100'),
  });

  const { data: projectTypes } = useQuery({
    queryKey: ['project-types'],
    queryFn: () => api.get<ProjectType[]>('/api/config/project-types'),
  });

  const { data: projectStatuses } = useQuery({
    queryKey: ['project-statuses'],
    queryFn: () => api.get<ProjectStatus[]>('/api/config/project-statuses'),
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      clientId: '',
      projectTypeId: '',
      statusId: '',
      title: '',
      description: '',
      startDate: '',
      expectedEndDate: '',
      locationLat: null,
      locationLng: null,
      locationAddress: null,
      assignments: [],
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        clientId: project.client.id,
        projectTypeId: project.project_type?.id || '',
        statusId: project.status?.id || '',
        title: project.title,
        description: project.description || '',
        startDate: project.start_date || '',
        expectedEndDate: project.expected_end_date || '',
        locationLat: project.location_lat,
        locationLng: project.location_lng,
        locationAddress: project.location_address,
        assignments: [],
      });

      setAssignments(
        project.project_assignments.map((pa) => ({
          userId: pa.user.id,
          roleId: pa.role.id,
        }))
      );
    }
  }, [project, form]);

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) => {
      const payload = {
        ...data,
        projectTypeId: data.projectTypeId || undefined,
        description: data.description || undefined,
        startDate: data.startDate || undefined,
        expectedEndDate: data.expectedEndDate || undefined,
        assignments: assignments.filter(a => a.userId && a.roleId),
      };
      return api.post<Project>('/api/projects', payload);
    },
    onSuccess: (data: Project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
      router.push(`/projects/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create project');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const payload = {
        projectTypeId: data.projectTypeId || undefined,
        statusId: data.statusId || undefined,
        title: data.title,
        description: data.description || undefined,
        startDate: data.startDate || undefined,
        expectedEndDate: data.expectedEndDate || undefined,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        locationAddress: data.locationAddress,
      };
      const updated = await api.patch<Project>(`/api/projects/${project!.id}`, payload);

      await api.put(`/api/projects/${project!.id}/assignments`, {
        assignments: assignments.filter(a => a.userId && a.roleId),
      });

      return updated;
    },
    onSuccess: (data: Project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', data.id] });
      toast.success('Project updated successfully');
      router.push(`/projects/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update project');
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleLocationChange = (lat: number, lng: number, address: string) => {
    form.setValue('locationLat', lat);
    form.setValue('locationLng', lng);
    form.setValue('locationAddress', address);
  };

  const clients = clientsData?.data || [];
  const selectedClient = clients.find(c => c.id === form.watch('clientId'));
  const selectedType = projectTypes?.find(t => t.id === form.watch('projectTypeId'));
  const selectedStatus = projectStatuses?.find(s => s.id === form.watch('statusId'));

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="clientId">Client *</Label>
        <Select
          value={form.watch('clientId') || undefined}
          onValueChange={(value) => form.setValue('clientId', value || '')}
          disabled={isEdit}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select client">
              {selectedClient?.name || 'Select client'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id} label={client.name}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.clientId && (
          <p className="text-xs text-destructive">
            {form.formState.errors.clientId.message}
          </p>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${isEdit ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            {...form.register('title')}
            aria-invalid={!!form.formState.errors.title}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-destructive">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectTypeId">Project Type</Label>
          <Select
            value={form.watch('projectTypeId') || undefined}
            onValueChange={(value) => form.setValue('projectTypeId', value || undefined)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type">
                {selectedType?.name || 'Select type'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {projectTypes?.map((type) => (
                <SelectItem key={type.id} value={type.id} label={type.name}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isEdit && (
          <div className="space-y-2">
            <Label htmlFor="statusId">Status</Label>
            <Select
              value={form.watch('statusId') || undefined}
              onValueChange={(value) => form.setValue('statusId', value || '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status">
                  {selectedStatus?.name || 'Select status'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projectStatuses?.map((status) => (
                  <SelectItem key={status.id} value={status.id} label={status.name}>
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          placeholder="Project description..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            {...form.register('startDate')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedEndDate">Expected End Date</Label>
          <Input
            id="expectedEndDate"
            type="date"
            {...form.register('expectedEndDate')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location</Label>
        <LocationPicker
          lat={form.watch('locationLat')}
          lng={form.watch('locationLng')}
          address={form.watch('locationAddress')}
          onChange={handleLocationChange}
        />
      </div>

      <AssignmentForm
        assignments={assignments}
        onChange={setAssignments}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {isEdit ? 'Update' : 'Create'} Project
        </Button>
      </div>
    </form>
  );
}
