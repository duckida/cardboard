import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Login } from './Login';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080a11] text-sm text-slate-500">
        Checking your session…
      </div>
    );
  }

  if (!isAdmin) return <Login />;
  return <>{children}</>;
}
