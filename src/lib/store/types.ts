import type {
  Announcement,
  Asset,
  BoardConfig,
  Command,
  ScheduleMeta,
  Screen,
  ScreenMeta,
  StudentArtItem,
} from '@shared/types';

export type Unsubscribe = () => void;

export interface SaveOptions {
  /**
   * Replace the board wholesale (JSON restore). Skips conflict merging so a
   * backup really does overwrite what is on the server.
   */
  replace?: boolean;
  /**
   * The server board this save was based on. Used as the merge ancestor when
   * another device wrote in the meantime.
   */
  base?: BoardConfig | null;
}

export interface BoardStore {
  mode: 'firebase' | 'local';

  subscribeConfig(cb: (config: BoardConfig | null) => void): Unsubscribe;
  /** Saves the board and returns exactly what is now stored. */
  saveConfig(config: BoardConfig, options?: SaveOptions): Promise<BoardConfig>;
  /** Creates the board only when it does not exist; returns the board in use. */
  ensureBoard(board: BoardConfig): Promise<BoardConfig>;

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

  subscribeStudentArt(cb: (items: StudentArtItem[]) => void): Unsubscribe;
  saveStudentArt(item: StudentArtItem): Promise<void>;
  deleteStudentArt(id: string): Promise<void>;

  subscribeScheduleMeta(cb: (meta: ScheduleMeta | null) => void): Unsubscribe;
  setScheduleMeta(meta: ScheduleMeta): Promise<void>;

  uploadImage(file: File, token?: string | null): Promise<Asset>;
}
