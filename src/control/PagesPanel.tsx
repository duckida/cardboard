import { ChevronDown, ChevronUp, Copy, Plus, Star, Trash2 } from 'lucide-react';
import type { Page } from '@shared/types';
import { IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';

export function PagesPanel({
  pages,
  activePageId,
  defaultPageId,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
  onMakeDefault,
  className,
}: {
  pages: Page[];
  activePageId: string | null;
  defaultPageId: string;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onDuplicatePage: (id: string) => void;
  onDeletePage: (id: string) => void;
  onMovePage: (id: string, direction: -1 | 1) => void;
  onMakeDefault: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2 border-r border-stone-200 bg-stone-50 p-3', className)}>
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-xs font-semibold text-stone-500">Pages</span>
        <button
          type="button"
          onClick={onAddPage}
          className="inline-flex h-7 items-center gap-1 rounded-lg bg-amber-500 px-2.5 text-xs font-medium text-white transition hover:bg-amber-400"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      <div className="space-y-1">
        {pages.map((page, index) => {
          const active = page.id === activePageId;
          const isDefault = page.id === defaultPageId;
          return (
            <div
              key={page.id}
              className={cn(
                'group rounded-xl border px-2 py-2 transition',
                active
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-transparent hover:border-stone-200 hover:bg-white',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectPage(page.id)}
                className="flex w-full items-center gap-2 text-left"
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold',
                    active ? 'bg-amber-200 text-amber-800' : 'bg-stone-200 text-stone-500',
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-800">{page.name}</span>
                  <span className="block text-xs text-stone-400">
                    {page.cards.length} card{page.cards.length === 1 ? '' : 's'}
                    {isDefault ? ' · default' : ''}
                  </span>
                </span>
              </button>

              <div className="mt-1 flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <IconButton label="Move up" disabled={index === 0} onClick={() => onMovePage(page.id, -1)} className="h-6 w-6">
                  <ChevronUp size={12} />
                </IconButton>
                <IconButton label="Move down" disabled={index === pages.length - 1} onClick={() => onMovePage(page.id, 1)} className="h-6 w-6">
                  <ChevronDown size={12} />
                </IconButton>
                <IconButton
                  label="Set as default"
                  onClick={() => onMakeDefault(page.id)}
                  className={cn('h-6 w-6', isDefault && 'text-amber-500')}
                >
                  <Star size={12} />
                </IconButton>
                <IconButton label="Duplicate" onClick={() => onDuplicatePage(page.id)} className="h-6 w-6">
                  <Copy size={12} />
                </IconButton>
                <IconButton
                  label="Delete"
                  disabled={pages.length <= 1}
                  onClick={() => onDeletePage(page.id)}
                  className="h-6 w-6 hover:text-red-500"
                >
                  <Trash2 size={12} />
                </IconButton>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-auto px-1 pt-3 text-xs leading-relaxed text-stone-400">
        The default page shows on screens that aren't assigned to anything specific.
      </p>
    </div>
  );
}
