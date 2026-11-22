import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBoard } from '@/lib/board';
import { useAnnouncements } from '@/lib/hooks';
import { isLiteMode, pageTheme, themeVars } from '@/lib/theme';
import { DisplayContext } from './DisplayContext';
import { Background } from './Background';
import { PageRenderer } from './PageRenderer';
import { AnnouncementLayer } from './AnnouncementLayer';
import { useDisplayController } from './useDisplayController';

function useFontLink(url?: string) {
  useEffect(() => {
    if (!url) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    return () => link.remove();
  }, [url]);
}

export function DisplayApp() {
  const { screenId } = useParams<{ screenId?: string }>();
  const { config, loading } = useBoard();
  const announcements = useAnnouncements();
  const state = useDisplayController(screenId, config);
  const lite = isLiteMode(config?.settings?.lowPower ?? false);

  useFontLink(config?.theme.font.url);

  if (loading) {
    return (
      <div className="cb-boot">
        <div className="cb-boot-mark">Cardboard</div>
        <div className="cb-boot-sub">Loading your board…</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="cb-boot">
        <div className="cb-boot-mark">Cardboard</div>
        <div className="cb-boot-sub">No board yet. Open /control to build one.</div>
      </div>
    );
  }

  if (!state.page) {
    return (
      <div className="cb-boot">
        <div className="cb-boot-mark">Cardboard</div>
        <div className="cb-boot-sub">This board has no pages yet.</div>
      </div>
    );
  }

  const theme = pageTheme(config.theme, state.page);
  const background = state.page.background ?? theme.background;

  return (
    <DisplayContext.Provider
      value={{ theme, lite, editing: false, screenId, pageId: state.page.id }}
    >
      <div
        className="cb-display"
        data-perf={lite ? 'lite' : 'full'}
        style={themeVars(theme, lite)}
      >
        <Background background={background} lite={lite} />
        <div className="cb-page-wrap" key={state.page.id}>
          <div className={`cb-page-enter cb-transition-${state.page.transition}`}>
            <PageRenderer page={state.page} />
          </div>
        </div>
        <AnnouncementLayer
          announcements={announcements}
          screenId={screenId}
          pageId={state.page.id}
          theme={theme}
          lite={lite}
        />
        {state.blank ? <div className="cb-blank" /> : null}
        {state.identify ? (
          <div className="cb-identify">
            <span>{screenId}</span>
            <small>{state.page.name}</small>
          </div>
        ) : null}
      </div>
    </DisplayContext.Provider>
  );
}
