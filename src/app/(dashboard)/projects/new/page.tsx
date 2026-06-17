'use client';

import { ProjectForm } from '@/components/projects/project-form';

export default function NewProjectPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">New Project</h1>
      <ProjectForm />
    </div>
  );
}
