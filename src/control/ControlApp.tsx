import { useEffect, useState } from 'react';
import {
  ExternalLink,
  LayoutGrid,
  Layers,
  LogOut,
  Megaphone,
  MonitorSmartphone,
  Plus,
  Redo2,
  Settings as SettingsIcon,
  Undo2,
} from 'lucide-react';
import { useBoard } from '@/lib/board';
import { useAuth } from '@/lib/auth';
import { DEMO } from '@/lib/store';
import { cn } from '@/lib/cn';
import { Badge, Button, IconButton } from '@/components/ui';
import { FeedbackProvider } from './Feedback';
import { PagesScreen } from './PagesScreen';
import { PageEditor } from './PageEditor';
import { ScreensScreen } from './ScreensScreen';
import { NoticesScreen } from './NoticesScreen';
import { SettingsScreen } from './SettingsScreen';

type Tab = 'pages' | 'screens' | 'notices' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: 'pages', label: 'Pages', icon: Layers },
  { id: 'screens', label: 'Screens', icon: MonitorSmartphone },
  { id: 'notices', label: 'Notices', icon: Megaphone },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

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

function LoadingScreen() {
  return (
    <div className="cb-control flex min-h-dvh items-center justify-center bg-paper">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-accent text-white shadow-lg">
          <LayoutGrid size={24} />
        </div>
        <p className="text-sm font-medium text-muted">Opening your board…</p>
      </div>
    </div>
  );
}

export function ControlApp() {
  return (
    <FeedbackProvider>
      <ControlShell />
    </FeedbackProvider>
  );
}

function ControlShell() {
  const {
    config,
    loading,
    saveState,
    error,
    canUndo,
    canRedo,
    undo,
    redo,
    createBoard,
  } = useBoard();
  const { signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('pages');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  useFontLink(config?.theme.font.url);

  useEffect(() => {
    if (!editingPageId) return;
    const exists = config?.pages?.some((page) => page.id === editingPageId);
    if (!exists && config) setEditingPageId(null);
  }, [config, editingPageId]);

  if (loading) return <LoadingScreen />;

  if (!config) {
    return (
      <div className="cb-control flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-accent">
          <LayoutGrid size={28} />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">Let’s set up your board</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Create the first board and we’ll add a ready-made page you can change.
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => void createBoard()}>
          <Plus size={17} /> Create my board
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          <LogOut size={15} /> Sign out
        </Button>
      </div>
    );
  }

  const editingPage = editingPageId
    ? (config.pages ?? []).find((page) => page.id === editingPageId) ?? null
    : null;

  const showEditor = Boolean(editingPage);
  const activeTab: Tab = showEditor ? 'pages' : tab;

  const openPage = (pageId: string) => {
    setEditingPageId(pageId);
    window.scrollTo({ top: 0 });
  };

  const saveLabel =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'error'
        ? 'Couldn’t save'
        : saveState === 'saved'
          ? 'Saved'
          : '';

  return (
    <div className="cb-control min-h-dvh bg-paper text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1680px]">
        {/* ── Desktop sidebar ─────────────────────────────────────────── */}
        <aside className={cn('sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line/80 px-4 py-6 lg:flex', showEditor && 'lg:hidden')}>
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white shadow-[0_6px_18px_rgba(15,118,110,0.22)]">
              <LayoutGrid size={20} />
            </div>
            <div className="min-w-0">
              <div className="font-display truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-ink">
                {config.settings.name || 'Cardboard'}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
                Control panel {DEMO ? <Badge tone="amber">Demo</Badge> : null}
              </div>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setEditingPageId(null);
                  window.scrollTo({ top: 0 });
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition',
                  activeTab === id
                    ? 'bg-accent-soft text-accent'
                    : 'text-muted hover:bg-[#efece4] hover:text-ink',
                )}
              >
                <Icon size={19} strokeWidth={activeTab === id ? 2.2 : 1.8} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-3 text-sm font-semibold text-ink transition hover:border-[#d6d0c2] hover:bg-[#fbfaf7]"
            >
              <MonitorSmartphone size={18} className="text-accent" />
              <span className="min-w-0 flex-1">Open display</span>
              <ExternalLink size={14} className="text-muted" />
            </a>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-medium text-muted transition hover:bg-[#efece4] hover:text-ink"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* ── Top bar ────────────────────────────────────────────────── */}
          <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur-md">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <div className={cn('flex min-w-0 items-center gap-2.5', showEditor ? '' : 'lg:hidden')}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white">
                  <LayoutGrid size={17} />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-sm font-semibold leading-tight text-ink">
                    {config.settings.name || 'Cardboard'}
                  </div>
                  <div className="text-[10px] font-medium text-muted">Control panel</div>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                {saveLabel ? (
                  <div
                    className={cn(
                      'hidden items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:flex',
                      saveState === 'error' ? 'text-danger' : 'text-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        saveState === 'error'
                          ? 'bg-danger'
                          : saveState === 'saving'
                            ? 'animate-pulse bg-amber-500'
                            : 'bg-emerald-500',
                      )}
                    />
                    {saveLabel}
                  </div>
                ) : null}

                <div className="flex items-center rounded-xl border border-line bg-white p-0.5 shadow-sm">
                  <IconButton label="Undo" onClick={undo} disabled={!canUndo} className="h-8 w-8 rounded-lg">
                    <Undo2 size={15} />
                  </IconButton>
                  <IconButton label="Redo" onClick={redo} disabled={!canRedo} className="h-8 w-8 rounded-lg">
                    <Redo2 size={15} />
                  </IconButton>
                </div>

                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-ink shadow-sm transition hover:border-[#d6d0c2] hover:bg-[#fbfaf7] lg:hidden"
                >
                  <ExternalLink size={14} className="text-accent" />
                  <span className="hidden sm:inline">Open display</span>
                </a>

                {DEMO ? <Badge tone="amber" className="hidden sm:inline-flex lg:hidden">Demo</Badge> : null}
              </div>
            </div>
            {error ? (
              <div className="border-t border-[#efd5ce] bg-[#fdf3f0] px-4 py-2 text-[13px] font-medium text-danger sm:px-6 lg:px-8">
                {error}
              </div>
            ) : null}
          </header>

          <main className={cn('min-w-0 flex-1', showEditor ? '' : 'px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8')}>
            {showEditor && editingPage ? (
              <PageEditor
                pageId={editingPage.id}
                onBack={() => setEditingPageId(null)}
                onOpenPage={openPage}
                onOpenSettings={() => {
                  setEditingPageId(null);
                  setTab('settings');
                }}
              />
            ) : (
              <>
                {tab === 'pages' ? (
                  <PagesScreen
                    onOpenPage={openPage}
                    onOpenSettings={() => setTab('settings')}
                  />
                ) : null}
                {tab === 'screens' ? <ScreensScreen /> : null}
                {tab === 'notices' ? <NoticesScreen /> : null}
                {tab === 'settings' ? <SettingsScreen /> : null}
              </>
            )}
          </main>

          {/* ── Mobile tab bar ─────────────────────────────────────────── */}
          <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
            <div className="grid grid-cols-4">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id);
                    setEditingPageId(null);
                    window.scrollTo({ top: 0 });
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition',
                    activeTab === id ? 'text-accent' : 'text-muted',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-12 items-center justify-center rounded-xl transition',
                      activeTab === id ? 'bg-accent-soft' : '',
                    )}
                  >
                    <Icon size={19} strokeWidth={activeTab === id ? 2.2 : 1.8} />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
