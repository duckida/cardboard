import type { VercelRequest, VercelResponse } from '@vercel/node';
import { boardIdFrom, sendError } from './_lib/http';
import { getDb } from './_lib/firebaseAdmin';
import { fetchFeed, withinWindow, type CachedSchedule, type FeedConfig } from './_lib/feed';
import type { ScheduleMeta } from '../shared/types';

const CACHE_TTL_MS = 10 * 60 * 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const boardId = boardIdFrom(req);
    const daysRaw = Array.isArray(req.query.days) ? req.query.days[0] : req.query.days;
    const days = Math.min(60, Math.max(1, Number(daysRaw) || 7));

    const db = getDb();
    const board = db.collection('boards').doc(boardId);
    const [configSnap, cacheSnap, metaSnap] = await Promise.all([
      board.get(),
      board.collection('scheduleCache').doc('current').get(),
      board.collection('scheduleMeta').doc('current').get(),
    ]);

    const config = configSnap.data() as { settings?: { calendar?: { url?: string; includeInternal?: boolean } } } | undefined;
    const calendar = config?.settings?.calendar;
    const feed: FeedConfig | undefined = calendar?.url
      ? { url: calendar.url, includeInternal: Boolean(calendar.includeInternal), updatedAt: Date.now() }
      : undefined;
    if (!feed?.url) {
      return res.status(200).json({ events: [], configured: false });
    }

    const meta = (metaSnap.data() as ScheduleMeta | undefined) ?? null;
    let cache = cacheSnap.data() as CachedSchedule | undefined;
    const fresh = Boolean(cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS);

    if (!fresh) {
      try {
        const events = await fetchFeed(feed);
        cache = {
          events,
          fetchedAt: Date.now(),
          revision: Math.max(1, meta?.revision ?? 1),
        };
        await board.collection('scheduleCache').doc('current').set(cache);
        await board
          .collection('scheduleMeta')
          .doc('current')
          .set(
            {
              revision: cache.revision,
              updatedAt: Date.now(),
              lastFetchAt: cache.fetchedAt,
              lastError: null,
              eventCount: events.length,
            },
            { merge: true },
          );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not read the calendar feed.';
        await board
          .collection('scheduleMeta')
          .doc('current')
          .set({ lastError: message, updatedAt: Date.now(), revision: Math.max(1, meta?.revision ?? 1) }, { merge: true })
          .catch(() => {});
        if (!cache) {
          return res.status(502).json({ events: [], configured: true, error: message });
        }
      }
    }

    const events = withinWindow(cache?.events ?? [], days);
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    return res.status(200).json({
      events,
      configured: true,
      stale: !fresh && Boolean(cache),
      revision: cache?.revision ?? meta?.revision ?? 1,
    });
  } catch (error) {
    return sendError(res, error);
  }
}
