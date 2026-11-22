import type { Announcement, Asset, BoardConfig, Command, ScheduleMeta, Screen } from '@shared/types';
import { defaultBoard } from '@shared/defaults';
import { newId } from '@shared/ids';
import type { BoardStore, Unsubscribe } from './types';
import { blobToDataUrl, compressImage } from '../image';

const PREFIX = 'cb.';
const CHANNEL = 'cardboard';

type Listener = () => void;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export class LocalStore implements BoardStore {
  mode = 'local' as const;

  private listeners = new Map<string, Set<Listener>>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL);
      this.channel.onmessage = (event) => {
        if (event.data?.key) this.notify(event.data.key);
      };
    }
    if (!localStorage.getItem(PREFIX + 'config')) {
      write('config', defaultBoard());
    }
    if (!localStorage.getItem(PREFIX + 'announcements')) write('announcements', []);
    if (!localStorage.getItem(PREFIX + 'screens')) write('screens', {});
    if (!localStorage.getItem(PREFIX + 'assets')) write('assets', []);
    if (!localStorage.getItem(PREFIX + 'meta')) write('meta', { revision: 1, updatedAt: Date.now() });
  }

  private listen(key: string, cb: () => void): Unsubscribe {
    const set = this.listeners.get(key) ?? new Set();
    set.add(cb);
    this.listeners.set(key, set);
    cb();
    return () => {
      set.delete(cb);
    };
  }

  private notify(key: string) {
    this.listeners.get(key)?.forEach((cb) => cb());
    this.channel?.postMessage({ key });
  }

  subscribeConfig(cb: (config: BoardConfig | null) => void): Unsubscribe {
    return this.listen('config', () => cb(read<BoardConfig | null>('config', null)));
  }

  async saveConfig(config: BoardConfig) {
    write('config', { ...config, updatedAt: Date.now() });
    this.notify('config');
  }

  subscribeAnnouncements(cb: (items: Announcement[]) => void): Unsubscribe {
    return this.listen('announcements', () => cb(read<Announcement[]>('announcements', [])));
  }

  async saveAnnouncement(item: Announcement) {
    const items = read<Announcement[]>('announcements', []);
    const next = items.some((x) => x.id === item.id)
      ? items.map((x) => (x.id === item.id ? item : x))
      : [...items, item];
    write('announcements', next);
    this.notify('announcements');
  }

  async deleteAnnouncement(id: string) {
    write('announcements', read<Announcement[]>('announcements', []).filter((x) => x.id !== id));
    this.notify('announcements');
  }

  subscribeScreens(cb: (items: Screen[]) => void): Unsubscribe {
    return this.listen('screens', () => cb(Object.values(read<Record<string, Screen>>('screens', {}))));
  }

  async ensureScreen(id: string, name: string) {
    const screens = read<Record<string, Screen>>('screens', {});
    if (!screens[id]) {
      screens[id] = { id, name, createdAt: Date.now(), lastSeen: 0 };
      write('screens', screens);
      this.notify('screens');
    }
  }

  async saveScreen(screen: Screen) {
    const screens = read<Record<string, Screen>>('screens', {});
    screens[screen.id] = { ...screens[screen.id], ...screen };
    write('screens', screens);
    this.notify('screens');
  }

  async heartbeat(id: string, patch: { lastSeen: number; pageId?: string; meta?: Screen['meta'] }) {
    const screens = read<Record<string, Screen>>('screens', {});
    const existing = screens[id] ?? { id, name: id, createdAt: Date.now() };
    screens[id] = { ...existing, ...patch };
    write('screens', screens);
    this.notify('screens');
  }

  async deleteScreen(id: string) {
    const screens = read<Record<string, Screen>>('screens', {});
    delete screens[id];
    write('screens', screens);
    this.notify('screens');
  }

  async sendCommand(screenId: string, command: Command) {
    const key = `commands.${screenId}`;
    const items = read<Command[]>(key, []);
    const next = [...items, { ...command, id: newId('cmd') }];
    write(key, next);
    this.notify(key);
  }

  subscribeCommands(screenId: string, cb: (command: Command) => void): Unsubscribe {
    const key = `commands.${screenId}`;
    const startedAt = Date.now();
    const seen = new Set<string>();
    return this.listen(key, () => {
      const items = read<Command[]>(key, []);
      for (const item of items) {
        if (!item.id || seen.has(item.id)) continue;
        if (item.createdAt < startedAt) {
          seen.add(item.id);
          continue;
        }
        seen.add(item.id);
        cb(item);
      }
    });
  }

  async clearCommand(screenId: string, commandId: string) {
    const key = `commands.${screenId}`;
    write(key, read<Command[]>(key, []).filter((c) => c.id !== commandId));
    this.notify(key);
  }

  subscribeAssets(cb: (items: Asset[]) => void): Unsubscribe {
    return this.listen('assets', () => cb(read<Asset[]>('assets', [])));
  }

  async saveAsset(asset: Asset) {
    const assets = read<Asset[]>('assets', []);
    write('assets', assets.some((a) => a.id === asset.id) ? assets.map((a) => (a.id === asset.id ? asset : a)) : [...assets, asset]);
    this.notify('assets');
  }

  async deleteAsset(id: string) {
    write('assets', read<Asset[]>('assets', []).filter((a) => a.id !== id));
    this.notify('assets');
  }

  subscribeScheduleMeta(cb: (meta: ScheduleMeta | null) => void): Unsubscribe {
    return this.listen('meta', () => cb(read<ScheduleMeta | null>('meta', null)));
  }

  async setScheduleMeta(meta: ScheduleMeta) {
    write('meta', meta);
    this.notify('meta');
  }

  async uploadImage(file: File): Promise<Asset> {
    const compressed = await compressImage(file, 1600, 0.78);
    const dataUrl = await blobToDataUrl(compressed.blob);
    return {
      id: newId('asset'),
      url: dataUrl,
      name: compressed.filename,
      width: compressed.width,
      height: compressed.height,
      bytes: compressed.blob.size,
      createdAt: Date.now(),
    };
  }
}

export function resetLocalDemo() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('cb.demoAuth');
}

export function getDemoFeed(): { url: string; includeInternal: boolean } | null {
  return read<{ url: string; includeInternal: boolean } | null>('demoFeed', null);
}

export function setDemoFeed(feed: { url: string; includeInternal: boolean } | null) {
  if (feed) write('demoFeed', feed);
  else localStorage.removeItem(PREFIX + 'demoFeed');
}
