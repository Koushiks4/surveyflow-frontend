import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: 'light' | 'dark';
}

export function Logo({ className, iconOnly = false, variant = 'dark' }: LogoProps) {
  const textColor = variant === 'light' ? 'text-white' : 'text-stone-900';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-8 shrink-0"
      >
        <rect width="32" height="32" rx="8" className="fill-indigo-500" />
        <path
          d="M16 6L8 12v8l8 6 8-6v-8l-8-6z"
          className="stroke-white"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M16 12v8M12 14l4 2 4-2"
          className="stroke-white/70"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="12" r="2" className="fill-white" />
      </svg>
      {!iconOnly && (
        <span className={cn('text-lg font-semibold tracking-tight', textColor)}>
          Survey<span className="text-indigo-500">Flow</span>
        </span>
      )}
    </div>
  );
}
