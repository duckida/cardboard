import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, requireAdmin } from './_lib/firebaseAdmin.js';
import { HttpError, methodNotAllowed, sendError } from './_lib/http.js';

interface CreateUserBody {
  email?: unknown;
  password?: unknown;
  role?: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    await requireAdmin(req);

    const body = (req.body ?? {}) as CreateUserBody;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = body.role === 'studentArt' ? 'studentArt' : null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'Enter a valid email address.', 'invalid_email');
    }
    if (!role) {
      throw new HttpError(400, 'A valid account type is required.', 'invalid_role');
    }
    if (password.length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters.', 'invalid_password');
    }

    const auth = getAuth(getAdminApp());
    let user;
    let created = false;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code !== 'auth/user-not-found') throw error;
      user = await auth.createUser({ email, password });
      created = true;
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const existingRole = user.customClaims?.role;
    if (existingRole === 'admin' || (adminEmail && user.email === adminEmail)) {
      throw new HttpError(409, 'That account is an admin account and cannot be changed here.', 'admin_account');
    }

    if (!created) {
      await auth.updateUser(user.uid, { password });
    }

    await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), role });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ ok: true, email: user.email ?? email, uid: user.uid, created, role });
  } catch (error) {
    return sendError(res, error);
  }
}
