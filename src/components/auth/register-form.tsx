'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const registerSchema = z.object({
  organizationName: z.string().min(2, 'Min 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  fullName: z.string().min(2, 'Min 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  phone: z.string().optional(),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterValues) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Registration failed');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      toast.success('Organization registered successfully');
      router.push('/');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="organizationName">Organization Name</Label>
        <Input id="organizationName" {...register('organizationName')} placeholder="Sathyananda Surveys" />
        {errors.organizationName && <p className="text-sm text-red-500">{errors.organizationName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">Organization Slug</Label>
        <Input id="slug" {...register('slug')} placeholder="sathyananda-surveys" />
        {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Your Full Name</Label>
        <Input id="fullName" {...register('fullName')} placeholder="John Doe" />
        {errors.fullName && <p className="text-sm text-red-500">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} placeholder="admin@company.com" />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} placeholder="••••••••" />
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" {...register('phone')} placeholder="+91 98765 43210" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Register Organization'}
      </Button>
    </form>
  );
}
