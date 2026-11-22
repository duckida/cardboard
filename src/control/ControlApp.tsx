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
import { Badge, Button, IconButton, Select } from '@/components/ui';
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
  const { config, loading, saveState, error, canUndo, canRedo, mutate, beginHistory, undo, redo, createBoard } = useBoard();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('pages');
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    const exists = activePageId && config.pages.some((page) => page.id === activePageId);
    if (exists) return;
    const fallback = config.pages.find((page) => page.id === config.settings.defaultPageId) ?? config.pages[0];
    setActivePageId(fallback?.id ?? null);
  }, [config, activePageId]);

  useEffect(() => {
    setSelectedCardId(null);
  }, [activePageId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080a11] text-sm text-slate-500">
        Loading your board…
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#080a11] px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
          <LayoutGrid size={22} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">No board yet</h1>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Create the first board to start adding pages and cards. Screens will pick it up straight away.
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

  const activePage = config.pages.find((page) => page.id === activePageId) ?? config.pages[0] ?? null;

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
    const source = config.pages.find((page) => page.id === pageId);
    if (!source) return;
    const id = newId('page');
    const copy = structuredClone(source);
    copy.id = id;
    copy.name = `${source.name} copy`;
    copy.cards = copy.cards.map((card) => ({ ...card, id: newId('card') }));
    mutate((draft) => {
      const index = draft.pages.findIndex((page) => page.id === pageId);
      draft.pages.splice(index + 1, 0, copy);
    });
    setActivePageId(id);
  };

  const deletePage = (pageId: string) => {
    if (config.pages.length <= 1) return;
    const page = config.pages.find((item) => item.id === pageId);
    if (!page) return;
    if (!window.confirm(`Delete “${page.name}” and its ${page.cards.length} card${page.cards.length === 1 ? '' : 's'}?`)) return;
    const nextPage = config.pages.find((item) => item.id !== pageId);
    mutate((draft) => {
      draft.pages = draft.pages.filter((item) => item.id !== pageId);
      if (!draft.pages.some((item) => item.id === draft.settings.defaultPageId)) {
        draft.settings.defaultPageId = draft.pages[0]?.id ?? '';
      }
      draft.settings.rotation.pageIds = draft.settings.rotation.pageIds.filter((id) => id !== pageId);
    });
    if (activePageId === pageId) setActivePageId(nextPage?.id ?? null);
  };

  const movePage = (pageId: string, direction: -1 | 1) => {
    mutate((draft) => {
      const index = draft.pages.findIndex((page) => page.id === pageId);
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
      const page = draft.pages.find((item) => item.id === activePage.id);
      if (!page) return;
      page.cards.push({
        id,
        type,
        layout,
        visible: true,
        config: defaultCardConfig(type),
      });
    });
    setSelectedCardId(id);
  };

  const updateLayout = (cardId: string, layout: Rect) => {
    mutate(
      (draft) => {
        const page = draft.pages.find((item) => item.id === activePage?.id);
        const card = page?.cards.find((item) => item.id === cardId);
        if (card) card.layout = layout;
      },
      { history: false },
    );
  };

  const saveLabel =
    saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : saveState === 'saved' ? 'Saved' : 'Ready';

  return (
    <div className="flex min-h-dvh flex-col bg-[#080a11] text-slate-200">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#080a11]/95 px-3 backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
            <LayoutGrid size={16} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight text-white">{config.settings.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Control</div>
          </div>
          {DEMO ? <Badge tone="amber">Demo</Badge> : null}
        </div>

        <nav className="ml-2 hidden flex-1 items-center gap-0.5 md:flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition',
                tab === id ? 'bg-white/[0.08] text-white' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200',
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 sm:flex">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                saveState === 'error' ? 'bg-rose-400' : saveState === 'saving' ? 'bg-amber-300' : 'bg-emerald-400',
              )}
            />
            <span className="text-[11px] text-slate-500">{saveLabel}</span>
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
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.11]"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">View display</span>
          </a>
          <IconButton label="Sign out" onClick={() => void signOut()}>
            <LogOut size={14} />
          </IconButton>
        </div>
      </header>

      <nav className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.06] px-2 py-1.5 md:hidden">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium',
              tab === id ? 'bg-white/[0.08] text-white' : 'text-slate-400',
            )}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="border-b border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">{error}</div>
      ) : null}

      {tab === 'pages' && activePage ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[15rem_minmax(0,1fr)] 2xl:grid-cols-[15rem_minmax(0,1fr)_21rem]">
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
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2 xl:hidden">
              <Select
                className="w-auto min-w-40"
                value={activePage.id}
                onChange={(event) => setActivePageId(event.target.value)}
              >
                {config.pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </Select>
              <Button size="sm" onClick={addPage}>
                <Plus size={13} /> Page
              </Button>
              {activePage.id !== config.settings.defaultPageId ? (
                <Button size="sm" variant="ghost" onClick={() => makeDefault(activePage.id)}>
                  Make start page
                </Button>
              ) : null}
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

          <aside className="hidden min-h-0 overflow-y-auto border-l border-white/[0.06] p-4 2xl:block">
            <Inspector page={activePage} selectedId={selectedCardId} onSelect={setSelectedCardId} />
          </aside>

          <div className="border-t border-white/[0.06] p-4 2xl:hidden">
            <Inspector page={activePage} selectedId={selectedCardId} onSelect={setSelectedCardId} />
          </div>
        </div>
      ) : null}

      {tab === 'theme' ? (
        <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          <ThemePanel />
        </main>
      ) : null}

      {tab === 'screens' ? (
        <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          <ScreensPanel />
        </main>
      ) : null}

      {tab === 'announcements' ? (
        <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          <AnnouncementsPanel />
        </main>
      ) : null}

      {tab === 'settings' ? (
        <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">
          <SettingsPanel />
        </main>
      ) : null}
    </div>
  );
}
