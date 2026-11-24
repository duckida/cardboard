import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type { Card, Page, Rect } from '@shared/types';
import { clampRect, deltaToGrid, gridMetrics, rectToPx } from '@shared/layout';
import { CARD_DEFS } from '@/cards/registry';
import { CardFrame } from '@/display/CardFrame';
import { useDisplay } from '@/display/DisplayContext';
import { useElementSize } from '@/lib/useNow';
import { cn } from '@/lib/cn';
import { cardKind, cardLabel, isMediaCard } from './common';

type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw';

function applyResize(
  rect: Rect,
  handle: ResizeHandle,
  delta: { dx: number; dy: number },
  cols: number,
  rows: number,
): Rect {
  let { x, y, w, h } = rect;
  if (handle.includes('e')) w = Math.min(cols - x, Math.max(2, w + delta.dx));
  if (handle.includes('s')) h = Math.min(rows - y, Math.max(2, h + delta.dy));
  if (handle.includes('w')) {
    const right = x + w;
    const newX = Math.max(0, Math.min(right - 2, x + delta.dx));
    w = right - newX;
    x = newX;
  }
  if (handle.includes('n')) {
    const bottom = y + h;
    const newY = Math.max(0, Math.min(bottom - 2, y + delta.dy));
    h = bottom - newY;
    y = newY;
  }
  return { x, y, w, h };
}

export function EditorCanvas({
  page,
  selectedId,
  onSelect,
  onLayoutChange,
  onBeginHistory,
  onSetFullscreen,
  onCardDragStart,
  onCardDragMove,
  onCardDragEnd,
  onAddContent,
}: {
  page: Page;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLayoutChange: (id: string, rect: Rect) => void;
  onBeginHistory: () => void;
  onSetFullscreen: (id: string, fullscreen: boolean) => void;
  onCardDragStart: (card: Card) => void;
  onCardDragMove: (x: number, y: number) => void;
  onCardDragEnd: () => void;
  onAddContent: () => void;
}) {
  const { theme } = useDisplay();
  const [ref, size] = useElementSize<HTMLDivElement>();
  const metrics = gridMetrics(size.width, size.height, theme.gap, theme.grid.cols, theme.grid.rows);

  return (
    <div
      ref={ref}
      className="relative h-full w-full"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onSelect(null);
      }}
    >
      {page.cards.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto rounded-2xl border border-dashed border-white/30 bg-black/45 px-6 py-5 text-center backdrop-blur-sm">
            <p className="text-sm font-semibold text-white">This page is empty</p>
            <p className="mt-1 text-xs text-white/65">Add a clock, some photos, or a notice.</p>
            <button
              type="button"
              onClick={onAddContent}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-ink transition hover:bg-white/90"
            >
              Add content
            </button>
          </div>
        </div>
      ) : null}

      {size.width > 0 ? (
        <>
          {page.cards
            .filter((card) => card.fullscreen)
            .map((card) => (
              <CardBlock
                key={card.id}
                card={card}
                metrics={metrics}
                selected={selectedId === card.id}
                onSelect={onSelect}
                onLayoutChange={onLayoutChange}
                onBeginHistory={onBeginHistory}
                onSetFullscreen={onSetFullscreen}
                onCardDragStart={onCardDragStart}
                onCardDragMove={onCardDragMove}
                onCardDragEnd={onCardDragEnd}
              />
            ))}
          {page.cards
            .filter((card) => !card.fullscreen)
            .map((card) => (
              <CardBlock
                key={card.id}
                card={card}
                metrics={metrics}
                selected={selectedId === card.id}
                onSelect={onSelect}
                onLayoutChange={onLayoutChange}
                onBeginHistory={onBeginHistory}
                onSetFullscreen={onSetFullscreen}
                onCardDragStart={onCardDragStart}
                onCardDragMove={onCardDragMove}
                onCardDragEnd={onCardDragEnd}
              />
            ))}
        </>
      ) : null}
    </div>
  );
}

