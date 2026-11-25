import type { Auth } from 'firebase/auth';
import { signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { Announcement, Asset, BoardConfig, Command, ScheduleMeta, Screen } from '@shared/types';
import { mergeBoardConfig } from '@shared/merge';
import { newId } from '@shared/ids';
import type { BoardStore, SaveOptions, Unsubscribe } from './types';
import { blobToBase64, compressImage } from '../image';

function clean<T>(value: T): T {
  // Firestore rejects undefined field values. Round-tripping removes them.
  return JSON.parse(JSON.stringify(value)) as T;
}

function isOfflineError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  );
}

export class FirebaseStore implements BoardStore {
  mode = 'firebase' as const;

  /** The last board the listener saw, used as a fallback merge base. */
  private lastRemote: BoardConfig | null = null;

  constructor(
    private db: Firestore,
    private auth: Auth,
    private boardId: string,
  ) {}

  private boardDoc() {
    return doc(this.db, 'boards', this.boardId);
  }

  private async ensureAuth() {
    if (this.auth.currentUser) return;
    try {
      await signInAnonymously(this.auth);
    } catch {
      // Anonymous auth may be disabled. Public reads still work.
    }
  }

  subscribeConfig(cb: (config: BoardConfig | null) => void): Unsubscribe {
    return onSnapshot(
      this.boardDoc(),
      (snap) => {
        if (!snap.exists()) {
          // An empty local cache is not proof that the board is gone. Waiting
          // for the server snapshot avoids showing "create a board" to someone
          // whose only problem is a cold cache or a slow connection.
          if (snap.metadata.fromCache) return;
          this.lastRemote = null;
          cb(null);
          return;
        }
        const remote = snap.data() as BoardConfig;
        this.lastRemote = remote;
        cb(remote);
      },
      // Keep whatever we already have on a transient listener error instead
      // of reporting that the board disappeared.
      () => {},
    );
  }

