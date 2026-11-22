import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function accountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Set FIREBASE_SERVICE_ACCOUNT to the service-account JSON.');
  const account = JSON.parse(raw.replace(/\\n/g, '\n'));
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email, or private_key.');
  }
  return account;
}

const email = process.argv[2] || process.env.ADMIN_EMAIL;
const create = process.argv.includes('--create');
if (!email) throw new Error('Usage: npm run set-admin -- admin@example.com [--create]');

const app = getApps()[0] || initializeApp({ credential: cert(accountFromEnv()) });
const auth = getAuth(app);
let user;
try {
  user = await auth.getUserByEmail(email);
} catch (error) {
  if (!create || error?.code !== 'auth/user-not-found') throw error;
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD is required with --create.');
  user = await auth.createUser({ email, password });
}

await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), role: 'admin' });
console.log(`Admin claim set for ${user.email || email} (${user.uid}).`);
console.log('The user must sign out and back in (or refresh its ID token) before the claim is visible.');
