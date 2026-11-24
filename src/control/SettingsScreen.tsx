import { useRef, useState, type CSSProperties } from 'react';
import {
  CalendarDays,
  Check,
  Download,
  Gauge,
  Image as ImageIcon,
  LogOut,
  Palette,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import type { Background, Settings, Theme } from '@shared/types';
import { DEFAULT_THEME, FONT_STACKS, THEME_PRESETS } from '@shared/defaults';
import { exportBoardJson, mergeTheme } from '@shared/normalize';
import { useBoard } from '@/lib/board';
import { useAuth } from '@/lib/auth';
import { BOARD_ID, DEMO } from '@/lib/store';
import { resetLocalDemo } from '@/lib/store/local';
import { cn } from '@/lib/cn';
import {
  Badge,
  Button,
  Field,
  Input,
  Panel,
  SectionHeading,
  Segmented,
  Select,
  Slider,
  ToggleRow,
} from '@/components/ui';
import { BackgroundFields } from './BackgroundFields';
import { useFeedback } from './Feedback';

const TIMEZONES = [
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

function backgroundCss(background: Background): string {
  if (background.type === 'solid') return background.color;
  if (background.type === 'gradient') {
    return `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})`;
  }
  return background.url
    ? `linear-gradient(rgba(0,0,0,${background.dim}), rgba(0,0,0,${background.dim})), url(${background.url}) center / cover`
    : '#111';
}

function SettingsBlock({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-start gap-3.5 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6">{children}</div>
    </Panel>
  );
}

export function SettingsScreen() {
  const { config, mutate, replaceConfig, saveNow } = useBoard();
  const { email, signOut, getToken } = useAuth();
  const { confirm, toast } = useFeedback();
  const fileRef = useRef<HTMLInputElement>(null);

  const [feedBusy, setFeedBusy] = useState(false);
  const [showColours, setShowColours] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);

  if (!config) return null;
  const settings = config.settings;
  const theme = config.theme;
  const pages = config.pages;

  const patchSettings = (fn: (s: Settings) => void) => mutate((draft) => fn(draft.settings));
  const setTheme = (fn: (t: Theme) => void) => mutate((draft) => fn(draft.theme));

  const applyPreset = (name: string) => {
    const preset = THEME_PRESETS[name] ?? {};
    const next = mergeTheme(DEFAULT_THEME, preset);
    setTheme((draft) => Object.assign(draft, structuredClone(next)));
    toast(`“${name}” look applied.`, 'success');
  };

  const probeFeed = async () => {
    const url = settings.calendar.url.trim();
    if (!url) {
      toast('Paste your calendar link first.', 'error');
      return;
    }
    if (DEMO) {
      toast('Demo mode uses sample timetable data instead of a real calendar.', 'info');
      return;
    }
    setFeedBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in again.');
      const response = await fetch(`/api/settings/feeds?board=${encodeURIComponent(BOARD_ID)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          probe: true,
          url,
          includeInternal: settings.calendar.includeInternal,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(json.error || `That link could not be read (${response.status}).`));
      const count = Number(json.eventCount ?? 0);
      toast(`Calendar works — found ${count} event${count === 1 ? '' : 's'} in the next 60 days.`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That calendar link could not be read.', 'error');
    } finally {
      setFeedBusy(false);
    }
  };

  const removeFeed = async () => {
    const ok = await confirm({
      title: 'Remove the calendar?',
      body: 'Timetable cards will stop updating until you add a calendar link again.',
      confirmLabel: 'Remove calendar',
      destructive: true,
    });
    if (!ok) return;
    patchSettings((s) => {
      s.calendar.url = '';
    });
    toast('Calendar removed.', 'success');
  };

  const exportJson = () => {
    const blob = new Blob([exportBoardJson(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cardboard-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast('Backup downloaded.', 'success');
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      await replaceConfig(text);
      await saveNow();
      toast('Backup restored. Have a look at your pages.', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That file could not be restored.', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const resetDemo = async () => {
    const ok = await confirm({
      title: 'Clear all demo data?',
      body: 'Every page, screen and notice in this browser will be removed. This cannot be undone.',
      confirmLabel: 'Clear everything',
      destructive: true,
    });
    if (!ok) return;
    resetLocalDemo();
    window.location.reload();
  };

  const fontOptions = Object.entries(FONT_STACKS);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <SectionHeading
        title="Settings"
        description="Everything that applies to the whole board. Most people only need this once."
      />

      <SettingsBlock
        icon={<Gauge size={19} />}
        title="Your board"
        description="The name and the page screens show first."
      >
        <Field label="Board name">
          <Input
            value={settings.name}
            onChange={(event) =>
              patchSettings((s) => {
                s.name = event.target.value;
              })
            }
            maxLength={60}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start page" help="Screens show this when pages are not looping.">
            <Select
              value={settings.defaultPageId}
              onChange={(event) =>
                patchSettings((s) => {
                  s.defaultPageId = event.target.value;
                })
              }
            >
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Time zone" help="Clocks and timetables follow this.">
            <Select
              value={TIMEZONES.includes(settings.timezone) ? settings.timezone : '__custom'}
              onChange={(event) => {
                if (event.target.value === '__custom') return;
                patchSettings((s) => {
                  s.timezone = event.target.value;
                });
              }}
            >
              {!TIMEZONES.includes(settings.timezone) ? (
                <option value="__custom">{settings.timezone || 'Custom'}</option>
              ) : null}
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <details className="rounded-2xl border border-line bg-[#faf8f3] px-3.5 py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-semibold text-muted transition hover:text-ink">
            Language and region
            <span className="text-[16px] leading-none">+</span>
          </summary>
          <div className="mt-3">
            <Field label="Region code" help="For example en-GB, en-US or fr-FR.">
              <Input
                value={settings.locale}
                onChange={(event) =>
                  patchSettings((s) => {
                    s.locale = event.target.value;
                  })
                }
              />
            </Field>
          </div>
        </details>
      </SettingsBlock>

      <SettingsBlock
        icon={<Palette size={19} />}
        title="How it looks"
        description="Pick a look and the whole board changes to match."
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
                  'group overflow-hidden rounded-2xl border-2 p-1.5 text-left transition',
                  active ? 'border-accent' : 'border-line hover:border-[#d6d0c2]',
                )}
              >
                <div
                  className="flex h-16 flex-col justify-between rounded-xl p-2"
                  style={{ background: backgroundCss(preview.background) } as CSSProperties}
                >
                  <div
                    className="h-1.5 w-9 rounded-full"
                    style={{ background: preview.colors.text, opacity: 0.85 }}
                  />
                  <div className="flex items-end gap-1">
                    <div
                      className="h-6 flex-1 rounded"
                      style={{
                        background: preview.colors.surface,
                        opacity: preview.card.opacity,
                        borderRadius: Math.max(3, preview.radius / 4),
                      }}
                    />
                    <div className="h-4 w-4 rounded-full" style={{ background: preview.colors.accent }} />
                  </div>
                </div>
                <div className="mt-1.5 flex items-center justify-between px-0.5 pb-0.5">
                  <span className="text-[12px] font-semibold text-ink">{name}</span>
                  {active ? <Check size={13} className="text-accent" /> : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Text size">
            <Segmented
              value={
                theme.font.scale < 0.95 ? 'small' : theme.font.scale > 1.1 ? 'large' : 'normal'
              }
              onChange={(value) =>
                setTheme((draft) => {
                  draft.font.scale = value === 'small' ? 0.9 : value === 'large' ? 1.15 : 1;
                })
              }
              ariaLabel="Text size"
              options={[
                { value: 'small', label: 'Smaller' },
                { value: 'normal', label: 'Normal' },
                { value: 'large', label: 'Larger' },
              ]}
            />
          </Field>
          <Field label="Background">
            <Button variant="secondary" className="w-full justify-start" onClick={() => setBackgroundOpen(true)}>
              <ImageIcon size={15} /> Change background
            </Button>
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowColours((value) => !value)}>
            <Palette size={14} /> {showColours ? 'Hide colours' : 'Fine-tune colours'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowFonts((value) => !value)}>
            <Sparkles size={14} /> {showFonts ? 'Hide fonts' : 'Choose fonts'}
          </Button>
        </div>

        {showColours ? (
          <div className="grid gap-3 rounded-2xl border border-line bg-[#faf8f3] p-3 sm:grid-cols-2">
            {(
              [
                ['bg', 'Background'],
                ['surface', 'Cards'],
                ['text', 'Text'],
                ['muted', 'Quiet text'],
                ['accent', 'Highlight'],
                ['border', 'Lines'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2.5 rounded-xl bg-white p-2 shadow-sm">
                <input
                  type="color"
                  value={theme.colors[key]}
                  onChange={(event) =>
                    setTheme((draft) => {
                      draft.colors[key] = event.target.value;
                    })
                  }
                  aria-label={label}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-0.5"
                />
                <span className="text-[12px] font-semibold text-ink">{label}</span>
              </label>
            ))}
          </div>
        ) : null}

        {showFonts ? (
          <div className="space-y-4 rounded-2xl border border-line bg-[#faf8f3] p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Headings">
                <Select
                  value={theme.font.display}
                  onChange={(event) =>
                    setTheme((draft) => {
                      draft.font.display = event.target.value;
                    })
                  }
                >
                  {fontOptions.map(([name, stack]) => (
                    <option key={name} value={stack}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Body text">
                <Select
                  value={theme.font.body}
                  onChange={(event) =>
                    setTheme((draft) => {
                      draft.font.body = event.target.value;
                    })
                  }
                >
                  {fontOptions.map(([name, stack]) => (
                    <option key={name} value={stack}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Slider
                label="Corner roundness"
                value={theme.radius}
                min={0}
                max={48}
                onChange={(radius) =>
                  setTheme((draft) => {
                    draft.radius = radius;
                  })
                }
                suffix="px"
              />
              <Slider
                label="Space between cards"
                value={theme.gap}
                min={0}
                max={48}
                onChange={(gap) =>
                  setTheme((draft) => {
                    draft.gap = gap;
                  })
                }
                suffix="px"
              />
            </div>
            <ToggleRow
              label="Page transitions"
              description="A gentle fade when pages change. Turn off for very old screens."
              checked={theme.animations.enabled}
              onChange={(enabled) =>
                setTheme((draft) => {
                  draft.animations.enabled = enabled;
                })
              }
            />
          </div>
        ) : null}

        {backgroundOpen ? (
          <div className="space-y-3 rounded-2xl border border-line bg-[#faf8f3] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[12px] font-semibold text-ink">Board background</div>
              <Button size="sm" variant="ghost" onClick={() => setBackgroundOpen(false)}>
                Done
              </Button>
            </div>
            <BackgroundFields
              value={theme.background}
              onChange={(next) =>
                setTheme((draft) => {
                  draft.background = next;
                })
              }
            />
          </div>
        ) : null}
      </SettingsBlock>

      <SettingsBlock
        icon={<Gauge size={19} />}
        title="Screens and power"
        description="Helpful options if a screen feels slow or should rest overnight."
      >
        <ToggleRow
          label="Low-power mode"
          description="Turns off blur, shadows and animations. Good for older Raspberry Pis."
          checked={settings.lowPower}
          onChange={(lowPower) =>
            patchSettings((s) => {
              s.lowPower = lowPower;
            })
          }
        />
        <Field
          label="Reload screens each night"
          help="Leave blank to never reload. Around 3:30am is a good time."
        >
          <Input
            type="time"
            value={settings.maintenance.reloadAt ?? ''}
            onChange={(event) =>
              patchSettings((s) => {
                s.maintenance.reloadAt = event.target.value || null;
              })
            }
          />
        </Field>
      </SettingsBlock>

      <SettingsBlock
        icon={<CalendarDays size={19} />}
        title="School calendar"
        description="Add your calendar link once and timetable cards fill in automatically."
      >
        <div className="rounded-2xl bg-[#faf8f3] px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          You’ll find the iCalendar link in your SOCS week view. It usually starts with{' '}
          <code className="rounded bg-white px-1 py-0.5 text-[11px] text-ink">webcal://</code> and ends in{' '}
          <code className="rounded bg-white px-1 py-0.5 text-[11px] text-ink">CalendarSync.ashx</code>. Paste it as
          it is.
        </div>
        <Field label="Calendar link">
          <Input
            type="url"
            autoComplete="off"
            value={settings.calendar.url}
            placeholder="https://…/CalendarSync.ashx?…"
            onChange={(event) =>
              patchSettings((s) => {
                s.calendar.url = event.target.value;
              })
            }
          />
        </Field>
        <ToggleRow
          label="Include internal events"
          description="Adds events marked as internal or approved."
          checked={settings.calendar.includeInternal}
          onChange={(includeInternal) =>
            patchSettings((s) => {
              s.calendar.includeInternal = includeInternal;
            })
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void probeFeed()}
            disabled={feedBusy || !settings.calendar.url.trim()}
          >
            <RefreshCw size={14} className={feedBusy ? 'animate-spin' : undefined} />
            {feedBusy ? 'Checking…' : 'Test the link'}
          </Button>
          {settings.calendar.url.trim() ? (
            <Button size="sm" variant="ghost" onClick={() => void removeFeed()} className="hover:text-danger">
              <Trash2 size={14} /> Remove
            </Button>
          ) : null}
        </div>
      </SettingsBlock>

      <SettingsBlock
        icon={<Upload size={19} />}
        title="Backup"
        description="Save a copy of everything, or bring a copy back."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportJson}>
            <Download size={15} /> Download a backup
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Restore a backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importJson(file);
            }}
          />
        </div>
        <p className="text-[12px] leading-relaxed text-muted">
          Restoring replaces everything on the board. The file is checked on the way in and anything unusual is
          corrected automatically.
        </p>
      </SettingsBlock>

      <SettingsBlock icon={<UserRound size={19} />} title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-ink">
                {email || (DEMO ? 'Demo session' : 'Signed in')}
              </span>
              {DEMO ? <Badge tone="amber">Demo</Badge> : null}
            </div>
            <p className="mt-0.5 text-[12px] text-muted">
              {DEMO
                ? 'No account needed — everything is stored in this browser.'
                : 'Screens are public. Only this control panel is locked.'}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void signOut()}>
            <LogOut size={15} /> Sign out
          </Button>
        </div>

        {DEMO ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#efdfb9] bg-[#fdf8ea] p-3.5">
            <div>
              <div className="text-[13px] font-semibold text-[#8a6516]">Reset demo data</div>
              <p className="mt-0.5 text-[12px] text-[#8a6516]/80">
                Clears every page, screen and notice in this browser.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => void resetDemo()}>
              <RotateCcw size={14} /> Reset
            </Button>
          </div>
        ) : null}
      </SettingsBlock>
    </div>
  );
}