  async saveConfig(config: BoardConfig, options?: SaveOptions): Promise<BoardConfig> {
    const next = clean({ ...config, updatedAt: Date.now() });
    const ref = this.boardDoc();
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

    if (options?.replace || offline) {
      // A transaction needs a server round trip; offline edits still queue.
      await setDoc(ref, next);
      this.lastRemote = next;
      return next;
    }

    try {
      const written = await runTransaction(this.db, async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists()) {
          tx.set(ref, next);
          return next;
        }
        const remote = snap.data() as BoardConfig;
        const base = options?.base ?? this.lastRemote;
        const merged =
          base && Number(remote.version) > Number(base.version)
            ? clean(mergeBoardConfig(base, next, remote))
            : next;
        // Always move the version past what the server currently has so the
        // next reader (and our own stale snapshots) can tell which is newer.
        const version = Math.max(Number(merged.version) || 1, Number(remote.version) || 1) + 1;
        const toWrite = clean({ ...merged, version, updatedAt: Date.now() });
        tx.set(ref, toWrite);
        return toWrite;
      });
      this.lastRemote = written;
      return written;
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      // Transactions need a server round trip. Offline edits still have to
      // queue locally, so fall back to a normal write and reconcile later.
      await setDoc(ref, next);
      this.lastRemote = next;
      return next;
    }
  }

  async ensureBoard(board: BoardConfig): Promise<BoardConfig> {
    const ref = this.boardDoc();
    const next = clean(board);
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

    if (offline) {
      // Never create a board we could not confirm is missing — that is how a
      // cold cache turns into a wiped board.
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const existing = snap.data() as BoardConfig;
        this.lastRemote = existing;
        return existing;
      }
      throw new Error('You are offline. Reconnect before creating your board.');
    }

    try {
      const existing = await runTransaction(this.db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) return snap.data() as BoardConfig;
        tx.set(ref, next);
        return next;
      });
      this.lastRemote = existing;
      return existing;
    } catch (error) {
      if (!isOfflineError(error)) throw error;
      // Never create a board we could not confirm is missing — that is how a
      // cold cache turns into a wiped board.
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const existing = snap.data() as BoardConfig;
        this.lastRemote = existing;
        return existing;
      }
      throw new Error('Could not reach the server to create the board. Check your connection and try again.');
    }
  }

  subscribeAnnouncements(cb: (items: Announcement[]) => void): Unsubscribe {
    return onSnapshot(collection(this.boardDoc(), 'announcements'), (snap) => {
      cb(snap.docs.map((d) => ({ ...(d.data() as Announcement), id: d.id })));
    });
  }

  async saveAnnouncement(item: Announcement) {
    await setDoc(doc(this.boardDoc(), 'announcements', item.id), item);
  }

  async deleteAnnouncement(id: string) {
    await deleteDoc(doc(this.boardDoc(), 'announcements', id));
  }

  subscribeScreens(cb: (items: Screen[]) => void): Unsubscribe {
    return onSnapshot(collection(this.boardDoc(), 'screens'), (snap) => {
      cb(snap.docs.map((d) => ({ ...(d.data() as Screen), id: d.id })));
    });
  }

  async ensureScreen(id: string, name: string) {
    await this.ensureAuth();
    const ref = doc(this.boardDoc(), 'screens', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { id, name, createdAt: Date.now(), lastSeen: Date.now() });
    }
  }

  async saveScreen(screen: Screen) {
    await setDoc(doc(this.boardDoc(), 'screens', screen.id), screen, { merge: true });
  }

  async heartbeat(id: string, patch: { lastSeen: number; pageId?: string; meta?: Screen['meta'] }) {
    await this.ensureAuth();
    await setDoc(doc(this.boardDoc(), 'screens', id), patch, { merge: true });
  }

  async deleteScreen(id: string) {
    await deleteDoc(doc(this.boardDoc(), 'screens', id));
  }

  async sendCommand(screenId: string, command: Command) {
    await addDoc(collection(this.boardDoc(), 'screens', screenId, 'commands'), command);
  }

  subscribeCommands(screenId: string, cb: (command: Command) => void): Unsubscribe {
    const startedAt = Date.now();
    const seen = new Set<string>();
    let inner: Unsubscribe = () => {};
    let cancelled = false;

    void this.ensureAuth().finally(() => {
      if (cancelled) return;
      inner = onSnapshot(
        collection(this.boardDoc(), 'screens', screenId, 'commands'),
        (snap) => {
          for (const d of snap.docs) {
            if (seen.has(d.id)) continue;
            const data = d.data() as Command;
            if (data.createdAt < startedAt) {
              seen.add(d.id);
              continue;
            }
            seen.add(d.id);
            cb({ ...data, id: d.id });
          }
        },
        () => {},
      );
    });

    return () => {
      cancelled = true;
      inner();
    };
  }

  async clearCommand(screenId: string, commandId: string) {
    await deleteDoc(doc(this.boardDoc(), 'screens', screenId, 'commands', commandId));
  }

  subscribeAssets(cb: (items: Asset[]) => void): Unsubscribe {
    return onSnapshot(collection(this.boardDoc(), 'assets'), (snap) => {
      cb(snap.docs.map((d) => ({ ...(d.data() as Asset), id: d.id })));
    });
  }

  async saveAsset(asset: Asset) {
    await setDoc(doc(this.boardDoc(), 'assets', asset.id), asset);
  }

  async deleteAsset(id: string) {
    await deleteDoc(doc(this.boardDoc(), 'assets', id));
  }

  subscribeScheduleMeta(cb: (meta: ScheduleMeta | null) => void): Unsubscribe {
    return onSnapshot(doc(this.boardDoc(), 'scheduleMeta', 'current'), (snap) => {
      cb(snap.exists() ? (snap.data() as ScheduleMeta) : null);
    });
  }

  async setScheduleMeta(meta: ScheduleMeta) {
    // Written by the Vercel function with the Admin SDK; the client is read-only.
    void meta;
  }

  async uploadImage(file: File, token?: string | null): Promise<Asset> {
    if (!token) throw new Error('Sign in again before uploading.');
    const compressed = await compressImage(file);
    const data = await blobToBase64(compressed.blob);
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename: compressed.filename,
        contentType: compressed.contentType,
        data,
        width: compressed.width,
        height: compressed.height,
      }),
    });
    const json = (await response.json().catch(() => ({}))) as {
      id?: string;
      url?: string;
      filename?: string;
      error?: string;
    };
    if (!response.ok || !json.url) {
      throw new Error(json.error || `Upload failed (${response.status}).`);
    }
    return {
      id: newId('asset'),
      url: json.url,
      cdnId: json.id,
      name: json.filename ?? compressed.filename,
      width: compressed.width,
      height: compressed.height,
      bytes: compressed.blob.size,
      createdAt: Date.now(),
    };
  }
}
