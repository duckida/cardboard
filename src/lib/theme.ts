import type { CSSProperties } from 'react';
import type { Page, Theme } from '@shared/types';
import { mergeTheme } from '@shared/normalize';

const SHADOWS: Record<Theme['shadow'], string> = {
  none: 'none',
  soft: '0 18px 50px rgba(0, 0, 0, 0.28)',
  strong: '0 30px 90px rgba(0, 0, 0, 0.5)',
};

export function themeVars(theme: Theme, lite: boolean): CSSProperties {
  return {
    '--cb-bg': theme.colors.bg,
    '--cb-surface': theme.colors.surface,
    '--cb-text': theme.colors.text,
    '--cb-muted': theme.colors.muted,
    '--cb-accent': theme.colors.accent,
    '--cb-border': theme.colors.border,
    '--cb-font-display': theme.font.display,
    '--cb-font-body': theme.font.body,
    '--cb-weight': String(theme.font.weight),
    '--cb-text-scale': String(theme.font.scale),
    '--cb-radius': `${theme.radius}px`,
    '--cb-gap': `${theme.gap}px`,
    '--cb-card-opacity': String(theme.card.opacity),
    '--cb-card-blur': `${lite ? 0 : theme.card.blur}px`,
    '--cb-shadow': lite ? 'none' : SHADOWS[theme.shadow],
    '--cb-anim': `${theme.animations.enabled && !lite ? theme.animations.durationMs : 0}ms`,
    color: theme.colors.text,
    fontFamily: theme.font.body,
    background: theme.colors.bg,
  } as CSSProperties;
}

export function pageTheme(base: Theme, page: Page): Theme {
  return page.theme ? mergeTheme(base, page.theme) : base;
}

export function isLiteMode(lowPower: boolean): boolean {
  if (typeof window === 'undefined') return lowPower;
  const params = new URLSearchParams(window.location.search);
  if (params.get('perf') === '1') return true;
  if (params.get('perf') === '0') return false;
  if (lowPower) return true;
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return cores <= 4 || memory <= 2;
}
