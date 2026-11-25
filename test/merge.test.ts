import { describe, expect, it } from 'vitest';
import type { BoardConfig, Card } from '../shared/types';
import { defaultBoard } from '../shared/defaults';
import { deepEqual, mergeBoardConfig } from '../shared/merge';

function board(): BoardConfig {
  const value = defaultBoard();
  value.version = 1;
  value.updatedAt = 1;
  return value;
}

function card(id: string): Card {
  return {
    id,
    type: 'markdown',
    layout: { x: 0, y: 0, w: 6, h: 4 },
    visible: true,
    config: { markdown: 'hello' },
  };
}

describe('mergeBoardConfig', () => {
  it('keeps a local settings edit when the server has not changed', () => {
    const base = board();
    const local = structuredClone(base);
    local.settings.name = 'Reception';
    local.version = 2;

    const merged = mergeBoardConfig(base, local, structuredClone(base));

    expect(merged.settings.name).toBe('Reception');
  });

  it('adopts a remote settings edit when this device has not changed it', () => {
    const base = board();
    const local = structuredClone(base);
    local.settings.lowPower = true;
    local.version = 2;

    const remote = structuredClone(base);
    remote.settings.calendar.url = 'https://example.test/calendar.ics';
    remote.version = 2;

    const merged = mergeBoardConfig(base, local, remote);

    expect(merged.settings.lowPower).toBe(true);
    expect(merged.settings.calendar.url).toBe('https://example.test/calendar.ics');
  });

  it('keeps settings, theme and pages changed on different devices', () => {
    const base = board();
    const local = structuredClone(base);
    local.settings.name = 'Library';
    local.settings.calendar.url = 'https://example.test/calendar.ics';
    local.version = 3;

    const remote = structuredClone(base);
    remote.theme.background = { type: 'solid', color: '#123456' };
    remote.pages[0].name = 'Morning';
    remote.version = 2;

    const merged = mergeBoardConfig(base, local, remote);

    expect(merged.settings.name).toBe('Library');
    expect(merged.settings.calendar.url).toBe('https://example.test/calendar.ics');
    expect(merged.theme.background).toEqual({ type: 'solid', color: '#123456' });
    expect(merged.pages[0].name).toBe('Morning');
  });

  it('merges a card added locally with a page renamed remotely', () => {
    const base = board();
    const local = structuredClone(base);
    local.pages[0].cards.push(card('card-new'));
    local.version = 2;

    const remote = structuredClone(base);
    remote.pages[0].name = 'Renamed remotely';
    remote.version = 2;

    const merged = mergeBoardConfig(base, local, remote);
    const cards = merged.pages[0].cards;

    expect(merged.pages[0].name).toBe('Renamed remotely');
    expect(cards.some((item) => item.id === 'card-new')).toBe(true);
    expect(cards).toHaveLength(base.pages[0].cards.length + 1);
  });

  it('keeps a page deleted locally without dropping other remote edits', () => {
    const base = board();
    expect(base.pages.length).toBeGreaterThan(1);

    const local = structuredClone(base);
    local.pages = local.pages.filter((_, index) => index !== 1);
    local.version = 2;

    const remote = structuredClone(base);
    remote.pages[0].name = 'Still here';
    remote.version = 2;

    const merged = mergeBoardConfig(base, local, remote);

    expect(merged.pages).toHaveLength(base.pages.length - 1);
    expect(merged.pages[0].name).toBe('Still here');
  });

  it('keeps a remote page addition even when this device edited another page', () => {
    const base = board();
    const local = structuredClone(base);
    local.pages[0].cards.push(card('card-local'));
    local.version = 2;

    const remote = structuredClone(base);
    remote.pages.push({ id: 'page-remote', name: 'Remote page', transition: 'fade', cards: [] });
    remote.version = 2;

    const merged = mergeBoardConfig(base, local, remote);

    expect(merged.pages).toHaveLength(base.pages.length + 1);
    expect(merged.pages.some((page) => page.id === 'page-remote')).toBe(true);
    expect(merged.pages[0].cards.some((item) => item.id === 'card-local')).toBe(true);
  });

  it('moves the version past both sides so the next save is clearly newer', () => {
    const base = board();
    const local = structuredClone(base);
    local.version = 7;
    const remote = structuredClone(base);
    remote.version = 9;

    const merged = mergeBoardConfig(base, local, remote);

    expect(merged.version).toBeGreaterThan(9);
  });
});

describe('deepEqual', () => {
  it('compares nested objects and arrays by value', () => {
    const base = board();
    const copy = structuredClone(base);
    expect(deepEqual(base, copy)).toBe(true);

    copy.settings.name = 'Different';
    expect(deepEqual(base, copy)).toBe(false);
  });
});
