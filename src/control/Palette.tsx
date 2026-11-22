import { CARD_LIST } from '@/cards/registry';
import type { CardType } from '@shared/types';

export function Palette({ onAdd }: { onAdd: (type: CardType) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">Add</span>
      {CARD_LIST.map((def) => {
        const Icon = def.icon;
        return (
          <button
            key={def.type}
            type="button"
            onClick={() => onAdd(def.type)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-white"
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
