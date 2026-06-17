'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Project } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectForm } from '@/components/projects/project-form';
import { format } from 'date-fns';

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: () => api.get<Project>(`/api/projects/${id}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{project.project_number}</h1>
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
          <p className="text-muted-foreground">{project.title}</p>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="team">
            Team {project.project_assignments && `(${project.project_assignments.length})`}
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents {project.documents && `(${project.documents.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <ProjectForm project={project} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          {project.project_assignments && project.project_assignments.length > 0 ? (
            <div className="space-y-2">
              {project.project_assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{assignment.user.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {assignment.user.email}
                    </p>
                  </div>
                  <Badge variant="secondary">{assignment.role.display_name}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No team members assigned
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          {project.documents && project.documents.length > 0 ? (
            <div className="space-y-2">
              {project.documents.map((doc) => (
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
      </Tabs>
    </div>
  );
}
