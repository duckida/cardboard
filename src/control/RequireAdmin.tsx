import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { Login } from './Login';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="cb-control flex min-h-screen items-center justify-center bg-paper text-sm text-muted">
        Checking your session…
      </div>
    );
  }

  if (!role) return <Login />;
  return <>{children}</>;
}
