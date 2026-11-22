import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendError } from './_lib/http.js';
import { fetchFeed, isFeedUrl, normalizeFeedUrl, withinWindow } from './_lib/feed.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const daysRaw = Array.isArray(req.query.days) ? req.query.days[0] : req.query.days;
  const days = Math.min(60, Math.max(1, Number(daysRaw) || 7));

  const urlRaw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  const includeInternalRaw = Array.isArray(req.query.includeInternal) ? req.query.includeInternal[0] : req.query.includeInternal;
  const includeInternal = includeInternalRaw === '1' || includeInternalRaw === 'true';

  const url = typeof urlRaw === 'string' ? normalizeFeedUrl(urlRaw) : '';
  if (!url || !isFeedUrl(url)) {
    return res.status(200).json({ events: [], configured: false });
  }

  try {
    const events = await fetchFeed({ url, includeInternal, updatedAt: Date.now() });
    const windowed = withinWindow(events, days);
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    return res.status(200).json({ events: windowed, configured: true, stale: false });
  } catch (error) {
    return sendError(res, error);
  }
}