'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ClientTable } from '@/components/clients/client-table';
import { useAuth } from '@/providers/auth-provider';
import { PlusIcon } from 'lucide-react';

const canCreate = ['super_admin', 'admin', 'team_lead', 'office_staff'];

export default function ClientsPage() {
  const { user } = useAuth();
  const showAdd = user?.roles.some(r => canCreate.includes(r));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        {showAdd && (
          <Link href="/clients/new" className={buttonVariants()}>
            <PlusIcon />
            Add Client
          </Link>
        )}
      </div>

      <ClientTable />
    </div>
  );
}
