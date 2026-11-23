export const SCHEMA_VERSION = 1;
export const GRID_COLS = 24;
export const GRID_ROWS = 24;

export type CardType =
  | 'clock'
  | 'weather'
  | 'quote'
  | 'photo'
  | 'image'
  | 'video'
  | 'iframe'
  | 'schedule'
  | 'markdown'
  | 'countdown';

/** Card types that look best edge-to-edge. The Fullscreen option is offered for these. */
export const FULLSCREEN_CARD_TYPES: CardType[] = ['image', 'video', 'iframe'];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CardStyle {
  background?: string;
  opacity?: number;
  blur?: number;
  padding?: number;
  radius?: number;
  align?: 'left' | 'center' | 'right';
  textScale?: number;
  border?: boolean;
}

export interface Card {
  id: string;
  type: CardType;
  layout: Rect;
  visible: boolean;
  /** Fill the whole screen, ignoring the card frame and grid placement. */
  fullscreen?: boolean;
  refreshSec?: number;
  style?: CardStyle;
  // Each card type validates this with its zod schema.
  config: Record<string, any>;
}

export type Transition = 'fade' | 'slide' | 'none';

export type Background =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; from: string; to: string; angle: number }
  | { type: 'image'; url: string; dim: number; blur: number; fit: 'cover' | 'contain' };

export interface Theme {
  mode: 'dark' | 'light';
  colors: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
    border: string;
  };
  font: {
    display: string;
    body: string;
    scale: number;
    weight: number;
    url?: string;
  };
  radius: number;
  shadow: 'none' | 'soft' | 'strong';
  gap: number;
  grid: { cols: number; rows: number };
  card: { opacity: number; blur: number; border: boolean };
  background: Background;
  animations: { enabled: boolean; durationMs: number };
}

export interface Page {
  id: string;
  name: string;
  theme?: Partial<Theme>;
  background?: Background;
  transition: Transition;
  /** Seconds this page stays on screen during rotation. Falls back to settings.rotation.intervalSec. */
  rotationSec?: number;
  cards: Card[];
}

export interface Settings {
  name: string;
  defaultPageId: string;
  locale: string;
  timezone: string;
  rotation: { enabled: boolean; pageIds: string[]; intervalSec: number };
  maintenance: { reloadAt: string | null; blankOutsideHours: boolean };
  lowPower: boolean;
  calendar: { url: string; includeInternal: boolean };
}

export interface BoardConfig {
  schemaVersion: number;
  version: number;
  updatedAt: number;
  settings: Settings;
  theme: Theme;
  pages: Page[];
}

export interface ScreenMeta {
  ua?: string;
  width?: number;
  height?: number;
}

export interface Screen {
  id: string;
  name: string;
  assignedPageId?: string | null;
  lastSeen?: number;
  pageId?: string;
  meta?: ScreenMeta;
  createdAt?: number;
}

export type AnnouncementTone = 'info' | 'success' | 'warning' | 'urgent';
export type AnnouncementStyle = 'overlay' | 'banner' | 'ticker';

export type AnnouncementTarget =
  | { type: 'all' }
  | { type: 'screens'; ids: string[] }
  | { type: 'pages'; ids: string[] };

export interface Announcement {
  id: string;
  title?: string;
  body: string;
  tone: AnnouncementTone;
  style: AnnouncementStyle;
  durationSec: number | null;
  target: AnnouncementTarget;
  startsAt?: number | null;
  expiresAt?: number | null;
  createdAt: number;
}

export interface Asset {
  id: string;
  url: string;
  name: string;
  caption?: string;
  width?: number;
  height?: number;
  bytes?: number;
  cdnId?: string;
  createdAt: number;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  categories: string[];
  description?: string;
}

export interface ScheduleMeta {
  revision: number;
  updatedAt: number;
  lastFetchAt?: number | null;
  lastError?: string | null;
  eventCount?: number;
}

export type CommandType = 'reload' | 'goto' | 'next' | 'blank' | 'identify' | 'clear-cache';

export interface Command {
  id?: string;
  type: CommandType;
  payload?: unknown;
  createdAt: number;
}

export interface PhotoImage {
  url: string;
  caption?: string;
}

export interface ClockConfig {
  timezone: string;
  format: '12h' | '24h';
  showSeconds: boolean;
  showDate: boolean;
  dateStyle: 'long' | 'short';
  label: string;
  analog: boolean;
}

export interface WeatherConfig {
  lat: number;
  lon: number;
  label: string;
  units: 'metric' | 'imperial';
  days: number;
  showForecast: boolean;
}

export interface QuoteConfig {
  mode: 'daily' | 'hourly';
  showAuthor: boolean;
}

export interface PhotoConfig {
  images: PhotoImage[];
  intervalSec: number;
  fit: 'cover' | 'contain';
  kenBurns: boolean;
  showCaption: boolean;
  captionPosition: 'bottom' | 'top';
}

export interface ImageConfig {
  url: string;
  caption: string;
  fit: 'cover' | 'contain';
  showCaption: boolean;
  captionPosition: 'bottom' | 'top';
}

export interface VideoConfig {
  url: string;
  poster: string;
  fit: 'cover' | 'contain';
  loop: boolean;
  muted: boolean;
  controls: boolean;
}

export interface IframeConfig {
  url: string;
  refreshSec: number;
  title: string;
}

export interface ScheduleConfig {
  daysAhead: number;
  maxEvents: number;
  categories: string[];
  showLocation: boolean;
  title: string;
}

export interface MarkdownConfig {
  markdown: string;
}

export interface CountdownConfig {
  target: string;
  label: string;
  showDays: boolean;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface Field {
  key: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'toggle'
    | 'select'
    | 'color'
    | 'url'
    | 'timezone'
    | 'images'
    | 'categories';
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  help?: string;
}
