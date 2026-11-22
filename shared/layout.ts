import { GRID_COLS, GRID_ROWS, type Rect } from './types';

export interface GridMetrics {
  width: number;
  height: number;
  cols: number;
  rows: number;
  gap: number;
  colW: number;
  rowH: number;
}

export function gridMetrics(
  width: number,
  height: number,
  gap: number,
  cols = GRID_COLS,
  rows = GRID_ROWS,
): GridMetrics {
  const colW = Math.max(0, (width - gap * (cols - 1)) / cols);
  const rowH = Math.max(0, (height - gap * (rows - 1)) / rows);
  return { width, height, cols, rows, gap, colW, rowH };
}

export function rectToPx(rect: Rect, m: GridMetrics) {
  return {
    left: rect.x * (m.colW + m.gap),
    top: rect.y * (m.rowH + m.gap),
    width: Math.max(0, rect.w * m.colW + (rect.w - 1) * m.gap),
    height: Math.max(0, rect.h * m.rowH + (rect.h - 1) * m.gap),
  };
}

export function deltaToGrid(dx: number, dy: number, m: GridMetrics) {
  return {
    dx: Math.round(dx / Math.max(1, m.colW + m.gap)),
    dy: Math.round(dy / Math.max(1, m.rowH + m.gap)),
  };
}

export function clampRect(rect: Rect, cols = GRID_COLS, rows = GRID_ROWS): Rect {
  const w = Math.min(Math.max(1, Math.round(rect.w)), cols);
  const h = Math.min(Math.max(1, Math.round(rect.h)), rows);
  return {
    x: Math.min(Math.max(0, Math.round(rect.x)), cols - w),
    y: Math.min(Math.max(0, Math.round(rect.y)), rows - h),
    w,
    h,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function findFreeSpot(
  cards: { layout: Rect }[],
  w: number,
  h: number,
  cols = GRID_COLS,
  rows = GRID_ROWS,
): Rect {
  const width = Math.min(Math.max(1, Math.round(w)), cols);
  const height = Math.min(Math.max(1, Math.round(h)), rows);
  for (let y = 0; y <= rows - height; y += 1) {
    for (let x = 0; x <= cols - width; x += 1) {
      const candidate = { x, y, w: width, h: height };
      if (!cards.some((card) => overlaps(candidate, card.layout))) return candidate;
    }
  }
  return clampRect({ x: 0, y: 0, w: width, h: height }, cols, rows);
}
