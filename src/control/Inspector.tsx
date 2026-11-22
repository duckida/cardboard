import { Copy, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { Card, Page, Rect } from '@shared/types';
import { clampRect } from '@shared/layout';
import { newId } from '@shared/ids';
import { CARD_DEFS } from '@/cards/registry';
import { useBoard } from '@/lib/board';
import { Button, Field, Input, Select, Section, Toggle } from '@/components/ui';
import { FieldControl, Slider } from './FieldControl';
import { BackgroundEditor } from './BackgroundEditor';

export function Inspector({
  page,
  selectedId,
  onSelect,
}: {
  page: Page;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { config, mutate } = useBoard();
  const card = page.cards.find((c) => c.id === selectedId) ?? null;
  const def = card ? CARD_DEFS[card.type] : null;
  const theme = config!.theme;

  const updatePage = (fn: (page: Page) => void) => {
    mutate((draft) => {
      const target = draft.pages.find((p) => p.id === page.id);
      if (target) fn(target);
    });
  };

  const updateCard = (fn: (card: Card) => void) => {
    if (!card) return;
    updatePage((target) => {
      const item = target.cards.find((c) => c.id === card.id);
      if (item) fn(item);
    });
  };

  const duplicate = () => {
    if (!card) return;
    const copy: Card = {
      ...structuredClone(card),
      id: newId('card'),
      layout: clampRect({ ...card.layout, x: card.layout.x + 1, y: card.layout.y + 1 }),
    };
    updatePage((target) => target.cards.push(copy));
    onSelect(copy.id);
  };

  const remove = () => {
    if (!card) return;
    if (!window.confirm(`Delete the ${def?.name ?? 'widget'}?`)) return;
    updatePage((target) => {
      target.cards = target.cards.filter((c) => c.id !== card.id);
    });
    onSelect(null);
  };

  return (
    <div className="space-y-3">
      {card && def ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-base font-semibold text-stone-900">{def.name}</div>
              <div className="text-xs text-stone-500">{def.description}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => updateCard((c) => { c.visible = !c.visible; })} title={card.visible ? 'Hide' : 'Show'}>
                {card.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </Button>
              <Button size="sm" variant="ghost" onClick={duplicate} title="Duplicate">
                <Copy size={14} />
              </Button>
              <Button size="sm" variant="ghost" onClick={remove} title="Delete" className="hover:text-red-500">
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          <Section title="Content">
            {def.fields.map((field) => (
              <FieldControl
                key={field.key}
                field={field}
                value={card.config[field.key]}
                onChange={(value) => updateCard((c) => { c.config[field.key] = value; })}
              />
            ))}
          </Section>

          <Section title="Position" description="Where this widget sits on the 24×24 grid.">
            <div className="grid grid-cols-4 gap-2">
              {(['x', 'y', 'w', 'h'] as const).map((key) => (
                <label key={key} className="space-y-1">
                  <span className="block text-xs font-semibold text-stone-500 uppercase">{key === 'w' ? 'Width' : key === 'h' ? 'Height' : key === 'x' ? 'Left' : 'Top'}</span>
                  <Input
                    type="number"
                    min={key === 'w' || key === 'h' ? 1 : 0}
                    max={23}
                    value={card.layout[key]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const next: Rect = { ...card.layout, [key]: v };
                      updateCard((c) => { c.layout = clampRect(next, theme.grid.cols, theme.grid.rows); });
                    }}
                  />
                </label>
              ))}
            </div>
          </Section>
        </>
      ) : (
        <>
          <div className="text-base font-semibold text-stone-900">Page settings</div>
          <p className="text-xs text-stone-500">Click a widget on the canvas to edit it, or change the page settings below.</p>

          <Section title="Page">
            <Field label="Page name">
              <Input value={page.name} onChange={(e) => updatePage((p) => { p.name = e.target.value; })} />
            </Field>
            <Field label="Transition">
              <Select
                value={page.transition}
                onChange={(e) => updatePage((p) => { p.transition = e.target.value as Page['transition']; })}
              >
                <option value="fade">Fade</option>
                <option value="slide">Slide in</option>
                <option value="none">Instant</option>
              </Select>
            </Field>
          </Section>

          <Section
            title="Background"
            description={page.background ? 'This page has its own background.' : 'Using the board-wide background.'}
            actions={
              page.background ? (
                <Button size="sm" variant="ghost" onClick={() => updatePage((p) => { p.background = undefined; })}>
                  Remove override
                </Button>
              ) : (
                <Button size="sm" onClick={() => updatePage((p) => { p.background = structuredClone(theme.background); })}>
                  Override
                </Button>
              )
            }
          >
            {page.background ? (
              <BackgroundEditor
                value={page.background}
                onChange={(next) => updatePage((p) => { p.background = next; })}
              />
            ) : (
              <p className="text-sm text-stone-400">
                Go to the Theme tab to change the board-wide background, or click Override to set one just for this page.
              </p>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
