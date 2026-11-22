import { CARD_LIST } from '@/cards/registry';
import type { CardType } from '@shared/types';

export function Palette({ onAdd }: { onAdd: (type: CardType) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-semibold text-stone-400">Add widget</span>
      {CARD_LIST.map((def) => {
        const Icon = def.icon;
        return (
          <button
            key={def.type}
            type="button"
            onClick={() => onAdd(def.type)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-600 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
            title={def.description}
          >
            <Icon size={13} />
            {def.name}
          </button>
        );
      })}
    </div>
  );
}
