import { Copy, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { Card, Page, Rect } from '@shared/types';
import { clampRect } from '@shared/layout';
import { newId } from '@shared/ids';
import { CARD_DEFS } from '@/cards/registry';
import { useBoard } from '@/lib/board';
import { Button, Field, Input, Section, Select, Toggle } from '@/components/ui';
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
  const card = page.cards.find((item) => item.id === selectedId) ?? null;
  const def = card ? CARD_DEFS[card.type] : null;
  const theme = config!.theme;

  const updatePage = (fn: (page: Page) => void) => {
    mutate((draft) => {
      const target = draft.pages.find((item) => item.id === page.id);
      if (target) fn(target);
    });
  };

  const updateCard = (fn: (card: Card) => void) => {
    if (!card) return;
    updatePage((target) => {
      const item = target.cards.find((entry) => entry.id === card.id);
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
    updatePage((target) => {
      target.cards.push(copy);
    });
    onSelect(copy.id);
  };

  const remove = () => {
    if (!card) return;
    if (!window.confirm(`Delete the ${def?.name ?? 'card'}?`)) return;
    updatePage((target) => {
      target.cards = target.cards.filter((entry) => entry.id !== card.id);
    });
    onSelect(null);
  };

  return (
    <div className="space-y-3">
      {card && def ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-100">{def.name}</div>
              <div className="text-[11px] text-slate-500">{def.description}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateCard((item) => (item.visible = !item.visible))}
                title={card.visible ? 'Hide card' : 'Show card'}
              >
                {card.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </Button>
              <Button size="sm" variant="ghost" onClick={duplicate} title="Duplicate">
                <Copy size={14} />
              </Button>
              <Button size="sm" variant="ghost" onClick={remove} title="Delete" className="hover:text-rose-300">
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
                onChange={(value) => updateCard((item) => (item.config[field.key] = value))}
              />
            ))}
          </Section>

          <Section title="Layout" description="Grid units on a 24 × 24 board.">
            <div className="grid grid-cols-4 gap-2">
              {(['x', 'y', 'w', 'h'] as const).map((key) => (
                <label key={key} className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">{key}</span>
                  <Input
                    type="number"
                    min={key === 'w' || key === 'h' ? 1 : 0}
                    max={23}
                    value={card.layout[key]}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      const next: Rect = { ...card.layout, [key]: value };
                      updateCard((item) => (item.layout = clampRect(next, theme.grid.cols, theme.grid.rows)));
                    }}
                  />
                </label>
              ))}
            </div>
          </Section>

          <Section title="Style">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-slate-300">Background</div>
                <div className="text-[11px] text-slate-500">Leave empty to use the theme surface.</div>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={card.style?.background ?? theme.colors.surface}
                  onChange={(event) =>
                    updateCard((item) => {
                      item.style = { ...item.style, background: event.target.value };
                    })
                  }
                  className="h-8 w-9 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                />
                {card.style?.background ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      updateCard((item) => {
                        item.style = { ...item.style, background: undefined };
                      })
                    }
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>

            <Slider
              label="Opacity"
              value={Math.round((card.style?.opacity ?? theme.card.opacity) * 100)}
              min={5}
              max={100}
              onChange={(value) => updateCard((item) => (item.style = { ...item.style, opacity: value / 100 }))}
              suffix="%"
            />
            <Slider
              label="Blur"
              value={card.style?.blur ?? theme.card.blur}
              min={0}
              max={40}
              onChange={(value) => updateCard((item) => (item.style = { ...item.style, blur: value }))}
              suffix="px"
            />
            <Slider
              label="Padding"
              value={card.style?.padding ?? Math.round(theme.gap * 1.1)}
              min={0}
              max={64}
              onChange={(value) => updateCard((item) => (item.style = { ...item.style, padding: value }))}
              suffix="px"
            />
             <div>
               <Slider
                 label="Radius"
                 value={card.style?.radius ?? theme.radius}
                 min={0}
                 max={64}
                 onChange={(value) => updateCard((item) => (item.style = { ...item.style, radius: value }))}
                 suffix="px"
               />
               {card.style?.radius !== undefined ? (
                 <Button size="sm" variant="ghost" onClick={() => updateCard((item) => (item.style = { ...item.style, radius: undefined }))}>
                   Use theme radius
                 </Button>
               ) : null}
             </div>
            <Slider
              label="Text scale"
              value={Math.round((card.style?.textScale ?? 1) * 100)}
              min={60}
              max={200}
              step={5}
              onChange={(value) => updateCard((item) => (item.style = { ...item.style, textScale: value / 100 }))}
              suffix="%"
            />
            <Field label="Align">
              <Select
                value={card.style?.align ?? 'left'}
                onChange={(event) =>
                  updateCard((item) => {
                    item.style = { ...item.style, align: event.target.value as 'left' | 'center' | 'right' };
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </Select>
            </Field>
             <div className="flex items-center justify-between gap-3">
               <div className="text-xs font-medium text-slate-300">Border</div>
               <div className="flex items-center gap-2">
                 <Toggle
                   checked={card.style?.border ?? theme.card.border}
                   onChange={(value) => updateCard((item) => (item.style = { ...item.style, border: value }))}
                   label="Border"
                 />
                 {card.style?.border !== undefined ? (
                   <Button size="sm" variant="ghost" onClick={() => updateCard((item) => (item.style = { ...item.style, border: undefined }))}>
                     Theme
                   </Button>
                 ) : null}
               </div>
             </div>
          </Section>
        </>
      ) : (
        <>
          <div>
            <div className="text-sm font-semibold text-slate-100">Page</div>
            <div className="text-[11px] text-slate-500">Select a card to edit it, or tune the page.</div>
          </div>

          <Section title="Page">
            <Field label="Name">
              <Input
                value={page.name}
                onChange={(event) => updatePage((target) => (target.name = event.target.value))}
              />
            </Field>
            <Field label="Transition">
              <Select
                value={page.transition}
                onChange={(event) =>
                  updatePage((target) => (target.transition = event.target.value as Page['transition']))
                }
              >
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="none">None</option>
              </Select>
            </Field>
          </Section>

          <Section
            title="Background"
            description={page.background ? 'This page overrides the board background.' : 'Using the board background.'}
            actions={
              page.background ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updatePage((target) => {
                      target.background = undefined;
                    })
                  }
                >
                  Reset
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    updatePage((target) => {
                      target.background = structuredClone(theme.background);
                    })
                  }
                >
                  Override
                </Button>
              )
            }
          >
            {page.background ? (
              <BackgroundEditor
                value={page.background}
                onChange={(next) => updatePage((target) => (target.background = next))}
              />
            ) : (
              <p className="text-xs text-slate-500">
                Solid, gradient, or a photo. Image backgrounds are dimmed and blurred behind the cards.
              </p>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
