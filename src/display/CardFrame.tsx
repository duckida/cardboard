import type { CSSProperties, ReactNode } from 'react';
import type { Card, Theme } from '@shared/types';
import { useDisplay } from './DisplayContext';

function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#')) return color;
  const hex = color.slice(1);
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return color;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function CardFrame({ card, children }: { card: Card; children: ReactNode }) {
  const { theme, lite, editing } = useDisplay();
  const style = card.style ?? {};
  const bg = style.background ?? theme.colors.surface;
  const opacity = style.opacity ?? theme.card.opacity;
  const blur = lite ? 0 : style.blur ?? theme.card.blur;
  const padding = style.padding ?? Math.round(theme.gap * 1.1);
  const radius = style.radius ?? theme.radius;

  const css: CSSProperties = {
    background: withAlpha(bg, opacity),
    borderRadius: radius,
    padding,
    border: (style.border ?? theme.card.border) ? `1px solid ${withAlpha(theme.colors.border, 0.9)}` : 'none',
    boxShadow: 'var(--cb-shadow)',
    backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
    WebkitBackdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
    textAlign: style.align ?? 'left',
    overflow: 'hidden',
  };

  return (
    <div className="cb-card" style={css} data-card-id={card.id}>
      <div
        className="cb-card-inner"
        style={{
          fontSize: `${(style.textScale ?? 1) * 1}em`,
          pointerEvents: editing ? 'none' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function cardThemeVars(theme: Theme, lite: boolean): CSSProperties {
  return {
    '--cb-accent': theme.colors.accent,
    '--cb-text': theme.colors.text,
    '--cb-muted': theme.colors.muted,
    '--cb-border': theme.colors.border,
    '--cb-radius': `${theme.radius}px`,
    '--cb-gap': `${theme.gap}px`,
    '--cb-anim': `${theme.animations.enabled && !lite ? theme.animations.durationMs : 0}ms`,
  } as CSSProperties;
}
