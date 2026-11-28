import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';
import { HttpError, bearerToken } from './http.js';
import { parseServiceAccount } from './serviceAccount.js';

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

const ADMIN_CONFIG_HELP =
  'The server has no Firebase admin credentials, so it cannot create accounts or check sign-ins. Add FIREBASE_SERVICE_ACCOUNT (the service-account JSON for this Firebase project) to the server environment.';

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }
  const account = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (account) {
    try {
      cachedApp = initializeApp({
        credential: cert({
          projectId: account.project_id,
          clientEmail: account.client_email,
          privateKey: account.private_key,
        }),
        projectId: account.project_id,
      });
    } catch (error) {
      console.error('FIREBASE_SERVICE_ACCOUNT could not be used:', error);
      throw new HttpError(503, ADMIN_CONFIG_HELP, 'admin_not_configured');
    }
    return cachedApp;
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // No key and no Application Default Credentials. Say so instead of letting
    // the Admin SDK try a metadata lookup that surfaces as "session expired".
    throw new HttpError(503, ADMIN_CONFIG_HELP, 'admin_not_configured');
  }
  // Application Default Credentials (e.g. GOOGLE_APPLICATION_CREDENTIALS locally).
  cachedApp = initializeApp();
  return cachedApp;
}

export function getDb(): Firestore {
  if (cachedDb) return cachedDb;
  cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}

export type UserRole = 'admin' | 'studentArt';

export function getUserRole(decoded: DecodedIdToken): UserRole | null {
  if (decoded.role === 'admin') return 'admin';
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && decoded.email === adminEmail) return 'admin';
  if (decoded.role === 'studentArt') return 'studentArt';
  return null;
}

function isAdminToken(decoded: DecodedIdToken): boolean {
  return getUserRole(decoded) === 'admin';
}

/** Errors that mean the caller's ID token is bad, not that the server is. */
const TOKEN_ERROR_CODES = new Set([
  'auth/argument-error',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/invalid-id-token',
  'auth/user-disabled',
]);

/** Read the `aud` claim without verifying it, for configuration diagnostics. */
function unverifiedAudience(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const claims = JSON.parse(json) as { aud?: unknown };
    return typeof claims.aud === 'string' ? claims.aud : null;
  } catch {
    return null;
  }
}

async function requireDecodedUser(req: VercelRequest): Promise<DecodedIdToken> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'Sign in to continue.', 'missing_token');

  const app = getAdminApp();
  const projectId = app.options.projectId;
  const audience = unverifiedAudience(token);
  if (projectId && audience && audience !== projectId) {
    throw new HttpError(
      503,
      `The server's Firebase credentials belong to project "${projectId}", but this app signs in to "${audience}". Use a service account from the same project.`,
      'project_mismatch',
    );
  }

  try {
    return await getAuth(app).verifyIdToken(token);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    // Only a token the user can fix by signing in again becomes a 401. Anything
    // else is the server's problem, and saying "session expired" hides it.
    if (code && TOKEN_ERROR_CODES.has(code)) {
      throw new HttpError(401, 'Your session expired. Sign in again.', 'invalid_token');
    }
    console.error('Firebase ID token verification failed:', error);
    throw new HttpError(
      503,
      "The server couldn't check your sign-in with Firebase. Try again in a moment.",
      'auth_unavailable',
    );
  }
}

export async function requireAdmin(req: VercelRequest): Promise<DecodedIdToken> {
  const decoded = await requireDecodedUser(req);
  if (!isAdminToken(decoded)) {
    throw new HttpError(403, 'That account is not an admin.', 'not_admin');
  }
  return decoded;
}

export async function requireRole(req: VercelRequest, roles: UserRole[]): Promise<DecodedIdToken> {
  const decoded = await requireDecodedUser(req);
  const role = getUserRole(decoded);
  if (!role || !roles.includes(role)) {
    throw new HttpError(403, 'That account does not have access.', 'forbidden');
  }
  return decoded;
}
