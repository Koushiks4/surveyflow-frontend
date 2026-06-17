import {
  LayoutDashboard,
  Users,
  UserCircle,
  FolderKanban,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Clients', href: '/clients', icon: UserCircle },
  { label: 'Users', href: '/users', icon: Users, roles: ['super_admin', 'admin'] },
  { label: 'Settings', href: '/settings', icon: Settings, roles: ['super_admin', 'admin'] },
];
