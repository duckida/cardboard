import { DEFAULT_THEME, defaultBoard } from './defaults';
import { newId } from './ids';
import { normalizeCardConfig, CARD_TYPES } from './schemas';
import { clampRect } from './layout';
import { SCHEMA_VERSION, type Background, type BoardConfig, type Card, type Page, type Theme } from './types';

function isObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeBackground(input: unknown, fallback: Background): Background {
  if (!isObject(input)) return fallback;
  if (input.type === 'solid' && typeof input.color === 'string') {
    return { type: 'solid', color: input.color };
  }
  if (input.type === 'gradient' && typeof input.from === 'string' && typeof input.to === 'string') {
    return {
      type: 'gradient',
      from: input.from,
      to: input.to,
      angle: num(input.angle, 160),
    };
  }
  if (input.type === 'image' && typeof input.url === 'string') {
    return {
      type: 'image',
      url: input.url,
      dim: Math.min(1, Math.max(0, num(input.dim, 0.35))),
      blur: Math.min(60, Math.max(0, num(input.blur, 0))),
      fit: input.fit === 'contain' ? 'contain' : 'cover',
    };
  }
  return fallback;
}

export function mergeTheme(base: Theme, input: unknown): Theme {
  const t = isObject(input) ? input : {};
  const colors = isObject(t.colors) ? t.colors : {};
  const font = isObject(t.font) ? t.font : {};
  const grid = isObject(t.grid) ? t.grid : {};
  const card = isObject(t.card) ? t.card : {};
  const animations = isObject(t.animations) ? t.animations : {};
  return {
    mode: t.mode === 'light' ? 'light' : 'dark',
    colors: {
      bg: typeof colors.bg === 'string' ? colors.bg : base.colors.bg,
      surface: typeof colors.surface === 'string' ? colors.surface : base.colors.surface,
      text: typeof colors.text === 'string' ? colors.text : base.colors.text,
      muted: typeof colors.muted === 'string' ? colors.muted : base.colors.muted,
      accent: typeof colors.accent === 'string' ? colors.accent : base.colors.accent,
      border: typeof colors.border === 'string' ? colors.border : base.colors.border,
    },
    font: {
      display: typeof font.display === 'string' ? font.display : base.font.display,
      body: typeof font.body === 'string' ? font.body : base.font.body,
      scale: Math.min(2, Math.max(0.5, num(font.scale, base.font.scale))),
      weight: Math.min(900, Math.max(300, num(font.weight, base.font.weight))),
      url: typeof font.url === 'string' ? font.url : base.font.url,
    },
    radius: Math.min(64, Math.max(0, num(t.radius, base.radius))),
    shadow: t.shadow === 'none' || t.shadow === 'strong' ? t.shadow : 'soft',
    gap: Math.min(64, Math.max(0, num(t.gap, base.gap))),
    grid: {
      cols: Math.min(48, Math.max(6, Math.round(num(grid.cols, base.grid.cols)))),
      rows: Math.min(48, Math.max(6, Math.round(num(grid.rows, base.grid.rows)))),
    },
    card: {
      opacity: Math.min(1, Math.max(0, num(card.opacity, base.card.opacity))),
      blur: Math.min(60, Math.max(0, num(card.blur, base.card.blur))),
      border: typeof card.border === 'boolean' ? card.border : base.card.border,
    },
    background: normalizeBackground(t.background, base.background),
    animations: {
      enabled: typeof animations.enabled === 'boolean' ? animations.enabled : base.animations.enabled,
      durationMs: Math.min(5000, Math.max(0, num(animations.durationMs, base.animations.durationMs))),
    },
  };
}

function normalizeCard(input: unknown, index: number): Card | null {
  if (!isObject(input)) return null;
  const type = CARD_TYPES.includes(input.type) ? input.type : null;
  if (!type) return null;
  const layout = isObject(input.layout) ? input.layout : {};
  return {
    id: typeof input.id === 'string' && input.id ? input.id : newId(`card${index}`),
    type,
    layout: clampRect({
      x: num(layout.x, 0),
      y: num(layout.y, 0),
      w: num(layout.w, 6),
      h: num(layout.h, 4),
    }),
    visible: input.visible !== false,
    fullscreen: input.fullscreen === true,
    refreshSec: Number.isFinite(Number(input.refreshSec)) ? Number(input.refreshSec) : undefined,
    style: isObject(input.style) ? input.style : undefined,
    config: normalizeCardConfig(type, input.config),
  };
}

