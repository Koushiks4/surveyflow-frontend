import { LoginForm } from '@/components/auth/login-form';
import { Logo } from '@/components/logo';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-[55%] items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative z-10 max-w-md text-center space-y-8">
          <Logo variant="light" className="justify-center" />
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-white">Survey operations, simplified.</h1>
            <p className="text-indigo-100 text-lg leading-relaxed">
              Manage your survey projects from enquiry to delivery. Track field teams, automate workflows, and deliver faster.
            </p>
          </div>
          <div className="flex items-center justify-center gap-8 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">100%</div>
              <div className="text-indigo-200 text-sm">Digital Workflow</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">3x</div>
              <div className="text-indigo-200 text-sm">Faster Delivery</div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Zero</div>
              <div className="text-indigo-200 text-sm">Manual Tracking</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex justify-center">
            <Logo />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            New organization?{' '}
            <Link href="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
