import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendError } from './_lib/http.js';
import { fetchSportsFixtures, isSportsUrl, normalizeSportsUrl } from './_lib/sports.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const daysRaw = Array.isArray(req.query.days) ? req.query.days[0] : req.query.days;
  const days = Math.min(60, Math.max(1, Number(daysRaw) || 14));

  const urlRaw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
  const url = typeof urlRaw === 'string' ? normalizeSportsUrl(urlRaw) : null;
  if (!url || !isSportsUrl(url)) {
    return res.status(200).json({ fixtures: [], configured: false });
  }

  try {
    const fixtures = await fetchSportsFixtures(url, days);
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    return res.status(200).json({ fixtures, configured: true });
  } catch (error) {
    return sendError(res, error);
  }
}
