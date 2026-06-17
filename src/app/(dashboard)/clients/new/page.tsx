'use client';

import { ClientForm } from '@/components/clients/client-form';

export default function NewClientPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">New Client</h1>
      <ClientForm />
    </div>
  );
}
