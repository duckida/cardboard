import { useRef, useState } from 'react';
import { ArrowRight, GripVertical, Plus, Star } from 'lucide-react';
import type { Page } from '@shared/types';
import { useBoard } from '@/lib/board';
import { cn } from '@/lib/cn';
import { Button, Input, Section, Toggle } from '@/components/ui';
import { Slider } from './FieldControl';

/**
 * The Pages tab: order the pages, pick which ones rotate and for how long.
 * Pages are grouped into "Displaying now" and "Not shown"; dragging a page's
 * handle reorders it or moves it between the groups. Clicking a page opens it
 * in the Layout editor. Page management (rename, duplicate, delete, default)
 * lives in the Layout editor.
 */
export function PagesOverviewPanel({
  onOpenPage,
  onAddPage,
}: {
  onOpenPage: (id: string) => void;
  onAddPage: () => void;
}) {
  const { config, mutate } = useBoard();
  const dragId = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ shown: boolean; index: number } | null>(null);

  if (!config) return null;
  const { pages, settings } = config;
  const rotation = settings.rotation;
  const inRotation = new Set(rotation.pageIds);
  const shownPages = pages.filter((p) => inRotation.has(p.id));
  const hiddenPages = pages.filter((p) => !inRotation.has(p.id));

  const endDrag = () => {
    dragId.current = null;
    setDropTarget(null);
  };

  /**
   * Move a page to `memberIndex` within one of the two groups, adding it to or
   * removing it from the rotation when the group changes. Board order stays
   * the single source of truth: pageIds is rewritten from the new page order.
   */
  const movePage = (id: string, toShown: boolean, memberIndex: number) => {
    mutate((draft) => {
      const dragged = draft.pages.find((p) => p.id === id);
      if (!dragged) return;
      const included = new Set(draft.settings.rotation.pageIds);

      // memberIndex counts the dragged row while it is still in the list, so
      // moving down within the same group shifts the target by one.
      let index = memberIndex;
      if (included.has(id) === toShown) {
        const oldIndex = draft.pages
          .filter((p) => included.has(p.id) === toShown)
          .findIndex((p) => p.id === id);
        if (oldIndex >= 0 && oldIndex < memberIndex) index -= 1;
      }

      if (toShown) included.add(id);
      else included.delete(id);

      const rest = draft.pages.filter((p) => p.id !== id);
      const members = rest.filter((p) => included.has(p.id) === toShown);
      const anchor = members[index];
      const insertAt = anchor
        ? rest.indexOf(anchor)
        : members.length > 0
          ? rest.indexOf(members[members.length - 1]) + 1
          : toShown
            ? 0
            : rest.length;
      rest.splice(insertAt, 0, dragged);
      draft.pages = rest;
      draft.settings.rotation.pageIds = rest.filter((p) => included.has(p.id)).map((p) => p.id);
    });
  };

  const setPageSeconds = (pageId: string, raw: string) => {
    mutate((draft) => {
      const page = draft.pages.find((p) => p.id === pageId);
      if (!page) return;
      page.rotationSec =
        raw.trim() === '' ? undefined : Math.min(3600, Math.max(5, Math.round(Number(raw) || 0)));
    });
  };

  /** Insert before the row, or after it when the pointer is in its bottom half. */
  const rowDropIndex = (e: React.DragEvent, memberIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientY > rect.top + rect.height / 2 ? memberIndex + 1 : memberIndex;
  };

  const renderRow = (page: Page, shown: boolean, memberIndex: number) => (
    <div key={page.id} className="relative">
      {dropTarget?.shown === shown && dropTarget.index === memberIndex ? (
        <div className="absolute -top-1 left-1 right-1 z-10 h-0.5 rounded-full bg-amber-400" />
      ) : null}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDropTarget({ shown, index: rowDropIndex(e, memberIndex) });
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (dragId.current) movePage(dragId.current, shown, rowDropIndex(e, memberIndex));
          endDrag();
        }}
        className={cn(
          'flex items-center gap-2 rounded-xl border p-2 shadow-sm transition',
          shown ? 'border-stone-200 bg-white' : 'border-stone-200 bg-stone-50',
        )}
      >
        <div
          draggable
          onDragStart={(e) => {
            dragId.current = page.id;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', page.id);
          }}
          onDragEnd={endDrag}
          className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-400 transition hover:border-amber-300 hover:text-amber-600 active:cursor-grabbing"
          title="Drag to reorder, or into the other group to show or hide the page"
        >
          <GripVertical size={13} />
        </div>

        <button
          type="button"
          onClick={() => onOpenPage(page.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1 py-1 text-left transition hover:text-amber-700"
          title={`Edit the layout of ${page.name}`}
        >
          <span
            className={cn(
              'truncate text-sm font-medium',
              shown ? 'text-stone-800' : 'text-stone-500',
            )}
          >
            {page.name}
          </span>
          {page.id === settings.defaultPageId ? (
            <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" aria-label="Default page" />
          ) : null}
        </button>

        <div
          className="flex shrink-0 items-center gap-1"
          title="Seconds on screen (blank uses the default time)"
        >
          <Input
            type="number"
            min={5}
            max={3600}
            step={5}
            value={page.rotationSec ?? ''}
            placeholder={String(rotation.intervalSec)}
            onChange={(e) => setPageSeconds(page.id, e.target.value)}
            className="h-8 w-14 border-transparent bg-transparent px-1 text-right text-sm shadow-none hover:border-stone-200"
            aria-label={`Seconds ${page.name} stays on screen`}
          />
          <span className="text-xs text-stone-400">s</span>
        </div>

        <button
          type="button"
          onClick={() => onOpenPage(page.id)}
          aria-label={`Edit the layout of ${page.name}`}
          title={`Edit the layout of ${page.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-amber-50 hover:text-amber-600"
        >
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );

  const renderGroup = (label: string, list: Page[], shown: boolean, hint: string) => (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDropTarget({ shown, index: list.length });
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTarget(null);
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (dragId.current) movePage(dragId.current, shown, list.length);
        endDrag();
      }}
      className="space-y-1.5 pb-1"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</h4>
      {list.map((page, i) => renderRow(page, shown, i))}
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 px-3 py-4 text-center text-xs text-stone-400">
          {hint}
        </div>
      ) : null}
      {list.length > 0 && dropTarget?.shown === shown && dropTarget.index === list.length ? (
        <div className="h-0.5 rounded-full bg-amber-400" />
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5 pb-10">
      {/* ── Rotation ────────────────────────────────────────────────────── */}
      <Section
        title="Rotation"
        description="Screens that aren't assigned to a specific page cycle through the pages below."
      >
        <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3">
          <div>
            <div className="text-sm font-semibold text-stone-800">Rotate pages automatically</div>
            <div className="text-xs text-stone-500">
              {rotation.enabled
                ? 'Pages rotate in the order listed below.'
                : 'Off — screens show the default page.'}
            </div>
          </div>
          <Toggle
            checked={rotation.enabled}
            onChange={(v) => mutate((draft) => { draft.settings.rotation.enabled = v; })}
            label="Enable rotation"
          />
        </div>

        {rotation.enabled ? (
          <Slider
            label="Default time per page"
            value={rotation.intervalSec}
            min={5}
            max={300}
            step={5}
            onChange={(v) => mutate((draft) => { draft.settings.rotation.intervalSec = v; })}
            suffix=" seconds"
          />
        ) : null}
      </Section>

      {/* ── Pages ───────────────────────────────────────────────────────── */}
      <Section
        title="Pages"
        description="Drag the handles to reorder pages or move them between groups. Click a page to edit its layout."
        actions={
          <Button size="sm" variant="primary" onClick={onAddPage} className="shrink-0 whitespace-nowrap">
            <Plus size={13} /> Add page
          </Button>
        }
      >
        {!rotation.enabled ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Rotation is off, so screens show only the default page. The groups below take effect
            when you turn rotation on.
          </div>
        ) : null}

        {renderGroup('Displaying now', shownPages, true, 'Drag pages here to show them')}
        <div className="border-t border-stone-200" />
        {renderGroup('Not shown', hiddenPages, false, 'Drag pages here to stop showing them')}

        <p className="text-xs leading-relaxed text-stone-400">
          The default page (starred) shows on screens that aren't assigned to anything specific,
          and whenever rotation is off.
        </p>
      </Section>
    </div>
  );
}
