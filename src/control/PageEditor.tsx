import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Copy,
  ImagePlus,
  Loader2,
  Maximize2,
  Palette,
  Play,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { Card, CardType, Page, Rect } from '@shared/types';
import { defaultCardConfig } from '@shared/schemas';
import { newId } from '@shared/ids';
import { clampRect, findFreeSpot, gridMetrics } from '@shared/layout';
import { CARD_DEFS } from '@/cards/registry';
import { Background } from '@/display/Background';
import { DisplayContext } from '@/display/DisplayContext';
import { useBoard } from '@/lib/board';
import { pageTheme, themeVars } from '@/lib/theme';
import { cn } from '@/lib/cn';
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
} from '@/components/ui';
import { AddContentModal } from './AddContent';
import { BackgroundFields } from './BackgroundFields';
import { CardSettings } from './CardSettings';
import { EditorCanvas } from './EditorCanvas';
import { useFeedback } from './Feedback';
import { MenuButton, MenuDivider, MenuItem } from './Menu';
import { PageStage } from './PageStage';
import {
  cardLabel,
  isMediaCard,
  syncRotationPages,
  useImageUploader,
} from './common';

type CardDraftOptions = {
  layout?: Rect;
  fullscreen?: boolean;
  config?: Record<string, unknown>;
};

function isDesktopViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
}

