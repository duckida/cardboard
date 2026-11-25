import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  GripVertical,
  Layers,
  MonitorPlay,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import type { Page } from '@shared/types';
import { newId } from '@shared/ids';
import { useBoard } from '@/lib/board';
import { cn } from '@/lib/cn';
import { Button, EmptyState, Input, Panel, SectionHeading, Toggle } from '@/components/ui';
import { useFeedback } from './Feedback';
import { MenuButton, MenuDivider, MenuItem } from './Menu';
import { PageStage } from './PageStage';
import { syncRotationPages } from './common';

const INTERVALS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
];

export function PagesScreen({
  onOpenPage,
  onOpenSettings,
}: {
  onOpenPage: (pageId: string) => void;
  onOpenSettings: () => void;
}) {
  const { config, mutate } = useBoard();
  const { confirm, toast } = useFeedback();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameCancelled = useRef(false);

  if (!config) return null;

  const pages = config.pages ?? [];
  const rotation = config.settings.rotation;
  const hasCalendar = Boolean(config.settings.calendar.url.trim());

  const addPage = () => {
    const id = newId('page');
    const name = pages.length === 0 ? 'Home' : `Page ${pages.length + 1}`;
    mutate((draft) => {
      draft.pages.push({ id, name, transition: 'fade', cards: [] });
      syncRotationPages(draft);
    });
    onOpenPage(id);
  };

  const reorder = (id: string, insertAt: number) => {
    mutate((draft) => {
      const from = draft.pages.findIndex((page) => page.id === id);
      if (from < 0) return;
      let target = insertAt;
      if (from < target) target -= 1;
      target = Math.max(0, Math.min(draft.pages.length - 1, target));
      if (target === from) return;
      const [page] = draft.pages.splice(from, 1);
      draft.pages.splice(target, 0, page);
      syncRotationPages(draft);
    });
  };

  const move = (id: string, direction: -1 | 1) => {
    const index = pages.findIndex((page) => page.id === id);
    if (index < 0) return;
    reorder(id, direction === -1 ? index - 1 : index + 2);
  };

  const duplicate = (page: Page) => {
    const copy = structuredClone(page);
    copy.id = newId('page');
    copy.name = `${page.name} copy`;
    copy.cards = copy.cards.map((card) => ({ ...card, id: newId('card') }));
    mutate((draft) => {
      const index = draft.pages.findIndex((item) => item.id === page.id);
      draft.pages.splice(index + 1, 0, copy);
      syncRotationPages(draft);
    });
    toast(`“${page.name}” was duplicated.`, 'success');
  };

  const removePage = async (page: Page) => {
    if (pages.length <= 1) return;
    const ok = await confirm({
      title: `Delete “${page.name}”?`,
      body:
        page.cards.length > 0
          ? `This removes the page and its ${page.cards.length} item${page.cards.length === 1 ? '' : 's'}. You can undo this.`
          : 'This page is empty. You can undo this.',
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
    toast('Page deleted.', 'success');
  };

  const openRename = (page: Page) => {
    renameCancelled.current = false;
    setRenameId(page.id);
    setRenameValue(page.name);
  };

  const saveRename = () => {
    if (renameCancelled.current) {
      renameCancelled.current = false;
      return;
    }
    const name = renameValue.trim();
    if (!renameId) return;
    setRenameId(null);
    if (!name) return;
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === renameId);
      if (page) page.name = name;
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <SectionHeading
        title="Your pages"
        description="A page is one screenful of information. Open a page to change what’s on it, or add another page and let screens take turns."
        action={
          <Button variant="primary" onClick={addPage}>
            <Plus size={16} /> Add a page
          </Button>
        }
      />

      <Panel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">Play pages in a loop</div>
              <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-muted">
                {rotation.enabled
                  ? `Screens move through your pages in order, changing every ${INTERVALS.find((item) => item.value === rotation.intervalSec)?.label ?? `${rotation.intervalSec}s`}.`
                  : `Off — screens stay on your start page${pages.length > 1 ? '. Turn this on to show every page.' : '.'}`}
              </p>
            </div>
          </div>
          <Toggle
            checked={rotation.enabled}
            onChange={(enabled) =>
              mutate((draft) => {
                draft.settings.rotation.enabled = enabled;
                syncRotationPages(draft);
              })
            }
            label="Play pages in a loop"
          />
        </div>

        {rotation.enabled ? (
          <div className="mt-5 border-t border-line pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px] font-semibold text-ink">Change page every</div>
              <div className="flex flex-wrap gap-1.5">
                {INTERVALS.map((option) => {
                  const active = rotation.intervalSec === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        mutate((draft) => {
                          draft.settings.rotation.intervalSec = option.value;
                        })
                      }
                      className={cn(
                        'inline-flex h-9 min-w-14 items-center justify-center gap-1 rounded-xl border px-3 text-[13px] font-semibold transition',
                        active
                          ? 'border-accent bg-accent text-white'
                          : 'border-line bg-white text-muted hover:border-[#d6d0c2] hover:text-ink',
                      )}
                    >
                      {active ? <Check size={13} /> : null}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {pages.length < 2 ? (
              <p className="mt-3 text-[12px] text-muted">Add a second page and screens will start taking turns.</p>
            ) : null}
          </div>
        ) : null}
      </Panel>

      {pages.length === 0 ? (
        <EmptyState
          icon={<Layers size={28} />}
          title="No pages yet"
          body="Add your first page, then put a clock, photos or your school calendar on it."
          action={
            <Button variant="primary" onClick={addPage}>
              <Plus size={16} /> Add a page
            </Button>
          }
        />
      ) : (
        <div>
          {dragId ? (
            <p className="mb-3 text-[13px] font-medium text-accent">Drop a page where you want it in the order.</p>
          ) : (
            <p className="mb-3 text-[12px] text-muted">Drag the grip to change the order. Screens follow this order when looping.</p>
          )}

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {pages.map((page, index) => {
              const isStart = page.id === config.settings.defaultPageId;
              const showLine = dropIndex === index;
              const showEndLine = dropIndex === pages.length && index === pages.length - 1;
              return (
                <div key={page.id} className="relative">
                  {showLine ? <div className="absolute -left-2.5 bottom-2 top-2 w-1 rounded-full bg-accent" /> : null}
                  <article
                    onDragOver={(event) => {
                      if (!dragId) return;
                      event.preventDefault();
                      const rect = event.currentTarget.getBoundingClientRect();
                      setDropIndex(event.clientX > rect.left + rect.width / 2 ? index + 1 : index);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragId && dropIndex != null) reorder(dragId, dropIndex);
                      setDragId(null);
                      setDropIndex(null);
                    }}
                    className={cn(
                      'group relative rounded-3xl border bg-white shadow-[0_1px_2px_rgba(32,37,31,0.04)] transition',
                      dragId === page.id ? 'border-accent/40 opacity-60' : 'border-line hover:border-[#d6d0c2]',
                      dropIndex === index && 'border-accent/40',
                    )}
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => onOpenPage(page.id)}
                        className="block w-full text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
                        aria-label={`Edit ${page.name}`}
                      >
                        <PageStage page={page} rounded="rounded-t-3xl" />
                      </button>

                      <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-black/55 px-2 text-[11px] font-semibold text-white backdrop-blur">
                          {index + 1}
                        </span>
                        {isStart ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink shadow-sm">
                            <Star size={10} className="fill-amber-400 text-amber-400" /> Start
                          </span>
                        ) : null}
                      </div>

                      <div
                        className="absolute right-2.5 top-2.5 rounded-xl bg-white/95 shadow-sm backdrop-blur"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MenuButton label={`Options for ${page.name}`}>
                          <MenuItem icon={<Pencil size={15} />} onSelect={() => openRename(page)}>
                            Rename
                          </MenuItem>
                          <MenuItem icon={<Copy size={15} />} onSelect={() => duplicate(page)}>
                            Duplicate
                          </MenuItem>
                          <MenuItem
                            icon={<Star size={15} />}
                            onSelect={() => {
                              mutate((draft) => {
                                draft.settings.defaultPageId = page.id;
                              });
                              toast(`“${page.name}” is now the start page.`, 'success');
                            }}
                            disabled={isStart}
                          >
                            {isStart ? 'This is the start page' : 'Make start page'}
                          </MenuItem>
                          <MenuDivider />
                          <MenuItem
                            icon={<ArrowLeft size={15} />}
                            onSelect={() => move(page.id, -1)}
                            disabled={index === 0}
                          >
                            Move earlier
                          </MenuItem>
                          <MenuItem
                            icon={<ArrowRight size={15} />}
                            onSelect={() => move(page.id, 1)}
                            disabled={index === pages.length - 1}
                          >
                            Move later
                          </MenuItem>
                          <MenuDivider />
                          <MenuItem
                            icon={<Trash2 size={15} />}
                            danger
                            onSelect={() => void removePage(page)}
                            disabled={pages.length <= 1}
                          >
                            Delete page
                          </MenuItem>
                        </MenuButton>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4">
                      {renameId === page.id ? (
                        <Input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onBlur={saveRename}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.currentTarget.blur();
                            } else if (event.key === 'Escape') {
                              renameCancelled.current = true;
                              setRenameId(null);
                            }
                          }}
                          autoFocus
                          maxLength={60}
                          aria-label="Page name"
                          className="h-9 min-w-0 flex-1"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenPage(page.id)}
                          className="min-w-0 flex-1 text-left focus-visible:outline-none"
                        >
                          <div className="truncate text-sm font-semibold text-ink">{page.name}</div>
                          <div className="mt-0.5 text-[12px] text-muted">
                            {page.cards.length === 0
                              ? 'Empty page'
                              : `${page.cards.length} item${page.cards.length === 1 ? '' : 's'}`}
                            {page.rotationSec ? ` · stays ${page.rotationSec}s` : ''}
                          </div>
                        </button>
                      )}

                      <Button size="sm" variant="secondary" onClick={() => onOpenPage(page.id)}>
                        Edit
                      </Button>

                      <button
                        type="button"
                        draggable
                        aria-label={`Drag ${page.name} to reorder`}
                        title="Drag to reorder"
                        onDragStart={(event) => {
                          setDragId(page.id);
                          setDropIndex(index);
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', page.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropIndex(null);
                        }}
                        className="flex h-8 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted transition hover:bg-[#f1eee7] hover:text-ink active:cursor-grabbing"
                      >
                        <GripVertical size={15} />
                      </button>
                    </div>
                  </article>
                  {showEndLine ? (
                    <div className="absolute -bottom-3 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-accent" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasCalendar ? (
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fdf8ea] text-[#8a6516]">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">Connect your school calendar</div>
              <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-muted">
                Add your SOCS calendar link once and timetable cards will fill in automatically.
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={onOpenSettings}>
            Open settings
          </Button>
        </Panel>
      ) : null}

      <div className="hidden items-center gap-2 text-[12px] text-muted sm:flex">
        <MonitorPlay size={15} />
        Changes appear on screens within a few seconds.
      </div>
    </div>
  );
}
