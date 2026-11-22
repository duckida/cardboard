import { newId } from './ids';
import { defaultCardConfig } from './schemas';
import type {
  Background,
  BoardConfig,
  Card,
  CardType,
  Page,
  Settings,
  Theme,
} from './types';

export const FONT_STACKS: Record<string, string> = {
  Inter: "'Inter', system-ui, -apple-system, sans-serif",
  'Space Grotesk': "'Space Grotesk', 'Inter', system-ui, sans-serif",
  'Playfair Display': "'Playfair Display', Georgia, serif",
  'JetBrains Mono': "'JetBrains Mono', ui-monospace, monospace",
  System: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  Georgia: 'Georgia, Cambria, serif',
};

export function placeholderImage(label = 'Add a photo') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1b2748"/>
      <stop offset="55%" stop-color="#2b3a66"/>
      <stop offset="100%" stop-color="#4b3f72"/>
    </linearGradient>
    <radialGradient id="r" cx="70%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#7c9cff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#7c9cff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#g)"/>
  <rect width="1600" height="1000" fill="url(#r)"/>
  <circle cx="1280" cy="250" r="180" fill="#ffffff" opacity="0.06"/>
  <circle cx="220" cy="820" r="260" fill="#ffffff" opacity="0.04"/>
  <text x="80" y="880" font-family="system-ui, sans-serif" font-size="44" fill="#dbe4ff" opacity="0.9">${label}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_THEME: Theme = {
  mode: 'dark',
  colors: {
    bg: '#0b1020',
    surface: '#151c33',
    text: '#f4f6ff',
    muted: '#98a2c0',
    accent: '#7c9cff',
    border: '#2a3454',
  },
  font: {
    display: FONT_STACKS['Space Grotesk'],
    body: FONT_STACKS.Inter,
    scale: 1,
    weight: 600,
  },
  radius: 24,
  shadow: 'soft',
  gap: 18,
  grid: { cols: 24, rows: 24 },
  card: { opacity: 0.72, blur: 14, border: true },
  background: { type: 'gradient', from: '#0b1020', to: '#1b2748', angle: 160 },
  animations: { enabled: true, durationMs: 700 },
};

export const THEME_PRESETS: Record<string, Partial<Theme>> = {
  Midnight: {},
  Editorial: {
    mode: 'light',
    colors: {
      bg: '#f4f1ea',
      surface: '#ffffff',
      text: '#171512',
      muted: '#6b655c',
      accent: '#b04a2f',
      border: '#ddd6c9',
    },
    font: {
      display: FONT_STACKS['Playfair Display'],
      body: FONT_STACKS.Georgia,
      scale: 1,
      weight: 500,
    },
    radius: 6,
    shadow: 'none',
    card: { opacity: 0.94, blur: 0, border: true },
    background: { type: 'solid', color: '#f4f1ea' },
  },
  Ambient: {
    colors: {
      bg: '#07110f',
      surface: '#0e1b18',
      text: '#eefaf5',
      muted: '#8fb3a8',
      accent: '#6ee7b7',
      border: '#1d3a33',
    },
    radius: 28,
    card: { opacity: 0.55, blur: 22, border: true },
    background: { type: 'gradient', from: '#07110f', to: '#12332c', angle: 145 },
  },
  Paper: {
    mode: 'light',
    colors: {
      bg: '#faf9f6',
      surface: '#ffffff',
      text: '#111827',
      muted: '#6b7280',
      accent: '#2563eb',
      border: '#e5e7eb',
    },
    font: {
      display: FONT_STACKS.Inter,
      body: FONT_STACKS.System,
      scale: 1,
      weight: 650,
    },
    radius: 18,
    shadow: 'soft',
    card: { opacity: 0.98, blur: 0, border: true },
    background: { type: 'solid', color: '#faf9f6' },
  },
};

function card(type: CardType, layout: Card['layout'], config: Record<string, any> = {}): Card {
  return {
    id: newId('card'),
    type,
    layout,
    visible: true,
    config: { ...defaultCardConfig(type), ...config },
  };
}

function page(name: string, cards: Card[], extra: Partial<Page> = {}): Page {
  return {
    id: newId('page'),
    name,
    transition: 'fade',
    cards,
    ...extra,
  };
}

export function defaultBoard(): BoardConfig {
  const home = page('Home', [
    card('clock', { x: 0, y: 0, w: 8, h: 6 }, { showSeconds: false, dateStyle: 'long' }),
    card('weather', { x: 8, y: 0, w: 7, h: 6 }, { days: 4 }),
    card('quote', { x: 15, y: 0, w: 9, h: 6 }),
    card(
      'photo',
      { x: 0, y: 6, w: 14, h: 10 },
      {
        images: [
          {
            url: placeholderImage('Add your photos in Control'),
            caption: 'Photos can have captions',
          },
        ],
      },
    ),
    card('schedule', { x: 14, y: 6, w: 10, h: 10 }, { daysAhead: 7, maxEvents: 7 }),
    card('markdown', { x: 0, y: 16, w: 24, h: 8 }, {
      markdown:
        '## Welcome to Cardboard\n\nEdit this board at **/control**. Every change appears on the screen instantly.',
    }),
  ]);

  const week = page('Week ahead', [
    card('schedule', { x: 0, y: 0, w: 15, h: 17 }, { daysAhead: 10, maxEvents: 12, title: 'Week ahead' }),
    card('weather', { x: 15, y: 0, w: 9, h: 8 }, { days: 5 }),
    card('clock', { x: 15, y: 8, w: 9, h: 9 }, { analog: true }),
    card('markdown', { x: 0, y: 17, w: 24, h: 7 }, {
      markdown: '### Notes\n\nUse the control panel to add, resize and style cards. Drag anything.',
    }),
  ]);

  const settings: Settings = {
    name: 'Cardboard',
    defaultPageId: home.id,
    locale: 'en-GB',
    timezone: 'Europe/London',
    rotation: { enabled: false, pageIds: [home.id, week.id], intervalSec: 30 },
    maintenance: { reloadAt: '03:30', blankOutsideHours: false },
    lowPower: false,
  };

  return {
    schemaVersion: 1,
    version: 1,
    updatedAt: Date.now(),
    settings,
    theme: DEFAULT_THEME,
    pages: [home, week],
  };
}
