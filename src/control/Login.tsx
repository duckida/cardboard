import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DEMO } from '@/lib/store';
import { Button, Input } from '@/components/ui';

export function Login() {
  const { signIn, error, mode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      navigate('/control');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cb-control flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <LockKeyhole size={24} />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Sign in</h1>
          <p className="mt-1 text-sm text-stone-500">Cardboard control panel</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          {mode === 'firebase' ? (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-stone-700">Email</span>
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-stone-700">Password</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus={DEMO}
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          ) : null}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          {DEMO ? (
            <p className="pt-1 text-center text-xs text-stone-400">
              Demo mode — the password is <span className="font-semibold text-stone-600">cardboard</span>
            </p>
          ) : null}
        </form>

        <p className="mt-6 text-center text-xs text-stone-400">
          Screens are public. Only this panel is locked.
        </p>
      </div>
    </div>
  );
}
