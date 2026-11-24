import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LayoutGrid, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DEMO } from '@/lib/store';
import { Button, Field, Input } from '@/components/ui';

export function Login() {
  const { signIn, error, mode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      navigate('/control');
    } catch {
      // The message is shown from the auth context.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cb-control flex min-h-dvh flex-col bg-paper px-5 py-6 text-ink">
      <a
        href="/"
        className="inline-flex w-fit items-center gap-2 rounded-xl px-2 py-1.5 text-[13px] font-semibold text-muted transition hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to the screen
      </a>

      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-accent text-white shadow-[0_12px_30px_rgba(15,118,110,0.28)]">
              <LayoutGrid size={28} />
            </div>
            <h1 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-ink">Cardboard</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Sign in to change what’s on your screens.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="space-y-4 rounded-[26px] border border-line bg-white p-5 shadow-[0_2px_4px_rgba(32,37,31,0.04),0_18px_50px_rgba(32,37,31,0.06)] sm:p-6"
          >
            {mode === 'firebase' ? (
              <Field label="Email address">
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@school.org"
                  required
                  autoFocus
                  className="h-12"
                />
              </Field>
            ) : null}

            <Field label="Password">
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  required
                  autoFocus={DEMO}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1.5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-[#f1eee7] hover:text-ink"
                >
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-[#efd5ce] bg-[#fdf3f0] px-3.5 py-3 text-[13px] font-medium leading-snug text-danger"
              >
                <LockKeyhole size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            ) : null}

            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>

            {DEMO ? (
              <div className="rounded-2xl border border-[#efdfb9] bg-[#fdf8ea] px-3.5 py-3 text-[12px] leading-relaxed text-[#8a6516]">
                <span className="font-semibold">Demo mode.</span> The password is{' '}
                <span className="rounded bg-white/70 px-1.5 py-0.5 font-bold text-[#6f520f]">cardboard</span>. Data
                stays in this browser.
              </div>
            ) : null}
          </form>

          <p className="mt-6 text-center text-[12px] leading-relaxed text-muted">
            Only this control panel is locked. Screens stay public.
          </p>
        </div>
      </div>
    </div>
  );
}
