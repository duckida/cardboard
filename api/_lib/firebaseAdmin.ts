import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { VercelRequest } from '@vercel/node';
import { HttpError, bearerToken } from './http.js';

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;

function serviceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.replace(/\\n/g, '\n')) as Record<string, string>;
    return parsed.private_key ? parsed : null;
  } catch {
    return null;
  }
}

export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }
  const account = serviceAccount();
  if (account) {
    cachedApp = initializeApp({
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
      projectId: account.project_id,
    });
    return cachedApp;
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

async function requireDecodedUser(req: VercelRequest): Promise<DecodedIdToken> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, 'Sign in to continue.', 'missing_token');
  try {
    return await getAuth(getAdminApp()).verifyIdToken(token);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Your session expired. Sign in again.', 'invalid_token');
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
