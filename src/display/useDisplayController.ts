import { useEffect, useMemo, useRef, useState } from 'react';
import type { BoardConfig, Page, Screen } from '@shared/types';
import { getStore } from '@/lib/store';
import { useScreens } from '@/lib/hooks';
import { dayKey } from '@/lib/time';

function prettyName(id: string) {
  return id
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface DisplayState {
  page: Page | null;
  pages: Page[];
  screen: Screen | null;
  blank: boolean;
  identify: boolean;
  goTo: (pageId: string) => void;
}

export function useDisplayController(screenId: string | undefined, config: BoardConfig | null): DisplayState {
  const store = getStore();
  const screens = useScreens();
  const screen = screenId ? screens.find((item) => item.id === screenId) ?? null : null;

  const pages = config?.pages ?? [];
  const settings = config?.settings;

  const [rotationIndex, setRotationIndex] = useState(0);
  const [override, setOverride] = useState<string | null>(null);
  const [blank, setBlank] = useState(false);
  const [identify, setIdentify] = useState(false);
  const identifyTimer = useRef<number | null>(null);

  const rotationPages = useMemo(() => {
    if (!settings) return pages;
    if (!settings.rotation.enabled) return pages;
    // Rotation membership is a set; pages cycle in board order.
    const included = new Set(settings.rotation.pageIds);
    return pages.filter((page) => included.has(page.id));
  }, [pages, settings]);

  const assigned = screen?.assignedPageId
    ? pages.find((page) => page.id === screen.assignedPageId)
    : null;
  const defaultPage = pages.find((page) => page.id === settings?.defaultPageId) ?? pages[0];
  const rotating = Boolean(settings?.rotation.enabled) && rotationPages.length > 0;
  const rotated = rotating
    ? rotationPages[rotationIndex % rotationPages.length]
    : defaultPage;
  const base = assigned ?? rotated ?? defaultPage ?? null;
  const page = (override && pages.find((item) => item.id === override)) || base;

  // Rotation — each page stays up for its own duration (or the default interval).
  useEffect(() => {
    if (!settings?.rotation.enabled || assigned || override) return;
    if (rotationPages.length < 2) return;
    const current = rotationPages[rotationIndex % rotationPages.length];
    const seconds = Math.max(5, current?.rotationSec ?? settings.rotation.intervalSec);
    const timer = window.setTimeout(() => setRotationIndex((index) => index + 1), seconds * 1000);
    return () => window.clearTimeout(timer);
  }, [settings?.rotation.enabled, settings?.rotation.intervalSec, rotationPages, rotationIndex, assigned, override]);

  // Presence + heartbeat
  useEffect(() => {
    if (!screenId) return;
    const send = () => {
      store
        .heartbeat(screenId, {
          lastSeen: Date.now(),
          pageId: page?.id,
          meta: {
            ua: navigator.userAgent,
            width: window.innerWidth,
            height: window.innerHeight,
          },
        })
        .catch(() => {});
    };
    void store.ensureScreen(screenId, prettyName(screenId)).then(send).catch(() => {});
    const timer = window.setInterval(send, 45000);
    return () => window.clearInterval(timer);
  }, [screenId, page?.id, store]);

  // Commands
  useEffect(() => {
    if (!screenId) return;
    const unsub = store.subscribeCommands(screenId, (command) => {
      switch (command.type) {
        case 'reload':
          window.location.reload();
          break;
        case 'goto': {
          const payload = command.payload as { pageId?: string } | string | undefined;
          const pageId = typeof payload === 'string' ? payload : payload?.pageId;
          if (pageId) setOverride(pageId);
          break;
        }
        case 'next':
          setOverride(null);
          setRotationIndex((index) => index + 1);
          break;
        case 'blank':
          setBlank(true);
          window.setTimeout(() => setBlank(false), 60000);
          break;
        case 'identify':
          setIdentify(true);
          if (identifyTimer.current) window.clearTimeout(identifyTimer.current);
          identifyTimer.current = window.setTimeout(() => setIdentify(false), 5000);
          break;
        case 'clear-cache':
          void (async () => {
            if ('caches' in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((key) => caches.delete(key)));
            }
            window.location.reload();
          })();
          break;
      }
      if (command.id) void store.clearCommand(screenId, command.id);
    });
    return unsub;
  }, [screenId, store]);

  // Nightly reload
  useEffect(() => {
    const at = settings?.maintenance.reloadAt;
    if (!at) return;
    const timer = window.setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const today = dayKey(now, settings?.timezone ?? '');
      if (hhmm === at && localStorage.getItem('cb.lastReload') !== today) {
        localStorage.setItem('cb.lastReload', today);
        window.location.reload();
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [settings?.maintenance.reloadAt, settings?.timezone]);

  return {
    page,
    pages,
    screen,
    blank,
    identify,
    goTo: (pageId: string) => setOverride(pageId),
  };
}
