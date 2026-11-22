import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Card, Page, Rect, Theme } from '@shared/types';
import { clampRect, deltaToGrid, gridMetrics, rectToPx } from '@shared/layout';
import { CARD_DEFS } from '@/cards/registry';
import { CardFrame } from './CardFrame';
import { useDisplay } from './DisplayContext';
import { useElementSize } from '@/lib/useNow';

interface PageRendererProps {
  page: Page;
  width?: number;
  height?: number;
  editing?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onLayoutChange?: (id: string, rect: Rect) => void;
  onBeginHistory?: () => void;
}

export function PageRenderer({
  page,
  width,
  height,
  editing = false,
  selectedId = null,
  onSelect,
  onLayoutChange,
  onBeginHistory,
}: PageRendererProps) {
  const { theme, lite } = useDisplay();
  const [ref, size] = useElementSize<HTMLDivElement>();
  const w = width ?? size.width;
  const h = height ?? size.height;
  const metrics = gridMetrics(w, h, theme.gap, theme.grid.cols, theme.grid.rows);

  return (
    <div
      ref={ref}
      className="cb-page"
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onPointerDown={(event) => {
        if (editing && event.target === event.currentTarget) onSelect?.(null);
      }}
    >
      {page.cards
        .filter((card) => card.visible)
        .map((card) => (
          <CardSlot
            key={card.id}
            card={card}
            metrics={metrics}
            editing={editing}
            selected={selectedId === card.id}
            onSelect={onSelect}
            onLayoutChange={onLayoutChange}
            onBeginHistory={onBeginHistory}
            lite={lite}
            theme={theme}
          />
        ))}
    </div>
  );
}

function CardSlot({
  card,
  metrics,
  editing,
  selected,
  onSelect,
  onLayoutChange,
  onBeginHistory,
  lite,
  theme,
}: {
  card: Card;
  metrics: ReturnType<typeof gridMetrics>;
  editing: boolean;
  selected: boolean;
  onSelect?: (id: string | null) => void;
  onLayoutChange?: (id: string, rect: Rect) => void;
  onBeginHistory?: () => void;
  lite: boolean;
  theme: Theme;
}) {
  const [live, setLive] = useState<Rect | null>(null);
  const drag = useRef<
    | null
    | {
        mode: 'move' | 'resize';
        startX: number;
        startY: number;
        rect: Rect;
      }
  >(null);
  const liveRef = useRef<Rect | null>(null);

  const rect = live ?? card.layout;
  const px = rectToPx(rect, metrics);
  const def = CARD_DEFS[card.type];
  const Component = def?.Component;

  const begin = (event: ReactPointerEvent, mode: 'move' | 'resize') => {
    if (!editing || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(card.id);
    onBeginHistory?.();
    drag.current = { mode, startX: event.clientX, startY: event.clientY, rect: card.layout };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const move = (event: ReactPointerEvent) => {
    const current = drag.current;
    if (!current) return;
    const delta = deltaToGrid(event.clientX - current.startX, event.clientY - current.startY, metrics);
    const next =
      current.mode === 'move'
        ? { ...current.rect, x: current.rect.x + delta.dx, y: current.rect.y + delta.dy }
        : { ...current.rect, w: current.rect.w + delta.dx, h: current.rect.h + delta.dy };
    const clamped = clampRect(next, metrics.cols, metrics.rows);
    liveRef.current = clamped;
    setLive(clamped);
  };

  const end = () => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    const next = liveRef.current;
    liveRef.current = null;
    setLive(null);
    if (next && onLayoutChange) onLayoutChange(card.id, next);
  };

  return (
    <div
      className={`cb-slot ${editing ? 'cb-slot-editing' : ''} ${selected ? 'cb-slot-selected' : ''}`}
      style={{
        position: 'absolute',
        left: px.left,
        top: px.top,
        width: px.width,
        height: px.height,
        zIndex: pageZ(card),
        touchAction: editing ? 'none' : undefined,
      }}
      onPointerDown={(event) => begin(event, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {Component ? (
        <CardFrame card={card}>
          <Component card={card} />
        </CardFrame>
      ) : null}
      {editing ? (
        <>
          <div className="cb-slot-label">
            {def?.name ?? card.type}
          </div>
          <div
            className="cb-resize"
            onPointerDown={(event) => begin(event, 'resize')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            role="presentation"
          />
        </>
      ) : null}
    </div>
  );
}

function pageZ(card: Card) {
  return 1;
}
