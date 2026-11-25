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

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const email = args[0] || process.env.ADMIN_EMAIL;
const create = process.argv.includes('--create');
const roleArg = process.argv.find((arg) => arg.startsWith('--role='));
const role = roleArg ? roleArg.slice('--role='.length) : 'admin';
const password = process.env.ADMIN_PASSWORD;
if (!email) throw new Error('Usage: npm run set-admin -- user@example.com [--create] [--role=admin|studentArt]');
if (!['admin', 'studentArt'].includes(role)) throw new Error('Role must be admin or studentArt.');

const app = getApps()[0] || initializeApp({ credential: cert(accountFromEnv()) });
const auth = getAuth(app);
let user;
try {
  user = await auth.getUserByEmail(email);
} catch (error) {
  if (!create || error?.code !== 'auth/user-not-found') throw error;
  if (!password) throw new Error('ADMIN_PASSWORD is required with --create.');
  user = await auth.createUser({ email, password });
}

if (password && user.passwordHash) {
  user = await auth.updateUser(user.uid, { password });
} else if (password && !user.passwordHash && !create) {
  user = await auth.updateUser(user.uid, { password });
}

await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), role });
console.log(`${role} claim set for ${user.email || email} (${user.uid}).`);
console.log('The user must sign out and back in (or refresh its ID token) before the claim is visible.');
