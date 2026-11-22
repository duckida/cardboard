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
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setLocalError(null);
    try {
      await signIn(email, password);
      navigate('/control');
    } catch {
      // error is surfaced by the auth context
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080a11] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
            <LockKeyhole size={22} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Cardboard</h1>
          <p className="mt-1 text-sm text-slate-500">Control panel</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          {mode === 'firebase' ? (
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Email</span>
              <Input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Password</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              autoFocus={DEMO}
            />
          </label>

          {localError || error ? (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{localError ?? error}</p>
          ) : null}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          {DEMO ? (
            <p className="pt-1 text-center text-[11px] text-slate-500">
              Demo mode — the password is <span className="text-slate-300">cardboard</span>
            </p>
          ) : null}
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Screens are public. Only this panel is locked.
        </p>
      </div>
    </div>
  );
}
