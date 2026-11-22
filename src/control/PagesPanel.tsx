import { Copy, Plus, Star, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Page } from '@shared/types';
import { IconButton, Label } from '@/components/ui';
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
    <div className={cn('flex flex-col gap-2 border-r border-white/[0.06] bg-black/20 p-3', className)}>
      <div className="flex items-center justify-between px-1">
        <Label>Pages</Label>
        <IconButton label="Add page" onClick={onAddPage}>
          <Plus size={14} />
        </IconButton>
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
                  ? 'border-indigo-400/30 bg-indigo-500/10'
                  : 'border-transparent hover:border-white/10 hover:bg-white/[0.04]',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectPage(page.id)}
                className="flex w-full items-center gap-2 text-left"
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold',
                    active ? 'bg-indigo-500/25 text-indigo-200' : 'bg-white/[0.06] text-slate-400',
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-slate-200">{page.name}</span>
                  <span className="block text-[10px] text-slate-500">
                    {page.cards.length} card{page.cards.length === 1 ? '' : 's'}
                    {isDefault ? ' · start' : ''}
                  </span>
                </span>
              </button>

              <div className="mt-1 flex items-center justify-end gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                <IconButton label="Move up" disabled={index === 0} onClick={() => onMovePage(page.id, -1)} className="h-6 w-6">
                  <ChevronUp size={12} />
                </IconButton>
                <IconButton
                  label="Move down"
                  disabled={index === pages.length - 1}
                  onClick={() => onMovePage(page.id, 1)}
                  className="h-6 w-6"
                >
                  <ChevronDown size={12} />
                </IconButton>
                <IconButton
                  label="Make start page"
                  onClick={() => onMakeDefault(page.id)}
                  className={cn('h-6 w-6', isDefault && 'text-amber-300')}
                >
                  <Star size={12} />
                </IconButton>
                <IconButton label="Duplicate page" onClick={() => onDuplicatePage(page.id)} className="h-6 w-6">
                  <Copy size={12} />
                </IconButton>
                <IconButton
                  label="Delete page"
                  disabled={pages.length <= 1}
                  onClick={() => onDeletePage(page.id)}
                  className="h-6 w-6 hover:text-rose-300"
                >
                  <Trash2 size={12} />
                </IconButton>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-auto px-1 pt-3 text-[10px] leading-relaxed text-slate-600">
        The start page shows when nothing else is assigned. Rotation can cycle through any pages you pick.
      </p>
    </div>
  );
}
