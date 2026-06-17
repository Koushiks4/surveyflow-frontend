'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Client } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LocationPicker } from './location-picker';
import { toast } from 'sonner';

const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().min(1, 'Mobile is required'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  address: z.string().optional(),
  locationLat: z.number().nullable(),
  locationLng: z.number().nullable(),
  locationAddress: z.string().nullable(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Client;
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!client;

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      address: '',
      locationLat: null,
      locationLng: null,
      locationAddress: null,
      notes: '',
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        mobile: client.mobile,
        email: client.email || '',
        address: client.address || '',
        locationLat: client.location_lat,
        locationLng: client.location_lng,
        locationAddress: client.location_address,
        notes: client.notes || '',
      });
    }
  }, [client, form]);

  const mutation = useMutation({
    mutationFn: async (data: ClientFormData): Promise<Client> => {
      if (isEdit) {
        return api.patch<Client>(`/api/clients/${client.id}`, data);
      }
      return api.post<Client>('/api/clients', data);
    },
    onSuccess: (data: Client) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] });
      toast.success(isEdit ? 'Client updated successfully' : 'Client created successfully');
      router.push(`/clients/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save client');
    },
  });

  const onSubmit = (data: ClientFormData) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '' && v !== null)
    );
    mutation.mutate(cleaned as ClientFormData);
  };

  const handleLocationChange = (lat: number, lng: number, address: string) => {
    form.setValue('locationLat', lat);
    form.setValue('locationLng', lng);
    form.setValue('locationAddress', address);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            {...form.register('name')}
            aria-invalid={!!form.formState.errors.name}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile *</Label>
          <Input
            id="mobile"
            {...form.register('mobile')}
            aria-invalid={!!form.formState.errors.mobile}
          />
          {form.formState.errors.mobile && (
            <p className="text-xs text-destructive">
              {form.formState.errors.mobile.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...form.register('email')}
          aria-invalid={!!form.formState.errors.email}
        />
        {form.formState.errors.email && (
          <p className="text-xs text-destructive">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          {...form.register('address')}
        />
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

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...form.register('notes')}
          placeholder="Additional notes about the client..."
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {isEdit ? 'Update' : 'Create'} Client
        </Button>
      </div>
    </form>
  );
}
