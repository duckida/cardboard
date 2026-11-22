import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Login } from './Login';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="cb-control flex min-h-screen items-center justify-center text-sm text-stone-400">
        Checking your session…
      </div>
    );
  }

  if (!isAdmin) return <Login />;
  return <>{children}</>;
}