function inside(rect: DOMRect | undefined, x: number, y: number) {
  return Boolean(rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
}

export function PageEditor({
  pageId,
  onBack,
  onOpenPage,
  onOpenSettings,
}: {
  pageId: string;
  onBack: () => void;
  onOpenPage: (pageId: string) => void;
  onOpenSettings: () => void;
}) {
  const { config, mutate, beginHistory } = useBoard();
  const { confirm, toast } = useFeedback();
  const { upload, busy: uploading } = useImageUploader();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [dragCard, setDragCard] = useState<Card | null>(null);
  const [overFullscreen, setOverFullscreen] = useState(false);
  const [filesOver, setFilesOver] = useState(false);
  const [isDesktop, setIsDesktop] = useState(isDesktopViewport);
  const [nameDraft, setNameDraft] = useState('');

  const stageRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ card: Card; over: boolean } | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const page = config?.pages?.find((item) => item.id === pageId) ?? null;

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    if (page) setNameDraft(page.name);
  }, [page?.id]);

  useEffect(() => {
    setSelectedId(null);
  }, [pageId]);

  useEffect(() => {
    if (selectedId && page && !page.cards.some((card) => card.id === selectedId)) {
      setSelectedId(null);
    }
  }, [page, selectedId]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setStageSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!previewOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [previewOpen]);

  if (!config || !page) return null;

  const theme = pageTheme(config.theme, page);
  const background = page.background ?? theme.background;
  const selected = selectedId ? page.cards.find((card) => card.id === selectedId) ?? null : null;
  const fullscreenCard = selected?.fullscreen ? selected : page.cards.find((card) => card.fullscreen) ?? null;
  const pad = Math.max(6, Math.min(22, stageSize.width * 0.014));
  const rotation = config.settings.rotation;

  const updatePage = (fn: (page: Page) => void, history = true) => {
    mutate(
      (draft) => {
        const target = draft.pages.find((item) => item.id === page.id);
        if (target) fn(target);
      },
      { history },
    );
  };

  const updateCard = (id: string, fn: (card: Card) => void, history = true) => {
    updatePage(
      (target) => {
        const card = target.cards.find((item) => item.id === id);
        if (card) fn(card);
      },
      history,
    );
  };

  const addCard = (type: CardType, options: CardDraftOptions = {}) => {
    const def = CARD_DEFS[type];
    const layout =
      options.layout ??
      findFreeSpot(
        page.cards,
        def.defaultSize.w,
        def.defaultSize.h,
        config.theme.grid.cols,
        config.theme.grid.rows,
      );
    const id = newId('card');
    updatePage((target) => {
      target.cards.push({
        id,
        type,
        layout,
        visible: true,
        fullscreen: options.fullscreen,
        config: { ...defaultCardConfig(type), ...(options.config ?? {}) },
      });
    });
    setSelectedId(id);
  };

  const duplicateCard = (card: Card) => {
    const copy: Card = {
      ...structuredClone(card),
      id: newId('card'),
      layout: clampRect({
        ...card.layout,
        x: card.layout.x + 1,
        y: card.layout.y + 1,
      }),
    };
    updatePage((target) => target.cards.push(copy));
    setSelectedId(copy.id);
    toast('Item duplicated.', 'success');
  };

  const removeCard = async (card: Card) => {
    const ok = await confirm({
      title: `Remove “${cardLabel(card)}”?`,
      body: 'It will disappear from this page. You can undo this.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    updatePage((target) => {
      target.cards = target.cards.filter((item) => item.id !== card.id);
    });
    setSelectedId(null);
  };

  const setFullscreen = (id: string, fullscreen: boolean, history = true) => {
    updateCard(
      id,
      (card) => {
        card.fullscreen = fullscreen;
      },
      history,
    );
    if (fullscreen) toast('Item is now filling the whole screen.', 'success');
  };

  const setLayout = (id: string, layout: Rect) => {
    updateCard(
      id,
      (card) => {
        card.layout = clampRect(layout, config.theme.grid.cols, config.theme.grid.rows);
      },
      false,
    );
  };

  const handleCardDragStart = (card: Card) => {
    if (!isMediaCard(card)) return;
    dragRef.current = { card, over: false };
    setDragCard(card);
  };

  const handleCardDragMove = (x: number, y: number) => {
    if (!dragRef.current) return;
    const over = inside(fullscreenRef.current?.getBoundingClientRect(), x, y);
    dragRef.current.over = over;
    setOverFullscreen(over);
  };

  const handleCardDragEnd = () => {
    const current = dragRef.current;
    dragRef.current = null;
    setDragCard(null);
    setFilesOver(false);
    setOverFullscreen(false);
    if (current?.over && !current.card.fullscreen) {
      setFullscreen(current.card.id, true, false);
    }
  };

  const layoutFromPoint = (clientX: number, clientY: number, type: CardType): Rect => {
    const rect = innerRef.current?.getBoundingClientRect();
    const def = CARD_DEFS[type];
    if (!rect) return findFreeSpot(page.cards, def.defaultSize.w, def.defaultSize.h);
    const metrics = gridMetrics(
      rect.width,
      rect.height,
      theme.gap,
      theme.grid.cols,
      theme.grid.rows,
    );
    const cellW = metrics.colW + metrics.gap;
    const cellH = metrics.rowH + metrics.gap;
    const w = Math.min(def.defaultSize.w, metrics.cols);
    const h = Math.min(def.defaultSize.h, metrics.rows);
    const x = Math.floor((clientX - rect.left) / Math.max(1, cellW)) - Math.floor(w / 2);
    const y = Math.floor((clientY - rect.top) / Math.max(1, cellH)) - Math.floor(h / 2);
    return clampRect({ x, y, w, h }, metrics.cols, metrics.rows);
  };

  const handleFiles = async (
    files: File[],
    fullscreen: boolean,
    point?: { x: number; y: number },
  ) => {
    const assets = await upload(files);
    if (!assets.length) return;

    if (assets.length === 1) {
      const asset = assets[0];
      addCard('image', {
        fullscreen,
        layout: fullscreen ? undefined : point ? layoutFromPoint(point.x, point.y, 'image') : undefined,
        config: { url: asset.url, caption: asset.caption ?? '' },
      });
    } else {
      addCard('photo', {
        fullscreen,
        config: {
          images: assets.map((asset) => ({ url: asset.url, caption: asset.caption ?? '' })),
        },
      });
    }
    toast(`${assets.length} photo${assets.length === 1 ? '' : 's'} added.`, 'success');
  };

  const duplicatePage = () => {
    const copy = structuredClone(page);
    copy.id = newId('page');
    copy.name = `${page.name} copy`;
    copy.cards = copy.cards.map((card) => ({ ...card, id: newId('card') }));
    mutate((draft) => {
      const index = draft.pages.findIndex((item) => item.id === page.id);
      draft.pages.splice(index + 1, 0, copy);
      syncRotationPages(draft);
    });
    toast('Page duplicated.', 'success');
    onOpenPage(copy.id);
  };

  const removePage = async () => {
    if (config.pages.length <= 1) return;
    const ok = await confirm({
      title: `Delete “${page.name}”?`,
      body: 'This page and everything on it will be removed. You can undo this.',
      confirmLabel: 'Delete page',
      destructive: true,
    });
    if (!ok) return;
    mutate((draft) => {
      draft.pages = draft.pages.filter((item) => item.id !== page.id);
      syncRotationPages(draft);
      if (!draft.pages.some((item) => item.id === draft.settings.defaultPageId)) {
        draft.settings.defaultPageId = draft.pages[0]?.id ?? '';
      }
    });
    onBack();
  };

  const markStart = () => {
    mutate((draft) => {
      draft.settings.defaultPageId = page.id;
    });
    toast('This is now the start page.', 'success');
  };

  const rename = () => {
    const name = nameDraft.trim();
    if (!name) {
      setNameDraft(page.name);
      return;
    }
    if (name !== page.name) {
      updatePage((target) => {
        target.name = name;
      });
    }
  };

  const setPageSeconds = (raw: string) => {
    updatePage((target) => {
      target.rotationSec = raw === '' ? undefined : Math.max(5, Math.min(3600, Number(raw)));
    });
  };

  const pageCardPanel = (
    <PageDetails
      page={page}
      config={config}
      onRename={rename}
      nameDraft={nameDraft}
      onNameDraft={setNameDraft}
      onMarkStart={markStart}
      onSetSeconds={setPageSeconds}
      onBackground={() => setBackgroundOpen(true)}
      onAddContent={() => setAddOpen(true)}
      onSelectCard={setSelectedId}
      onDuplicatePage={duplicatePage}
      onDeletePage={() => void removePage()}
      canDelete={config.pages.length > 1}
    />
  );

  return (
    <div className="pb-28 lg:pb-8">
      {/* ── Editor toolbar ─────────────────────────────────────────────── */}
      <div className="border-b border-line/70 bg-paper/80">
        <div className="mx-auto flex w-full max-w-[1500px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <Button size="sm" variant="ghost" onClick={onBack} className="-ml-2">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">All pages</span>
          </Button>
          <div className="hidden h-6 w-px bg-line sm:block" />
          <input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={rename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            aria-label="Page name"
            className="min-w-0 max-w-[360px] flex-1 basis-40 rounded-lg border border-transparent bg-transparent px-1.5 py-1 font-display text-lg font-semibold tracking-[-0.02em] text-ink outline-none transition hover:border-line focus:border-accent/40 focus:bg-white focus:ring-4 focus:ring-accent/10"
          />
          {page.id === config.settings.defaultPageId ? (
            <Badge tone="accent" className="hidden sm:inline-flex">
              <Star size={10} className="fill-current" /> Start page
            </Badge>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPreviewOpen(true)}>
              <Play size={14} />
              <span className="hidden sm:inline">Preview</span>
            </Button>
            <Button size="sm" variant="primary" onClick={() => setAddOpen(true)}>
              <Plus size={15} />
              <span className="hidden sm:inline">Add content</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <MenuButton label="Page options">
              <MenuItem icon={<Play size={15} />} onSelect={() => setPreviewOpen(true)}>
                Preview full screen
              </MenuItem>
              <MenuItem icon={<Star size={15} />} onSelect={markStart} disabled={page.id === config.settings.defaultPageId}>
                Make start page
              </MenuItem>
              <MenuItem icon={<Copy size={15} />} onSelect={duplicatePage}>
                Duplicate page
              </MenuItem>
              <MenuItem icon={<Palette size={15} />} onSelect={() => setBackgroundOpen(true)}>
                Page background
              </MenuItem>
              <MenuDivider />
              <MenuItem icon={<Trash2 size={15} />} danger onSelect={() => void removePage()} disabled={config.pages.length <= 1}>
                Delete page
              </MenuItem>
            </MenuButton>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:px-8">
        {/* ── Canvas ───────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <div
            ref={stageRef}
            className="relative w-full overflow-hidden rounded-[26px] border border-black/10 bg-black shadow-[0_20px_60px_rgba(32,37,31,0.16)]"
            style={{ ...themeVars(theme, false), aspectRatio: '16 / 9' }}
            onDragOver={(event) => {
              if (!Array.from(event.dataTransfer.types).includes('Files')) return;
              event.preventDefault();
              setFilesOver(true);
              setOverFullscreen(inside(fullscreenRef.current?.getBoundingClientRect(), event.clientX, event.clientY));
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setFilesOver(false);
                setOverFullscreen(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const files = Array.from(event.dataTransfer.files ?? []);
              const fullscreen = inside(fullscreenRef.current?.getBoundingClientRect(), event.clientX, event.clientY);
              setFilesOver(false);
              setOverFullscreen(false);
              if (files.length) void handleFiles(files, fullscreen, { x: event.clientX, y: event.clientY });
            }}
          >
            <div className="pointer-events-none absolute inset-0">
              <Background background={background} lite={false} />
            </div>

            <div className="absolute inset-0" style={{ padding: pad }}>
              <div
                ref={innerRef}
                className="relative h-full w-full"
                style={{ '--cb-page-pad': `${pad}px` } as CSSProperties}
              >
                <DisplayContext.Provider value={{ theme, lite: false, editing: true, pageId: page.id }}>
                  <EditorCanvas
                    page={page}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onLayoutChange={setLayout}
                    onBeginHistory={beginHistory}
                    onSetFullscreen={setFullscreen}
                    onCardDragStart={handleCardDragStart}
                    onCardDragMove={handleCardDragMove}
                    onCardDragEnd={handleCardDragEnd}
                    onAddContent={() => setAddOpen(true)}
                  />
                </DisplayContext.Provider>
              </div>
            </div>

            {dragCard && isMediaCard(dragCard) ? (
              <div className="pointer-events-none absolute inset-0 z-50">
                <div className="absolute inset-2 rounded-[22px] border-2 border-dashed border-white/35 bg-black/20" />
              </div>
            ) : null}

            {filesOver ? (
              <div className="pointer-events-none absolute inset-0 z-50">
                <div className="absolute inset-2 rounded-[22px] border-2 border-dashed border-white/65 bg-black/35" />
                <div className="absolute inset-x-6 bottom-8 text-center">
                  <div className="mx-auto inline-flex items-center gap-2 rounded-2xl bg-black/55 px-4 py-2.5 text-[13px] font-medium text-white backdrop-blur">
                    <ImagePlus size={16} /> Drop photos to add them to this page
                  </div>
                </div>
              </div>
            ) : null}

            {/* A generous target for “make this fill the screen”. It stays mounted so
                drop detection works on the very first dragover event. */}
            <div
              ref={fullscreenRef}
              data-cb-dropzone
              className={cn(
                'pointer-events-none absolute left-1/2 top-3 z-50 flex h-[92px] w-[min(600px,88%)] -translate-x-1/2 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed px-4 text-center transition-all duration-150',
                overFullscreen
                  ? 'scale-[1.02] border-accent bg-accent text-white shadow-xl'
                  : 'border-white/70 bg-black/45 text-white backdrop-blur-sm',
                dragCard || filesOver ? 'opacity-100' : 'opacity-0',
              )}
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold">
                <Maximize2 size={17} />
                {overFullscreen ? 'Release to fill the whole screen' : 'Drop here to fill the whole screen'}
              </span>
              <span className="text-[11px] font-medium text-white/70">
                A photo or video can cover the page behind everything else.
              </span>
            </div>

            {!dragCard && !filesOver && fullscreenCard && !selected?.fullscreen ? (
              <div className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 text-[12px] font-semibold text-ink shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur">
                <Maximize2 size={14} className="text-accent" />
                Filling the whole screen
                <button
                  type="button"
                  onClick={() => setFullscreen(fullscreenCard.id, false)}
                  className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#0b655c]"
                >
                  Put back on the page
                </button>
              </div>
            ) : null}

            {uploading ? (
              <div className="absolute right-3 top-3 z-50 inline-flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-[12px] font-semibold text-white backdrop-blur">
                <Loader2 size={14} className="animate-spin" /> Adding photos…
              </div>
            ) : null}
          </div>

          {/* Hints + mobile item strip */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-[12px] leading-relaxed text-muted">
              Drag items to move them. Pull a corner to resize. Double-click a photo or video to fill the screen.
            </p>
            <p className="text-[12px] text-muted">Changes save by themselves.</p>
          </div>

          {page.cards.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {page.cards.map((card) => {
                const def = CARD_DEFS[card.type];
                const Icon = def?.icon;
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedId(card.id)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition',
                      selectedId === card.id
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line bg-white text-muted',
                    )}
                  >
                    {Icon ? <Icon size={13} /> : null}
                    <span className="max-w-28 truncate">{cardLabel(card)}</span>
                    {!card.visible ? <span className="text-[10px]">(hidden)</span> : null}
                    {card.fullscreen ? <Maximize2 size={11} /> : null}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-line bg-white px-3 py-2 text-[12px] font-semibold text-muted"
              >
                <Plus size={13} /> Add
              </button>
            </div>
          ) : null}
        </div>

        {/* ── Desktop side panel ───────────────────────────────────────── */}
        <aside className="hidden w-[380px] shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7.5rem)] overflow-y-auto rounded-3xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(32,37,31,0.04)]">
            {selected ? (
              <CardSettings
                card={selected}
                onUpdate={(fn) => {
                  if (selected) updateCard(selected.id, fn);
                }}
                onDuplicate={() => duplicateCard(selected)}
                onDelete={() => void removeCard(selected)}
                onOpenSettings={onOpenSettings}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              pageCardPanel
            )}
          </div>
        </aside>
      </div>

      {/* ── Mobile card settings drawer ───────────────────────────────── */}
      <Drawer
        open={Boolean(selected) && !isDesktop}
        onClose={() => setSelectedId(null)}
        title={selected ? CARD_DEFS[selected.type]?.name ?? 'Item settings' : 'Item settings'}
        description="Changes save by themselves."
      >
        {selected ? (
          <CardSettings
            card={selected}
            onUpdate={(fn) => {
              if (selected) updateCard(selected.id, fn);
            }}
            onDuplicate={() => duplicateCard(selected)}
            onDelete={() => {
              setSelectedId(null);
              void removeCard(selected);
            }}
            onOpenSettings={onOpenSettings}
          />
        ) : null}
      </Drawer>

      <AddContentModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={(type) => addCard(type)} />

      <Modal
        open={backgroundOpen}
        onClose={() => setBackgroundOpen(false)}
        title="Page background"
        description="This changes the background of this page only."
      >
        <div className="space-y-4">
          <BackgroundFields
            value={page.background ?? theme.background}
            onChange={(next) =>
              updatePage((target) => {
                target.background = next;
              })
            }
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              updatePage((target) => {
                target.background = undefined;
              });
            }}
            disabled={!page.background}
          >
            Use the board background
          </Button>
        </div>
      </Modal>

      {previewOpen
        ? createPortal(
            <div className="cb-control fixed inset-0 z-[150] flex flex-col bg-[#0c0f0d]">
              <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                    Preview · {page.name}
                  </div>
                  <div className="text-[13px] text-white/65">Screens show this page exactly like this.</div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreviewOpen(false)}
                  className="border-white/15 bg-white/10 text-white hover:bg-white/15"
                >
                  <X size={15} /> Close preview
                </Button>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
                <div className="w-full max-w-[1500px]">
                  <PageStage page={page} rounded="rounded-2xl" padding="2.4%" />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function PageDetails({
  page,
  config,
  nameDraft,
  onNameDraft,
  onRename,
  onMarkStart,
  onSetSeconds,
  onBackground,
  onAddContent,
  onSelectCard,
  onDuplicatePage,
  onDeletePage,
  canDelete,
}: {
  page: Page;
  config: NonNullable<ReturnType<typeof useBoard>['config']>;
  nameDraft: string;
  onNameDraft: (value: string) => void;
  onRename: () => void;
  onMarkStart: () => void;
  onSetSeconds: (value: string) => void;
  onBackground: () => void;
  onAddContent: () => void;
  onSelectCard: (id: string) => void;
  onDuplicatePage: () => void;
  onDeletePage: () => void;
  canDelete: boolean;
}) {
  const isStart = page.id === config.settings.defaultPageId;
  const defaultSeconds = config.settings.rotation.intervalSec;
  const intervals = Array.from(new Set([10, 15, 20, 30, 45, 60, 120, page.rotationSec].filter(Boolean))) as number[];

  return (
    <div className="space-y-6 pb-1">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">This page</h2>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
          Pick an item on the screen to change it, or add something new.
        </p>
      </div>

      <Field label="Page name">
        <Input
          value={nameDraft}
          onChange={(event) => onNameDraft(event.target.value)}
          onBlur={onRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          maxLength={60}
        />
      </Field>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-[#faf8f3] p-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">Start page</div>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">
            {isStart ? 'Screens show this when pages are not looping.' : 'The first page screens show.'}
          </p>
        </div>
        {isStart ? (
          <Badge tone="accent">
            <Star size={10} className="fill-current" /> Start
          </Badge>
        ) : (
          <Button size="sm" variant="secondary" onClick={onMarkStart}>
            Make start
          </Button>
        )}
      </div>

      <Field label="Time on screen" help="Only matters when pages are looping. Leave on default unless this page needs longer.">
        <Select value={page.rotationSec ? String(page.rotationSec) : ''} onChange={(event) => onSetSeconds(event.target.value)}>
          <option value="">Default ({defaultSeconds} seconds)</option>
          {intervals.map((seconds) => (
            <option key={seconds} value={seconds}>
              {seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minute${seconds === 60 ? '' : 's'}`}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-[#faf8f3] p-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-ink">Background</div>
          <p className="mt-0.5 text-[12px] text-muted">
            {page.background ? 'This page has its own background.' : 'Using the board background.'}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onBackground}>
          <Palette size={13} /> Change
        </Button>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">On this page</div>
          <span className="text-[11px] text-muted">{page.cards.length}</span>
        </div>
        {page.cards.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            body="Add a clock, photos or a message."
            className="px-4 py-7"
            action={
              <Button size="sm" variant="primary" onClick={onAddContent}>
                <Plus size={14} /> Add content
              </Button>
            }
          />
        ) : (
          <div className="space-y-1">
            {page.cards.map((card) => {
              const def = CARD_DEFS[card.type];
              const Icon = def?.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelectCard(card.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-[#f4f1ea]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f4f1ea] text-muted">
                    {Icon ? <Icon size={14} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{cardLabel(card)}</span>
                  </span>
                  {!card.visible ? <Badge>Hidden</Badge> : null}
                  {card.fullscreen ? <Maximize2 size={12} className="text-muted" /> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" onClick={onAddContent}>
          <Plus size={14} /> Add content
        </Button>
        <Button size="sm" variant="secondary" onClick={onDuplicatePage}>
          <Copy size={14} /> Duplicate
        </Button>
      </div>

      <button
        type="button"
        onClick={onDeletePage}
        disabled={!canDelete}
        className="inline-flex items-center gap-2 text-[12px] font-semibold text-danger transition hover:opacity-80 disabled:pointer-events-none disabled:opacity-40"
      >
        <Trash2 size={13} /> Delete this page
      </button>
    </div>
  );
}
