import { useRef, useState } from 'react';
import { Copy, GripVertical, LayoutGrid, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useBoard } from '@/lib/board';
import { cn } from '@/lib/cn';
import { Button, IconButton, Input, Section, Toggle } from '@/components/ui';
import { Slider } from './FieldControl';

/**
 * The Pages tab: order the pages, pick which ones rotate and for how long.
 * Clicking a page opens it in the Layout editor.
 */
export function PagesOverviewPanel({
  onOpenPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMakeDefault,
}: {
  onOpenPage: (id: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onMakeDefault: (id: string) => void;
}) {
  const { config, mutate } = useBoard();
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  if (!config) return null;
  const { pages, settings } = config;
  const rotation = settings.rotation;
  const inRotation = new Set(rotation.pageIds);

  const reorderPages = (from: number, to: number) => {
    if (from === to) return;
    mutate((draft) => {
      const [moved] = draft.pages.splice(from, 1);
      draft.pages.splice(to, 0, moved);
    });
  };

  const toggleInRotation = (pageId: string) => {
    mutate((draft) => {
      const included = new Set(draft.settings.rotation.pageIds);
      if (included.has(pageId)) included.delete(pageId);
      else included.add(pageId);
      // Membership is a set; the display cycles included pages in board order.
      draft.settings.rotation.pageIds = draft.pages.filter((p) => included.has(p.id)).map((p) => p.id);
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

  return (
    <div className="space-y-5 pb-10">
      {/* ── Rotation ────────────────────────────────────────────────────── */}
      <Section
        title="Rotation"
        description="Screens that aren't assigned to a specific page cycle through the pages switched on below."
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
        description="Drag to reorder. Click a page to edit its layout."
        actions={
          <Button size="sm" variant="primary" onClick={onAddPage} className="shrink-0 whitespace-nowrap">
            <Plus size={13} /> Add page
          </Button>
        }
      >
        <div className="space-y-1.5">
          {pages.map((page, index) => {
            const isDefault = page.id === settings.defaultPageId;
            const rotating = inRotation.has(page.id);
            return (
              <div
                key={page.id}
                draggable
                onDragStart={() => { dragIndex.current = index; }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(index); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => {
                  if (dragIndex.current !== null) reorderPages(dragIndex.current, index);
                  dragIndex.current = null;
                  setDragOver(null);
                }}
                onDragEnd={() => { dragIndex.current = null; setDragOver(null); }}
                className={cn(
                  'flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border bg-white p-2.5 shadow-sm transition',
                  dragOver === index ? 'border-amber-400 shadow-md' : 'border-stone-200',
                )}
              >
                <GripVertical size={15} className="shrink-0 cursor-grab text-stone-300" />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-xs font-semibold text-amber-700">
                  {index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => onOpenPage(page.id)}
                  className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-stone-50"
                  title={`Edit the layout of ${page.name}`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-stone-800 group-hover:text-amber-700">
                        {page.name}
                      </span>
                      <Pencil size={11} className="shrink-0 text-stone-300 transition group-hover:text-amber-500" />
                    </span>
                    <span className="block text-xs text-stone-400">
                      {page.cards.length} card{page.cards.length === 1 ? '' : 's'}
                      {isDefault ? ' · default' : ''}
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1.5" title="Include this page in the rotation">
                  <span className="hidden text-xs text-stone-400 sm:inline">Rotate</span>
                  <Toggle
                    checked={rotating}
                    onChange={() => toggleInRotation(page.id)}
                    label={`Include ${page.name} in the rotation`}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1" title="Seconds on screen (blank uses the default time)">
                  <Input
                    type="number"
                    min={5}
                    max={3600}
                    step={5}
                    value={page.rotationSec ?? ''}
                    placeholder={String(rotation.intervalSec)}
                    onChange={(e) => setPageSeconds(page.id, e.target.value)}
                    className="h-8 w-[4.5rem] px-2 text-xs"
                    aria-label={`Seconds ${page.name} stays on screen`}
                  />
                  <span className="text-xs text-stone-400">s</span>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <IconButton
                    label="Set as default"
                    onClick={() => onMakeDefault(page.id)}
                    className={cn('h-7 w-7', isDefault && 'text-amber-500')}
                  >
                    <Star size={13} />
                  </IconButton>
                  <IconButton label="Edit layout" onClick={() => onOpenPage(page.id)} className="h-7 w-7">
                    <LayoutGrid size={13} />
                  </IconButton>
                  <IconButton label="Duplicate" onClick={() => onDuplicatePage(page.id)} className="h-7 w-7">
                    <Copy size={13} />
                  </IconButton>
                  <IconButton
                    label="Delete"
                    disabled={pages.length <= 1}
                    onClick={() => onDeletePage(page.id)}
                    className="h-7 w-7 hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-stone-400">
          The default page shows on screens that aren't assigned to anything specific, and whenever rotation is off.
        </p>
      </Section>
    </div>
  );
}
