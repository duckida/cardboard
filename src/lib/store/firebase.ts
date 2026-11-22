import type { Auth } from 'firebase/auth';
import { signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { Announcement, Asset, BoardConfig, Command, ScheduleMeta, Screen } from '@shared/types';
import { newId } from '@shared/ids';
import type { BoardStore, Unsubscribe } from './types';
import { blobToBase64, compressImage } from '../image';

function clean<T>(value: T): T {
  // Firestore rejects undefined field values. Round-tripping removes them.
  return JSON.parse(JSON.stringify(value)) as T;
}

export class FirebaseStore implements BoardStore {
  mode = 'firebase' as const;

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
      (snap) => cb(snap.exists() ? (snap.data() as BoardConfig) : null),
      () => cb(null),
    );
  }

  async saveConfig(config: BoardConfig) {
    await setDoc(this.boardDoc(), clean({ ...config, updatedAt: Date.now() }));
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