function CardBlock({
  card,
  metrics,
  selected,
  onSelect,
  onLayoutChange,
  onBeginHistory,
  onSetFullscreen,
  onCardDragStart,
  onCardDragMove,
  onCardDragEnd,
}: {
  card: Card;
  metrics: ReturnType<typeof gridMetrics>;
  selected: boolean;
  onSelect: (id: string | null) => void;
  onLayoutChange: (id: string, rect: Rect) => void;
  onBeginHistory: () => void;
  onSetFullscreen: (id: string, fullscreen: boolean) => void;
  onCardDragStart: (card: Card) => void;
  onCardDragMove: (x: number, y: number) => void;
  onCardDragEnd: () => void;
}) {
  const [live, setLive] = useState<Rect | null>(null);
  const drag = useRef<
    | null
    | {
        mode: 'move' | 'resize';
        handle?: ResizeHandle;
        startX: number;
        startY: number;
        rect: Rect;
        moved: boolean;
      }
  >(null);
  const liveRef = useRef<Rect | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const rect = live ?? card.layout;
  const px = rectToPx(rect, metrics);
  const def = CARD_DEFS[card.type];
  const Component = def?.Component;
  const fullscreen = Boolean(card.fullscreen);
  const media = isMediaCard(card);

  useEffect(() => () => cleanupRef.current?.(), []);

  const begin = (event: ReactPointerEvent<HTMLElement>, mode: 'move' | 'resize', handle?: ResizeHandle) => {
    if (event.button !== 0) return;
    onSelect(card.id);
    if (fullscreen) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current = {
      mode,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      rect: card.layout,
      moved: false,
    };

    const onMove = (native: PointerEvent) => moveTo(native.clientX, native.clientY);
    const onEnd = () => end();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      cleanupRef.current = null;
    };
    // Capture is a nice-to-have: the window listeners above keep the drag
    // reliable even when the pointer leaves the card.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignored — window listeners still track the drag
    }
  };

  const moveTo = (clientX: number, clientY: number) => {
    const current = drag.current;
    if (!current) return;
    const dxPx = clientX - current.startX;
    const dyPx = clientY - current.startY;
    if (!current.moved && Math.abs(dxPx) < 4 && Math.abs(dyPx) < 4) return;
    if (!current.moved) {
      current.moved = true;
      onBeginHistory();
      if (media) onCardDragStart(card);
    }
    if (media) onCardDragMove(clientX, clientY);
    const delta = deltaToGrid(dxPx, dyPx, metrics);
    const next =
      current.mode === 'move'
        ? clampRect(
            {
              ...current.rect,
              x: current.rect.x + delta.dx,
              y: current.rect.y + delta.dy,
            },
            metrics.cols,
            metrics.rows,
          )
        : applyResize(current.rect, current.handle ?? 'se', delta, metrics.cols, metrics.rows);
    liveRef.current = next;
    setLive(next);
  };

  const end = () => {
    const current = drag.current;
    if (!current) return;
    cleanupRef.current?.();
    drag.current = null;
    const next = liveRef.current;
    liveRef.current = null;
    setLive(null);
    if (current.moved) {
      if (next) onLayoutChange(card.id, next);
      if (media) onCardDragEnd();
    }
  };

  return (
    <div
      className={cn(
        'cb-edit-slot',
        selected && 'cb-edit-slot-selected',
        fullscreen && 'cb-edit-slot-fullscreen',
        !card.visible && 'cb-edit-slot-hidden',
      )}
      data-cb-card-id={card.id}
      style={{
        position: 'absolute',
        ...(fullscreen
          ? { inset: 'calc(-1 * var(--cb-page-pad, 0px))' }
          : { left: px.left, top: px.top, width: px.width, height: px.height }),
        zIndex: fullscreen ? 0 : selected ? 20 : 1,
        touchAction: 'none',
      }}
      onPointerDown={(event) => begin(event, 'move')}
      onDoubleClick={(event) => {
        if (!media) return;
        event.stopPropagation();
        onSetFullscreen(card.id, !fullscreen);
      }}
      role="presentation"
    >
      {Component ? (
        fullscreen ? (
          <div className="cb-fullscreen-card">
            <Component card={card} />
          </div>
        ) : (
          <CardFrame card={card}>
            <Component card={card} />
          </CardFrame>
        )
      ) : null}

      {selected ? (
        <>
          <div className="cb-edit-tag">
            {cardKind(card)}
            {cardLabel(card) !== cardKind(card) ? <span className="cb-edit-tag-sub">{cardLabel(card)}</span> : null}
            {!card.visible ? <span className="cb-edit-tag-hidden">Hidden</span> : null}
          </div>

          {!fullscreen ? (
            <>
              <div className="cb-edit-handle-grid">
                {(['nw', 'ne', 'se', 'sw'] as ResizeHandle[]).map((handle) => (
                  <div
                    key={handle}
                    className={`cb-edit-handle cb-edit-handle-${handle}`}
                    onPointerDown={(event) => begin(event, 'resize', handle)}
                    role="presentation"
                  />
                ))}
              </div>
              {media ? (
                <button
                  type="button"
                  className="cb-edit-fill"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSetFullscreen(card.id, true);
                  }}
                >
                  <Maximize2 size={12} /> Fill screen
                </button>
              ) : null}
            </>
          ) : (
            <button
              type="button"
              className="cb-edit-fill cb-edit-fill-exit"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSetFullscreen(card.id, false);
              }}
            >
              <Minimize2 size={12} /> Put back on page
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
