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

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const RESIZE_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

function applyResize(
  rect: Rect,
  handle: ResizeHandle,
  delta: { dx: number; dy: number },
  cols: number,
  rows: number,
): Rect {
  let { x, y, w, h } = rect;
  const { dx, dy } = delta;

  if (handle.includes('e')) {
    w = Math.min(cols - x, Math.max(1, w + dx));
  }
  if (handle.includes('s')) {
    h = Math.min(rows - y, Math.max(1, h + dy));
  }
  if (handle.includes('w')) {
    const maxX2 = x + w;
    const newX = Math.max(0, Math.min(maxX2 - 1, x + dx));
    w = maxX2 - newX;
    x = newX;
  }
  if (handle.includes('n')) {
    const maxY2 = y + h;
    const newY = Math.max(0, Math.min(maxY2 - 1, y + dy));
    h = maxY2 - newY;
    y = newY;
  }
  return { x, y, w, h };
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
        mode: 'move';
        startX: number;
        startY: number;
        rect: Rect;
      }
    | {
        mode: 'resize';
        handle: ResizeHandle;
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

  const beginMove = (event: ReactPointerEvent) => {
    if (!editing || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(card.id);
    onBeginHistory?.();
    drag.current = { mode: 'move', startX: event.clientX, startY: event.clientY, rect: card.layout };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const beginResize = (event: ReactPointerEvent, handle: ResizeHandle) => {
    if (!editing || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(card.id);
    onBeginHistory?.();
    drag.current = { mode: 'resize', handle, startX: event.clientX, startY: event.clientY, rect: card.layout };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const move = (event: ReactPointerEvent) => {
    const current = drag.current;
    if (!current) return;
    const delta = deltaToGrid(event.clientX - current.startX, event.clientY - current.startY, metrics);
    const next =
      current.mode === 'move'
        ? clampRect({ ...current.rect, x: current.rect.x + delta.dx, y: current.rect.y + delta.dy }, metrics.cols, metrics.rows)
        : applyResize(current.rect, current.handle, delta, metrics.cols, metrics.rows);
    liveRef.current = next;
    setLive(next);
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
        zIndex: selected ? 10 : pageZ(card),
        touchAction: editing ? 'none' : undefined,
      }}
      onPointerDown={beginMove}
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
          {selected &&
            RESIZE_HANDLES.map((handle) => (
              <div
                key={handle}
                className={`cb-resize cb-resize-${handle}`}
                onPointerDown={(event) => beginResize(event, handle)}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                role="presentation"
              />
            ))}
        </>
      ) : null}
    </div>
  );
}

function pageZ(card: Card) {
  return 1;
}
