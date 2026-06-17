'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { navItems } from './nav-items';
import { Logo } from '@/components/logo';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user?.roles.some((r) => item.roles!.includes(r));
  });

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-stone-900 text-stone-300">
      <div className="flex h-16 items-center px-5 border-b border-stone-800">
        <Logo variant="light" />
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-500/15 text-white'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive && 'text-indigo-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-stone-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="size-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-medium text-indigo-300">
            {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-200 truncate">{user?.fullName}</p>
            <p className="text-xs text-stone-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
