import type { CSSProperties } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { Background, Theme } from '@shared/types';
import { DEFAULT_THEME, FONT_STACKS, THEME_PRESETS } from '@shared/defaults';
import { mergeTheme } from '@shared/normalize';
import { useBoard } from '@/lib/board';
import { Button, Field, Input, Section, Select, Toggle } from '@/components/ui';
import { Slider } from './FieldControl';
import { BackgroundEditor } from './BackgroundEditor';
import { cn } from '@/lib/cn';

const COLOR_KEYS: { key: keyof Theme['colors']; label: string }[] = [
  { key: 'bg', label: 'Background' },
  { key: 'surface', label: 'Card surface' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted text' },
  { key: 'accent', label: 'Accent' },
  { key: 'border', label: 'Border' },
];

function backgroundCss(background: Background): string {
  if (background.type === 'solid') return background.color;
  if (background.type === 'gradient') return `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})`;
  return background.url
    ? `linear-gradient(rgba(0,0,0,${background.dim}), rgba(0,0,0,${background.dim})), url(${background.url}) center / cover`
    : '#111';
}

function customFontName(stack: string): string {
  const first = stack.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
  return Object.values(FONT_STACKS).includes(stack) ? '' : first;
}

function googleFontUrl(names: string[]): string | undefined {
  const families = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (!families.length) return undefined;
  return `https://fonts.googleapis.com/css2?${families
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}`)
    .join('&')}&display=swap`;
}

export function ThemePanel() {
  const { config, mutate } = useBoard();
  if (!config) return null;
  const theme = config.theme;

  const setTheme = (fn: (theme: Theme) => void) => {
    mutate((draft) => {
      fn(draft.theme);
    });
  };

  const applyPreset = (name: string) => {
    const preset = THEME_PRESETS[name] ?? {};
    const next = mergeTheme(DEFAULT_THEME, preset);
    setTheme((draft) => {
      Object.assign(draft, next);
    });
  };

  const fontOptions = Object.entries(FONT_STACKS);
  const hasDisplayFont = fontOptions.some(([, stack]) => stack === theme.font.display);
  const hasBodyFont = fontOptions.some(([, stack]) => stack === theme.font.body);
  const displayCustomName = customFontName(theme.font.display);
  const bodyCustomName = customFontName(theme.font.body);

  const setGoogleFont = (role: 'display' | 'body', name: string) => {
    const clean = name.trim();
    setTheme((draft) => {
      draft.font[role] = clean ? `'${clean}', sans-serif` : FONT_STACKS[role === 'display' ? 'Space Grotesk' : 'Inter'];
      const nextDisplay = role === 'display' ? clean : customFontName(draft.font.display);
      const nextBody = role === 'body' ? clean : customFontName(draft.font.body);
      draft.font.url = googleFontUrl([nextDisplay, nextBody]);
    });
  };

  return (
    <div className="space-y-4">
      <Section
        title="Presets"
        description="A starting point. Every colour and size below can still be changed."
        actions={
          <Button size="sm" variant="ghost" onClick={() => setTheme((draft) => Object.assign(draft, structuredClone(DEFAULT_THEME)))}>
            <RotateCcw size={13} /> Reset
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(THEME_PRESETS).map(([name, preset]) => {
            const preview = mergeTheme(DEFAULT_THEME, preset);
            const active =
              preview.colors.accent === theme.colors.accent &&
              preview.colors.bg === theme.colors.bg &&
              preview.font.display === theme.font.display;
            return (
              <button
                key={name}
                type="button"
                onClick={() => applyPreset(name)}
                className={cn(
                  'group relative overflow-hidden rounded-xl border p-2 text-left transition',
                  active ? 'border-indigo-400/50' : 'border-white/10 hover:border-white/20',
                )}
              >
                <div
                  className="flex h-16 flex-col justify-between rounded-lg p-2"
                  style={{ background: backgroundCss(preview.background) } as CSSProperties}
                >
                  <div className="h-2 w-10 rounded-full" style={{ background: preview.colors.text, opacity: 0.85 }} />
                  <div className="flex items-end gap-1">
                    <div
                      className="h-6 flex-1 rounded"
                      style={{ background: preview.colors.surface, opacity: preview.card.opacity, borderRadius: preview.radius / 3 }}
                    />
                    <div className="h-4 w-4 rounded-full" style={{ background: preview.colors.accent }} />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">{name}</span>
                  {active ? <Check size={12} className="text-indigo-300" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Colours">
        <div className="grid gap-2 sm:grid-cols-2">
          {COLOR_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-2">
              <input
                type="color"
                value={theme.colors[key]}
                onChange={(event) => setTheme((draft) => (draft.colors[key] = event.target.value))}
                className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-white/10 bg-transparent p-0.5"
                aria-label={label}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
                <input
                  value={theme.colors[key]}
                  onChange={(event) => setTheme((draft) => (draft.colors[key] = event.target.value))}
                  className="w-full bg-transparent text-xs text-slate-200 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <Field label="Display font">
          <Select
            value={hasDisplayFont ? theme.font.display : '__custom'}
            onChange={(event) => {
              if (event.target.value !== '__custom') setTheme((draft) => (draft.font.display = event.target.value));
            }}
          >
            {!hasDisplayFont ? <option value="__custom">Custom</option> : null}
            {fontOptions.map(([name, stack]) => (
              <option key={name} value={stack}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Body font">
          <Select
            value={hasBodyFont ? theme.font.body : '__custom'}
            onChange={(event) => {
              if (event.target.value !== '__custom') setTheme((draft) => (draft.font.body = event.target.value));
            }}
          >
            {!hasBodyFont ? <option value="__custom">Custom</option> : null}
            {fontOptions.map(([name, stack]) => (
              <option key={name} value={stack}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Custom display Google font" help="Type the exact font name from fonts.google.com, for example Manrope or Roboto Slab.">
            <Input
              value={displayCustomName}
              placeholder="e.g. Manrope"
              onChange={(event) => setGoogleFont('display', event.target.value)}
            />
          </Field>
          <Field label="Custom body Google font" help="Leave blank to use the selected body font.">
            <Input
              value={bodyCustomName}
              placeholder="e.g. DM Sans"
              onChange={(event) => setGoogleFont('body', event.target.value)}
            />
          </Field>
        </div>
        <Field label="Custom font stylesheet" help="Optional. A Google Fonts or .woff2 CSS URL loaded on every screen.">
          <Input
            value={theme.font.url ?? ''}
            placeholder="https://fonts.googleapis.com/css2?family=…"
            onChange={(event) => setTheme((draft) => (draft.font.url = event.target.value || undefined))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Slider
            label="Text scale"
            value={Math.round(theme.font.scale * 100)}
            min={70}
            max={160}
            step={5}
            onChange={(value) => setTheme((draft) => (draft.font.scale = value / 100))}
            suffix="%"
          />
          <Slider
            label="Heading weight"
            value={theme.font.weight}
            min={300}
            max={900}
            step={50}
            onChange={(value) => setTheme((draft) => (draft.font.weight = value))}
          />
        </div>
      </Section>

      <Section title="Cards">
        <div className="grid grid-cols-2 gap-3">
          <Slider
            label="Corner radius"
            value={theme.radius}
            min={0}
            max={48}
            onChange={(value) => setTheme((draft) => (draft.radius = value))}
            suffix="px"
          />
          <Slider
            label="Grid gap"
            value={theme.gap}
            min={0}
            max={48}
            onChange={(value) => setTheme((draft) => (draft.gap = value))}
            suffix="px"
          />
        </div>
        <Slider
          label="Card opacity"
          value={Math.round(theme.card.opacity * 100)}
          min={0}
          max={100}
          onChange={(value) => setTheme((draft) => (draft.card.opacity = value / 100))}
          suffix="%"
        />
        <Slider
          label="Card blur"
          value={theme.card.blur}
          min={0}
          max={40}
          onChange={(value) => setTheme((draft) => (draft.card.blur = value))}
          suffix="px"
        />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Shadow">
            <Select
              value={theme.shadow}
              onChange={(event) => setTheme((draft) => (draft.shadow = event.target.value as Theme['shadow']))}
            >
              <option value="none">None</option>
              <option value="soft">Soft</option>
              <option value="strong">Strong</option>
            </Select>
          </Field>
          <div className="flex items-end justify-between gap-2 rounded-lg border border-white/[0.06] px-3 py-2">
            <span className="text-xs text-slate-300">Card border</span>
            <Toggle
              checked={theme.card.border}
              onChange={(value) => setTheme((draft) => (draft.card.border = value))}
              label="Card border"
            />
          </div>
        </div>
      </Section>

      <Section title="Background">
        <BackgroundEditor
          value={theme.background}
          onChange={(next) => setTheme((draft) => (draft.background = next))}
        />
      </Section>

      <Section title="Motion">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-300">Animations</div>
            <div className="text-[11px] text-slate-500">Page transitions and gentle motion. Turn off for very old screens.</div>
          </div>
          <Toggle
            checked={theme.animations.enabled}
            onChange={(value) => setTheme((draft) => (draft.animations.enabled = value))}
            label="Animations"
          />
        </div>
        <Slider
          label="Transition length"
          value={theme.animations.durationMs}
          min={0}
          max={2000}
          step={50}
          onChange={(value) => setTheme((draft) => (draft.animations.durationMs = value))}
          suffix="ms"
        />
      </Section>
    </div>
  );
}
