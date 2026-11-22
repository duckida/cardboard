import type {
  Announcement,
  Asset,
  BoardConfig,
  Command,
  ScheduleMeta,
  Screen,
  ScreenMeta,
} from '@shared/types';

export type Unsubscribe = () => void;

export interface BoardStore {
  mode: 'firebase' | 'local';

  subscribeConfig(cb: (config: BoardConfig | null) => void): Unsubscribe;
  saveConfig(config: BoardConfig): Promise<void>;

  subscribeAnnouncements(cb: (items: Announcement[]) => void): Unsubscribe;
  saveAnnouncement(item: Announcement): Promise<void>;
  deleteAnnouncement(id: string): Promise<void>;

  subscribeScreens(cb: (items: Screen[]) => void): Unsubscribe;
  ensureScreen(id: string, name: string): Promise<void>;
  saveScreen(screen: Screen): Promise<void>;
  heartbeat(id: string, patch: { lastSeen: number; pageId?: string; meta?: ScreenMeta }): Promise<void>;
  deleteScreen(id: string): Promise<void>;

  sendCommand(screenId: string, command: Command): Promise<void>;
  subscribeCommands(screenId: string, cb: (command: Command) => void): Unsubscribe;
  clearCommand(screenId: string, commandId: string): Promise<void>;

  subscribeAssets(cb: (items: Asset[]) => void): Unsubscribe;
  saveAsset(asset: Asset): Promise<void>;
  deleteAsset(id: string): Promise<void>;

  subscribeScheduleMeta(cb: (meta: ScheduleMeta | null) => void): Unsubscribe;
  setScheduleMeta(meta: ScheduleMeta): Promise<void>;

  uploadImage(file: File, token?: string | null): Promise<Asset>;
}
