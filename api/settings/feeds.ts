import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendError } from '../_lib/http';
import { fetchFeed, isFeedUrl, normalizeFeedUrl } from '../_lib/feed';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = (req.body ?? {}) as { url?: unknown; includeInternal?: unknown; probe?: unknown };
  const url = typeof body.url === 'string' ? normalizeFeedUrl(body.url) : '';
  const includeInternal = Boolean(body.includeInternal);

  if (!url || !isFeedUrl(url)) {
    return res.status(400).json({ error: 'Paste a valid http or https calendar URL.', code: 'invalid_url' });
  }

  try {
    const events = await fetchFeed({ url, includeInternal, updatedAt: Date.now() });
    return res.status(200).json({ ok: true, eventCount: events.length });
  } catch (error) {
    return sendError(res, error);
  }
}