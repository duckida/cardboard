import type { Page } from '@shared/types';
import { PageRenderer } from '@/display/PageRenderer';
import { DisplayContext } from '@/display/DisplayContext';
import { Background } from '@/display/Background';
import { useBoard } from '@/lib/board';
import { useElementSize } from '@/lib/useNow';
import { pageTheme, themeVars } from '@/lib/theme';
import { cn } from '@/lib/cn';

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

/**
 * A non-interactive, correctly scaled view of a page.
 *
 * The page is laid out at a fixed 1280×720 size and then scaled down. This
 * matters because card text sizes use container query units with `clamp()`
 * minimums: laying a page out directly in a 320px thumbnail would make the
 * text look cramped and overlapping. Rendering at a realistic size keeps the
 * thumbnail faithful to a real screen.
 */
export function PageStage({
  page,
  className,
  rounded = 'rounded-2xl',
  padding = '2.4%',
}: {
  page: Page;
  className?: string;
  rounded?: string;
  padding?: string;
}) {
  const { config } = useBoard();
  const [ref, size] = useElementSize<HTMLDivElement>();
  if (!config) return null;

  const theme = pageTheme(config.theme, page);
  const background = page.background ?? theme.background;
  const scale = size.width > 0 ? size.width / BASE_WIDTH : 0;

  return (
    <div
      ref={ref}
      className={cn('relative isolate w-full overflow-hidden bg-black', rounded, className)}
      style={{ aspectRatio: '16 / 9' }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${scale})`,
          visibility: scale > 0 ? 'visible' : 'hidden',
          ...themeVars(theme, false),
        }}
      >
        <Background background={background} lite={false} />
        <div className="absolute inset-0" style={{ padding }}>
          <DisplayContext.Provider value={{ theme, lite: false, editing: false, pageId: page.id }}>
            <PageRenderer page={page} />
          </DisplayContext.Provider>
        </div>
      </div>
    </div>
  );
}
