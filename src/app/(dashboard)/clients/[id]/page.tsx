'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Client } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientForm } from '@/components/clients/client-form';
import { format } from 'date-fns';

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = use(params);

  const { data: client, isLoading } = useQuery({
    queryKey: ['clients', id],
    queryFn: () => api.get<Client>(`/api/clients/${id}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Client not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <p className="text-muted-foreground">{client.email || client.mobile}</p>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">
            Documents {client.documents && `(${client.documents.length})`}
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects {client.projects && `(${client.projects.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <ClientForm client={client} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          {client.documents && client.documents.length > 0 ? (
            <div className="space-y-2">
              {client.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{doc.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(doc.file_size / 1024).toFixed(2)} KB • {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No documents uploaded
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          {client.projects && client.projects.length > 0 ? (
            <div className="space-y-2">
              {client.projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">
                      {project.project_number} - {project.title}
                    </p>
                  </div>
                  {project.status && (
                    <Badge
                      style={{
                        backgroundColor: project.status.color,
                        color: '#fff',
                      }}
                    >
                      {project.status.name}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No projects yet
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