function normalizePage(input: unknown, index: number, base: Page): Page {
  const p = isObject(input) ? input : {};
  const cards = Array.isArray(p.cards)
    ? p.cards.map((c, i) => normalizeCard(c, i)).filter((c): c is Card => Boolean(c))
    : [];
  const rotationSec = num(p.rotationSec, NaN);
  return {
    id: typeof p.id === 'string' && p.id ? p.id : newId(`page${index}`),
    name: typeof p.name === 'string' && p.name ? p.name : `Page ${index + 1}`,
    theme: isObject(p.theme) ? p.theme : undefined,
    background: p.background ? normalizeBackground(p.background, base.background ?? DEFAULT_THEME.background) : undefined,
    transition: p.transition === 'slide' || p.transition === 'none' ? p.transition : 'fade',
    rotationSec: Number.isFinite(rotationSec) ? Math.min(3600, Math.max(5, Math.round(rotationSec))) : undefined,
    cards,
  };
}

/**
 * Accepts a raw board config, an exported file ({ config }), or a JSON string.
 * Merges with defaults, drops unknown cards, clamps layouts, and guarantees one page.
 */
export function normalizeBoardConfig(raw: unknown): BoardConfig {
  let input = raw;
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch {
      throw new Error('That file is not valid JSON.');
    }
  }
  if (isObject(input) && isObject(input.config)) input = input.config;
  if (!isObject(input)) throw new Error('That file does not contain a board.');

  const base = defaultBoard();
  const pages = Array.isArray(input.pages) && input.pages.length
    ? input.pages.map((p, i) => normalizePage(p, i, base.pages[0]))
    : base.pages;

  // Keep ids unique.
  const seenPages = new Set<string>();
  for (const p of pages) {
    if (seenPages.has(p.id)) p.id = newId('page');
    seenPages.add(p.id);
    const seenCards = new Set<string>();
    for (const c of p.cards) {
      if (seenCards.has(c.id)) c.id = newId('card');
      seenCards.add(c.id);
    }
  }

  const s = isObject(input.settings) ? input.settings : {};
  const rotation = isObject(s.rotation) ? s.rotation : {};
  const maintenance = isObject(s.maintenance) ? s.maintenance : {};
  const settings = {
    name: typeof s.name === 'string' && s.name ? s.name : base.settings.name,
    defaultPageId: typeof s.defaultPageId === 'string' ? s.defaultPageId : pages[0].id,
    locale: typeof s.locale === 'string' && s.locale ? s.locale : base.settings.locale,
    timezone: typeof s.timezone === 'string' && s.timezone ? s.timezone : base.settings.timezone,
    rotation: {
      enabled: Boolean(rotation.enabled),
      pageIds: Array.isArray(rotation.pageIds)
        ? rotation.pageIds.filter((id: unknown) => typeof id === 'string' && pages.some((p) => p.id === id))
        : pages.map((p) => p.id),
      intervalSec: Math.min(3600, Math.max(5, num(rotation.intervalSec, 30))),
    },
    maintenance: {
      reloadAt: typeof maintenance.reloadAt === 'string' ? maintenance.reloadAt : null,
      blankOutsideHours: Boolean(maintenance.blankOutsideHours),
    },
    lowPower: Boolean(s.lowPower),
    calendar: {
      url: typeof s.calendar?.url === 'string' ? s.calendar.url : (typeof s.calendarUrl === 'string' ? s.calendarUrl : ''),
      includeInternal: Boolean(s.calendar?.includeInternal ?? s.calendarIncludeInternal),
    },
  };

  if (!pages.some((p) => p.id === settings.defaultPageId)) settings.defaultPageId = pages[0].id;

  return {
    schemaVersion: SCHEMA_VERSION,
    version: Math.max(1, num(input.version, 1)),
    updatedAt: num(input.updatedAt, Date.now()),
    settings,
    theme: mergeTheme(base.theme, input.theme),
    pages,
  };
}

export function exportBoardJson(config: BoardConfig): string {
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      config,
    },
    null,
    2,
  );
}
