import { afterEach, describe, expect, it } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const savedService = process.env.FIREBASE_SERVICE_ACCOUNT;
const savedAdc = process.env.GOOGLE_APPLICATION_CREDENTIALS;

function restore() {
  if (savedService === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT;
  else process.env.FIREBASE_SERVICE_ACCOUNT = savedService;
  if (savedAdc === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  else process.env.GOOGLE_APPLICATION_CREDENTIALS = savedAdc;
}

describe('requireAdmin', () => {
  afterEach(restore);

  it('reports missing admin credentials instead of an expired session', async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { requireAdmin } = await import('../api/_lib/firebaseAdmin');
    const req = {
      headers: { authorization: 'Bearer header.payload.signature' },
    } as unknown as VercelRequest;

    await expect(requireAdmin(req)).rejects.toMatchObject({
      status: 503,
      code: 'admin_not_configured',
    });
  });
});
