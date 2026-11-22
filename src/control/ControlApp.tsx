import { useEffect, useState } from 'react';
import {
  ExternalLink,
  LayoutGrid,
  LogOut,
  Megaphone,
  MonitorSmartphone,
  Palette,
  Plus,
  Redo2,
  Settings as SettingsIcon,
  Undo2,
} from 'lucide-react';
import type { CardType, Rect } from '@shared/types';
import { newId } from '@shared/ids';
import { defaultCardConfig } from '@shared/schemas';
import { findFreeSpot } from '@shared/layout';
import { CARD_DEFS } from '@/cards/registry';
import { useBoard } from '@/lib/board';
import { useAuth } from '@/lib/auth';
import { DEMO } from '@/lib/store';
import { cn } from '@/lib/cn';
import { Badge, Button, IconButton } from '@/components/ui';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { PagesPanel } from './PagesPanel';
import { ThemePanel } from './ThemePanel';
import { ScreensPanel } from './ScreensPanel';
import { AnnouncementsPanel } from './AnnouncementsPanel';
import { SettingsPanel } from './SettingsPanel';

type Tab = 'pages' | 'theme' | 'screens' | 'announcements' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'pages', label: 'Pages', icon: LayoutGrid },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'screens', label: 'Screens', icon: MonitorSmartphone },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function ControlApp() {
  const { config, loading, saveState, error, canUndo, canRedo, mutate, beginHistory, undo, redo, createBoard } =
    useBoard();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('pages');
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    const exists = activePageId && config.pages.some((p) => p.id === activePageId);
    if (exists) return;
    const fallback = config.pages.find((p) => p.id === config.settings.defaultPageId) ?? config.pages[0];
    setActivePageId(fallback?.id ?? null);
  }, [config, activePageId]);

  useEffect(() => {
    setSelectedCardId(null);
  }, [activePageId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  if (loading) {
    return (
      <div className="cb-control flex min-h-screen items-center justify-center text-sm text-stone-400">
        Loading your board…
      </div>
    );
  }

  if (!config) {
    return (
      <div className="cb-control flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <LayoutGrid size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">No board yet</h1>
          <p className="mt-1 max-w-sm text-sm text-stone-500">
            Create a board to start adding pages and cards. Screens will pick it up straight away.
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => void createBoard()}>
          <Plus size={15} /> Create board
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          <LogOut size={14} /> Sign out
        </Button>
      </div>
    );
  }

  const activePage = config.pages.find((p) => p.id === activePageId) ?? config.pages[0] ?? null;

  const addPage = () => {
    const id = newId('page');
    const name = `Page ${config.pages.length + 1}`;
    mutate((draft) => {
      draft.pages.push({ id, name, transition: 'fade', cards: [] });
    });
    setActivePageId(id);
    setTab('pages');
  };

  const duplicatePage = (pageId: string) => {
    const source = config.pages.find((p) => p.id === pageId);
    if (!source) return;
    const id = newId('page');
    const copy = structuredClone(source);
    copy.id = id;
    copy.name = `${source.name} copy`;
    copy.cards = copy.cards.map((c) => ({ ...c, id: newId('card') }));
    mutate((draft) => {
      const index = draft.pages.findIndex((p) => p.id === pageId);
      draft.pages.splice(index + 1, 0, copy);
    });
    setActivePageId(id);
  };

  const deletePage = (pageId: string) => {
    if (config.pages.length <= 1) return;
    const page = config.pages.find((p) => p.id === pageId);
    if (!page) return;
    if (!window.confirm(`Delete "${page.name}"? This removes all ${page.cards.length} card${page.cards.length === 1 ? '' : 's'} on it.`))
      return;
    const nextPage = config.pages.find((p) => p.id !== pageId);
    mutate((draft) => {
      draft.pages = draft.pages.filter((p) => p.id !== pageId);
      if (!draft.pages.some((p) => p.id === draft.settings.defaultPageId)) {
        draft.settings.defaultPageId = draft.pages[0]?.id ?? '';
      }
      draft.settings.rotation.pageIds = draft.settings.rotation.pageIds.filter((id) => id !== pageId);
    });
    if (activePageId === pageId) setActivePageId(nextPage?.id ?? null);
  };

  const movePage = (pageId: string, direction: -1 | 1) => {
    mutate((draft) => {
      const index = draft.pages.findIndex((p) => p.id === pageId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= draft.pages.length) return;
      const [page] = draft.pages.splice(index, 1);
      draft.pages.splice(target, 0, page);
    });
  };

  const makeDefault = (pageId: string) => {
    mutate((draft) => {
      draft.settings.defaultPageId = pageId;
    });
  };

  const addCard = (type: CardType) => {
    if (!activePage) return;
    const def = CARD_DEFS[type];
    const layout = findFreeSpot(activePage.cards, def.defaultSize.w, def.defaultSize.h);
    const id = newId('card');
    mutate((draft) => {
      const page = draft.pages.find((p) => p.id === activePage.id);
      if (!page) return;
      page.cards.push({ id, type, layout, visible: true, config: defaultCardConfig(type) });
    });
    setSelectedCardId(id);
  };

  const updateLayout = (cardId: string, layout: Rect) => {
    mutate(
      (draft) => {
        const page = draft.pages.find((p) => p.id === activePage?.id);
        const card = page?.cards.find((c) => c.id === cardId);
        if (card) card.layout = layout;
      },
      { history: false },
    );
  };

  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'error'
        ? 'Save failed'
        : saveState === 'saved'
          ? 'Saved'
          : 'Ready';

  const saveDot =
    saveState === 'error'
      ? 'bg-red-400'
      : saveState === 'saving'
        ? 'bg-amber-400 animate-pulse'
        : 'bg-emerald-500';

  return (
    <div className="cb-control flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-3 shadow-sm sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <LayoutGrid size={16} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight text-stone-900">{config.settings.name}</div>
            <div className="text-[10px] text-stone-400">Control panel</div>
          </div>
          {DEMO ? <Badge tone="amber">Demo</Badge> : null}
        </div>

        {/* Desktop nav */}
        <nav className="ml-3 hidden flex-1 items-center gap-0.5 md:flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition',
                tab === id
                  ? 'bg-amber-50 text-amber-700'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 sm:flex">
            <span className={cn('h-2 w-2 rounded-full', saveDot)} />
            <span className="text-xs text-stone-400">{saveLabel}</span>
          </div>
          <IconButton label="Undo" onClick={undo} disabled={!canUndo}>
            <Undo2 size={14} />
          </IconButton>
          <IconButton label="Redo" onClick={redo} disabled={!canRedo}>
            <Redo2 size={14} />
          </IconButton>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-600 shadow-sm transition hover:bg-stone-50"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">View display</span>
          </a>
          <IconButton label="Sign out" onClick={() => void signOut()}>
            <LogOut size={14} />
          </IconButton>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-b border-stone-200 bg-white px-2 py-1.5 md:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition',
              tab === id ? 'bg-amber-50 text-amber-700' : 'text-stone-500',
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
      ) : null}

      {/* Pages tab */}
      {tab === 'pages' && activePage ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[14rem_minmax(0,1fr)] 2xl:grid-cols-[14rem_minmax(0,1fr)_20rem]">
          <PagesPanel
            className="hidden xl:flex"
            pages={config.pages}
            activePageId={activePage.id}
            defaultPageId={config.settings.defaultPageId}
            onSelectPage={setActivePageId}
            onAddPage={addPage}
            onDuplicatePage={duplicatePage}
            onDeletePage={deletePage}
            onMovePage={movePage}
            onMakeDefault={makeDefault}
          />

          <div className="flex min-h-0 flex-col overflow-y-auto">
            {/* Mobile page picker */}
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-3 py-2 xl:hidden">
              <select
                className="h-9 flex-1 appearance-none rounded-lg border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none focus:border-amber-400"
                value={activePage.id}
                onChange={(e) => setActivePageId(e.target.value)}
              >
                {config.pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="primary" onClick={addPage}>
                <Plus size={13} /> Add page
              </Button>
            </div>

            <div className="flex min-h-[560px] flex-1 flex-col p-3 sm:p-4">
              <Canvas
                page={activePage}
                selectedId={selectedCardId}
                onSelect={setSelectedCardId}
                onLayoutChange={updateLayout}
                onBeginHistory={beginHistory}
                onAddCard={addCard}
              />
            </div>
          </div>

          <aside className="hidden min-h-0 overflow-y-auto border-l border-stone-200 bg-stone-50 p-4 2xl:block">
            <Inspector page={activePage} selectedId={selectedCardId} onSelect={setSelectedCardId} />
          </aside>

          <div className="border-t border-stone-200 bg-stone-50 p-4 2xl:hidden">
            <Inspector page={activePage} selectedId={selectedCardId} onSelect={setSelectedCardId} />
          </div>
        </div>
      ) : null}

      {tab === 'theme' ? (
        <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
          <ThemePanel />
        </main>
      ) : null}

      {tab === 'screens' ? (
        <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
          <ScreensPanel />
        </main>
      ) : null}

      {tab === 'announcements' ? (
        <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
          <AnnouncementsPanel />
        </main>
      ) : null}

      {tab === 'settings' ? (
        <main className="mx-auto w-full max-w-2xl p-4 sm:p-6">
          <SettingsPanel />
        </main>
      ) : null}
    </div>
  );
}
