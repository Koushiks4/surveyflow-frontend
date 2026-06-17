export interface Organization {
  id: string;
  name: string;
  slug: string;
  project_id_prefix: string;
  project_id_counter: number;
  settings: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  display_name: string;
}

export interface User {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  roles: Role[];
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  roles: string[];
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  notes: string | null;
  created_at: string;
  documents?: Document[];
  projects?: ProjectSummary[];
}

export interface ProjectType {
  id: string;
  name: string;
  is_active: boolean;
}

export interface ProjectStatus {
  id: string;
  name: string;
  color: string;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
}

export interface ProjectAssignment {
  id: string;
  user: Pick<User, 'id' | 'full_name' | 'email' | 'phone'>;
  role: Role;
}

export interface Project {
  id: string;
  organization_id: string;
  project_number: string;
  title: string;
  description: string | null;
  client: Pick<Client, 'id' | 'name' | 'mobile' | 'email'>;
  project_type: ProjectType | null;
  status: ProjectStatus | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  project_assignments: ProjectAssignment[];
  documents?: Document[];
  created_at: string;
}

export interface ProjectSummary {
  id: string;
  project_number: string;
  title: string;
  status: Pick<ProjectStatus, 'name' | 'color'> | null;
}

export interface Document {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardStats {
  projects: { total: number; thisMonth: number };
  clients: { total: number };
  statuses: Array<{ id: string; name: string; color: string; count: number }>;
}
