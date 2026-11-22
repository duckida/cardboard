import { useEffect } from 'react';
import type { Page, Rect } from '@shared/types';
import { gridMetrics } from '@shared/layout';
import { PageRenderer } from '@/display/PageRenderer';
import { DisplayContext } from '@/display/DisplayContext';
import { useBoard } from '@/lib/board';
import { themeVars } from '@/lib/theme';
import { useElementSize } from '@/lib/useNow';
import { Palette } from './Palette';
import type { CardType } from '@shared/types';

export function Canvas({
  page,
  selectedId,
  onSelect,
  onLayoutChange,
  onBeginHistory,
  onAddCard,
}: {
  page: Page;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLayoutChange: (id: string, rect: Rect) => void;
  onBeginHistory: () => void;
  onAddCard: (type: CardType) => void;
}) {
  const { config } = useBoard();
  const theme = config!.theme;
  const [stageRef, stageSize] = useElementSize<HTMLDivElement>();
  const metrics = gridMetrics(stageSize.width, stageSize.height, theme.gap, theme.grid.cols, theme.grid.rows);
  const cellW = metrics.colW + metrics.gap;
  const cellH = metrics.rowH + metrics.gap;

  // Keep a 16:9 stage inside whatever room the panel has.
  const stageWidth = Math.max(0, Math.min(stageSize.width, (stageSize.height * 16) / 9));
  const stageHeight = (stageWidth * 9) / 16;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Palette onAdd={onAddCard} />
        <div className="text-[11px] text-slate-500">
          {page.cards.length} card{page.cards.length === 1 ? '' : 's'} · drag to move, corner to resize
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20 p-3"
      >
        <div
          className="cb-canvas relative overflow-hidden rounded-xl"
          style={{
            ...themeVars(theme, false),
            width: stageWidth || '100%',
            height: stageHeight || '56.25%',
          }}
        >
          <div
            className="cb-canvas-grid pointer-events-none absolute inset-0"
            style={{
              backgroundSize: `${cellW}px ${cellH}px`,
              backgroundPosition: `${theme.gap / 2}px ${theme.gap / 2}px`,
            }}
          />
          {stageWidth > 0 ? (
            <DisplayContext.Provider value={{ theme, lite: false, editing: true, pageId: page.id }}>
              <PageRenderer
                page={page}
                width={stageWidth}
                height={stageHeight}
                editing
                selectedId={selectedId}
                onSelect={onSelect}
                onLayoutChange={onLayoutChange}
                onBeginHistory={onBeginHistory}
              />
            </DisplayContext.Provider>
          ) : null}
          <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 backdrop-blur">
            {page.name}
          </div>
        </div>
      </div>
    </div>
  );
}
