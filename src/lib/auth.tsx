import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { DEMO } from './store';

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'cardboard';
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';
const DEMO_AUTH_KEY = 'cb.demoAuth';

export type UserRole = 'admin' | 'studentArt';

interface AuthContextValue {
  user: User | null;
  email: string | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  mode: 'firebase' | 'demo';
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function roleFromClaims(claims: Record<string, unknown>, email: string | null): UserRole | null {
  if (claims.role === 'admin') return 'admin';
  if (Boolean(ADMIN_EMAIL) && email === ADMIN_EMAIL) return 'admin';
  if (claims.role === 'studentArt') return 'studentArt';
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(DEMO && localStorage.getItem(DEMO_AUTH_KEY) === '1' ? 'admin' : null);
  const [loading, setLoading] = useState(!DEMO);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (DEMO || !auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (!next) {
        setRole(null);
        setLoading(false);
        return;
      }
      try {
        const token = await next.getIdTokenResult(true);
        setRole(roleFromClaims(token.claims as Record<string, unknown>, next.email ?? null));
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      if (DEMO) {
        if (password !== DEMO_PASSWORD) throw new Error('That password is not right.');
        localStorage.setItem(DEMO_AUTH_KEY, '1');
        setRole('admin');
        return;
      }
      if (!auth) throw new Error('Firebase is not configured.');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdTokenResult(true);
      const nextRole = roleFromClaims(token.claims as Record<string, unknown>, cred.user.email ?? null);
      if (!nextRole) {
        await firebaseSignOut(auth);
        throw new Error('That account does not have access. Ask an admin to set up your account.');
      }
      setRole(nextRole);
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (DEMO) {
      localStorage.removeItem(DEMO_AUTH_KEY);
      setRole(null);
      return;
    }
    if (auth) await firebaseSignOut(auth);
    setRole(null);
  }, []);

  const getToken = useCallback(async () => {
    if (DEMO) return 'demo';
    if (!auth?.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      email: user?.email ?? null,
      role,
      isAdmin,
      loading,
      mode: DEMO ? 'demo' : 'firebase',
      error,
      signIn: async (email, password) => {
        try {
          await signIn(email, password);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Could not sign in.';
          setError(message.replace('Firebase: ', ''));
          throw err;
        }
      },
      signOut,
      getToken,
    }),
    [user, role, isAdmin, loading, error, signIn, signOut, getToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
