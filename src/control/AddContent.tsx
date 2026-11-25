import type { CardType } from '@shared/types';
import { CARD_DEFS } from '@/cards/registry';
import { Modal } from '@/components/ui';
import { CARD_TITLES } from './common';

const GROUPS: { title: string; types: CardType[] }[] = [
  { title: 'Photos & video', types: ['photo', 'image', 'video'] },
  { title: 'Everyday information', types: ['clock', 'weather', 'schedule', 'sports', 'countdown', 'quote'] },
  { title: 'Your own content', types: ['markdown', 'iframe'] },
];

const DESCRIPTIONS: Record<CardType, string> = {
  photo: 'A set of photos that take turns.',
  image: 'A single picture, with an optional caption.',
  video: 'A short video that plays on a loop.',
  clock: 'The time and date.',
  weather: 'Today and the next few days.',
  schedule: 'Events from your school calendar.',
  sports: 'Fixtures, teams and venues from a sports calendar link.',
  countdown: 'Days until something important.',
  quote: 'A thought for the day.',
  markdown: 'A heading and some words.',
  iframe: 'Show another website on the screen.',
};

export function AddContentModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (type: CardType) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to this page"
      description="Choose what you would like to show. You can move it and change it afterwards."
      size="lg"
    >
      <div className="space-y-6 pb-1">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{group.title}</div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {group.types.map((type) => {
                const def = CARD_DEFS[type];
                const Icon = def.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      onAdd(type);
                      onClose();
                    }}
                    className="group flex items-start gap-3.5 rounded-2xl border border-line bg-white p-3.5 text-left transition hover:border-accent/40 hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-white">
                      <Icon size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{CARD_TITLES[type]}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-muted">{DESCRIPTIONS[type]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
