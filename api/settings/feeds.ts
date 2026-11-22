import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HttpError, boardIdFrom, methodNotAllowed, sendError } from '../_lib/http';
import { getDb, requireAdmin } from '../_lib/firebaseAdmin';
import { fetchFeed, isFeedUrl, normalizeFeedUrl, type FeedConfig } from '../_lib/feed';
import type { ScheduleMeta } from '../../shared/types';

async function readStatus(boardId: string) {
  const db = getDb();
  const board = db.collection('boards').doc(boardId);
  const [feedSnap, metaSnap] = await Promise.all([
    board.collection('private').doc('feeds').get(),
    board.collection('scheduleMeta').doc('current').get(),
  ]);
  const feed = feedSnap.data() as FeedConfig | undefined;
  const meta = (metaSnap.data() as ScheduleMeta | undefined) ?? null;
  return {
    configured: Boolean(feed?.url),
    includeInternal: Boolean(feed?.includeInternal),
    updatedAt: feed?.updatedAt ?? null,
    revision: meta?.revision ?? 1,
    lastFetchAt: meta?.lastFetchAt ?? null,
    lastError: meta?.lastError ?? null,
    eventCount: meta?.eventCount ?? null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    return methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
  }

  try {
    await requireAdmin(req);
    const boardId = boardIdFrom(req);
    const db = getDb();
    const board = db.collection('boards').doc(boardId);

    if (req.method === 'GET') {
      return res.status(200).json(await readStatus(boardId));
    }

    if (req.method === 'DELETE') {
      await board.collection('private').doc('feeds').delete();
      await board.collection('scheduleCache').doc('current').delete();
      const metaSnap = await board.collection('scheduleMeta').doc('current').get();
      const revision = (metaSnap.data() as ScheduleMeta | undefined)?.revision ?? 1;
      await board
        .collection('scheduleMeta')
        .doc('current')
        .set({ revision: revision + 1, updatedAt: Date.now(), lastError: null, eventCount: 0 }, { merge: true });
      return res.status(200).json({ ...(await readStatus(boardId)), configured: false });
    }

    const body = (req.body ?? {}) as {
      url?: unknown;
      includeInternal?: unknown;
      probe?: unknown;
    };

    const url = typeof body.url === 'string' ? normalizeFeedUrl(body.url) : '';
    const includeInternal = Boolean(body.includeInternal);
    if (!url || !isFeedUrl(url)) {
      throw new HttpError(400, 'Paste a valid http or https calendar URL.', 'invalid_url');
    }
    if (url.length > 2000) {
      throw new HttpError(400, 'That URL is too long.', 'invalid_url');
    }

    if (body.probe) {
      const events = await fetchFeed({ url, includeInternal, updatedAt: Date.now() });
      return res.status(200).json({ ok: true, eventCount: events.length });
    }

    const feed: FeedConfig = { url, includeInternal, updatedAt: Date.now() };
    await board.collection('private').doc('feeds').set(feed);
    await board.collection('scheduleCache').doc('current').delete().catch(() => {});

    const metaSnap = await board.collection('scheduleMeta').doc('current').get();
    const revision = (metaSnap.data() as ScheduleMeta | undefined)?.revision ?? 1;
    await board
      .collection('scheduleMeta')
      .doc('current')
      .set({ revision: revision + 1, updatedAt: Date.now(), lastError: null }, { merge: true });

    return res.status(200).json(await readStatus(boardId));
  } catch (error) {
    return sendError(res, error);
  }
}
