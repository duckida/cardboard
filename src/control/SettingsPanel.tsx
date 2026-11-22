import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  LogOut,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Settings } from '@shared/types';
import { exportBoardJson } from '@shared/normalize';
import { useBoard } from '@/lib/board';
import { useAuth } from '@/lib/auth';
import { BOARD_ID, DEMO } from '@/lib/store';
import { getDemoFeed, resetLocalDemo, setDemoFeed } from '@/lib/store/local';
import { Badge, Button, Field, Input, Section, Select, Toggle } from '@/components/ui';
import { Slider } from './FieldControl';

interface FeedStatus {
  configured: boolean;
  includeInternal: boolean;
  updatedAt: number | null;
  revision: number;
  lastFetchAt: number | null;
  lastError: string | null;
  eventCount: number | null;
}

const EMPTY_STATUS: FeedStatus = {
  configured: false,
  includeInternal: false,
  updatedAt: null,
  revision: 1,
  lastFetchAt: null,
  lastError: null,
  eventCount: null,
};

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

export function SettingsPanel() {
  const { config, mutate, replaceConfig, saveNow } = useBoard();
  const { email, signOut, getToken } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<FeedStatus>(() => {
    if (!DEMO) return EMPTY_STATUS;
    const feed = getDemoFeed();
    return { ...EMPTY_STATUS, configured: Boolean(feed), includeInternal: Boolean(feed?.includeInternal) };
  });
  const [feedUrl, setFeedUrl] = useState('');
  const [includeInternal, setIncludeInternal] = useState(status.includeInternal);
  const [feedBusy, setFeedBusy] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const authedFeed = async (init: RequestInit = {}) => {
    const token = await getToken();
    if (!token) throw new Error('Sign in again to change settings.');
    const response = await fetch(`/api/settings/feeds?board=${encodeURIComponent(BOARD_ID)}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(json.error || `Request failed (${response.status}).`));
    return json as unknown as FeedStatus & { ok?: boolean; eventCount?: number };
  };

  useEffect(() => {
    if (DEMO) return;
    let alive = true;
    void (async () => {
      try {
        const next = await authedFeed();
        if (!alive) return;
        setStatus(next);
        setIncludeInternal(Boolean(next.includeInternal));
      } catch (error) {
        if (alive) setFeedError(error instanceof Error ? error.message : 'Could not read calendar settings.');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DEMO, getToken]);

  if (!config) return null;
  const settings = config.settings;
  const pages = config.pages;

  const patchSettings = (fn: (settings: Settings) => void) => {
    mutate((draft) => {
      fn(draft.settings);
    });
  };

  const saveFeed = async () => {
    setFeedError(null);
    setFeedNotice(null);
    if (!feedUrl.trim()) {
      setFeedError('Paste the calendar URL first.');
      return;
    }
    setFeedBusy(true);
    try {
      if (DEMO) {
        setDemoFeed({ url: feedUrl.trim(), includeInternal });
        setStatus({
          ...EMPTY_STATUS,
          configured: true,
          includeInternal,
          updatedAt: Date.now(),
        });
        setFeedNotice('Saved in this browser. Demo mode still shows sample events.');
      } else {
        const next = await authedFeed({
          method: 'POST',
          body: JSON.stringify({ url: feedUrl.trim(), includeInternal }),
        });
        setStatus(next);
        setFeedNotice('Saved. The private URL is only visible to the server.');
      }
      setFeedUrl('');
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : 'Could not save that feed.');
    } finally {
      setFeedBusy(false);
    }
  };

  const probeFeed = async () => {
    setFeedError(null);
    setFeedNotice(null);
    if (!feedUrl.trim()) {
      setFeedError('Paste the calendar URL first.');
      return;
    }
    setFeedBusy(true);
    try {
      if (DEMO) {
        setFeedNotice('Demo mode cannot reach a real calendar. Sample events are used instead.');
        return;
      }
      const result = await authedFeed({
        method: 'POST',
        body: JSON.stringify({ probe: true, url: feedUrl.trim(), includeInternal }),
      });
      setFeedNotice(`Feed works. Found ${result.eventCount ?? 0} events in the next 60 days.`);
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : 'That feed could not be read.');
    } finally {
      setFeedBusy(false);
    }
  };

  const removeFeed = async () => {
    if (!window.confirm('Remove the calendar feed? Schedule cards will stop updating.')) return;
    setFeedBusy(true);
    setFeedError(null);
    setFeedNotice(null);
    try {
      if (DEMO) {
        setDemoFeed(null);
        setStatus(EMPTY_STATUS);
        setIncludeInternal(false);
      } else {
        const next = await authedFeed({ method: 'DELETE' });
        setStatus(next);
      }
      setFeedUrl('');
      setFeedNotice('Calendar feed removed.');
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : 'Could not remove that feed.');
    } finally {
      setFeedBusy(false);
    }
  };

  const exportJson = () => {
    const blob = new Blob([exportBoardJson(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cardboard-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Exported the whole board, theme and pages.');
  };

  const importJson = async (file: File) => {
    setImportError(null);
    setNotice(null);
    try {
      const text = await file.text();
      await replaceConfig(text);
      await saveNow();
      setNotice('Imported. Check the pages and theme, then adjust anything you need.');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not import that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Board" description="Names and the default page used when a screen has no assignment.">
        <Field label="Board name">
          <Input
            value={settings.name}
            onChange={(event) => patchSettings((draft) => (draft.name = event.target.value))}
          />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Start page">
            <Select
              value={settings.defaultPageId}
              onChange={(event) => patchSettings((draft) => (draft.defaultPageId = event.target.value))}
            >
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Locale" help="Used for dates and times, e.g. en-GB.">
            <Input
              value={settings.locale}
              onChange={(event) => patchSettings((draft) => (draft.locale = event.target.value))}
            />
          </Field>
        </div>
        <Field label="Timezone" help="Every clock and calendar card uses this unless it sets its own.">
          <>
            <Input
              list="cb-settings-timezones"
              value={settings.timezone}
              onChange={(event) => patchSettings((draft) => (draft.timezone = event.target.value))}
            />
            <datalist id="cb-settings-timezones">
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
          </>
        </Field>
      </Section>

      <Section
        title="Rotation"
        description="Screens without an assigned page can cycle through these pages."
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-300">Rotate pages</div>
            <div className="text-[11px] text-slate-500">Leave off to keep one page on screen.</div>
          </div>
          <Toggle
            checked={settings.rotation.enabled}
            onChange={(value) => patchSettings((draft) => (draft.rotation.enabled = value))}
            label="Rotate pages"
          />
        </div>

        <Slider
          label="Seconds per page"
          value={settings.rotation.intervalSec}
          min={5}
          max={300}
          step={5}
          onChange={(value) => patchSettings((draft) => (draft.rotation.intervalSec = value))}
          suffix="s"
        />

        <div className="grid gap-1 sm:grid-cols-2">
          {pages.map((page) => {
            const checked = settings.rotation.pageIds.includes(page.id);
            return (
              <label
                key={page.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    patchSettings((draft) => {
                      draft.rotation.pageIds = checked
                        ? draft.rotation.pageIds.filter((id) => id !== page.id)
                        : [...draft.rotation.pageIds, page.id];
                    })
                  }
                  className="h-3.5 w-3.5 accent-indigo-500"
                />
                <span className="truncate">{page.name}</span>
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="Performance" description="For Raspberry Pi 2s and other older hardware.">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-300">Low-power mode</div>
            <div className="text-[11px] text-slate-500">
              Turns off blur, shadows and animation. Also switches on automatically for weak devices or with <code>?perf=1</code>.
            </div>
          </div>
          <Toggle
            checked={settings.lowPower}
            onChange={(value) => patchSettings((draft) => (draft.lowPower = value))}
            label="Low-power mode"
          />
        </div>
        <Field label="Nightly reload" help="A local time such as 03:30. Each screen reloads once a day to stay fresh.">
          <Input
            type="time"
            value={settings.maintenance.reloadAt ?? ''}
            onChange={(event) =>
              patchSettings((draft) => (draft.maintenance.reloadAt = event.target.value || null))
            }
          />
        </Field>
      </Section>

      <Section
        title="Calendar"
        description="Your SOCS iCalendar URL. It is stored server-side and never sent to screens."
        actions={
          status.configured ? (
            <Badge tone="green">
              <CheckCircle2 size={11} /> Configured
            </Badge>
          ) : (
            <Badge tone="amber">
              <AlertTriangle size={11} /> Not configured
            </Badge>
          )
        }
      >
        <div className="rounded-lg border border-white/[0.06] bg-black/20 p-3 text-[11px] leading-relaxed text-slate-500">
          {status.configured ? (
            <>
              <p className="text-slate-300">A feed is saved. The URL is hidden on purpose.</p>
              <p className="mt-1">
                {status.eventCount != null ? `${status.eventCount} events cached. ` : ''}
                {status.lastFetchAt ? `Last read ${new Date(status.lastFetchAt).toLocaleString()}.` : 'Not read yet.'}
              </p>
              {status.lastError ? <p className="mt-1 text-rose-300">Last error: {status.lastError}</p> : null}
            </>
          ) : (
            <p>
              Find the iCalendar link behind your SOCS week view. It usually starts with <code>webcal://</code> and ends in{' '}
              <code>CalendarSync.ashx</code>. Replace <code>webcal://</code> with <code>https://</code>.
            </p>
          )}
        </div>

        <Field label={status.configured ? 'Replace feed URL' : 'Feed URL'}>
          <Input
            type="password"
            autoComplete="off"
            value={feedUrl}
            placeholder={status.configured ? 'Paste a new URL to replace it' : 'https://…/CalendarSync.ashx?…'}
            onChange={(event) => setFeedUrl(event.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-slate-300">Include internal / approved events</div>
            <div className="text-[11px] text-slate-500">Adds <code>A=1</code> to the request. Leave off for the published calendar.</div>
          </div>
          <Toggle checked={includeInternal} onChange={setIncludeInternal} label="Include internal events" />
        </div>

        {feedError ? <p className="text-xs text-rose-300">{feedError}</p> : null}
        {feedNotice ? <p className="text-xs text-emerald-300">{feedNotice}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => void saveFeed()} disabled={feedBusy || !feedUrl.trim()}>
            <Save size={14} /> Save feed
          </Button>
          <Button onClick={() => void probeFeed()} disabled={feedBusy || !feedUrl.trim()}>
            <RefreshCw size={14} /> Test
          </Button>
          {status.configured ? (
            <Button variant="danger" onClick={() => void removeFeed()} disabled={feedBusy}>
              <Trash2 size={14} /> Remove
            </Button>
          ) : null}
          {DEMO ? <span className="text-[11px] text-slate-500">Demo mode uses sample events.</span> : null}
        </div>
      </Section>

      <Section title="Import and export" description="The export includes every page, card, theme and setting. Calendar URLs stay server-side.">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={exportJson}>
            <Download size={14} /> Export JSON
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import JSON
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
        {importError ? <p className="text-xs text-rose-300">{importError}</p> : null}
        {notice ? <p className="text-xs text-emerald-300">{notice}</p> : null}
        <p className="text-[11px] leading-relaxed text-slate-500">
          Importing replaces the whole board. Exports are validated on the way back in: unknown cards are dropped and layouts are clamped
          to the grid.
        </p>
      </Section>

      <Section title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-300">{email || (DEMO ? 'Demo session' : 'Signed in')}</div>
            <div className="text-[11px] text-slate-500">
              {DEMO ? 'No Firebase project is connected. Everything is stored in this browser.' : 'Firestore admin account.'}
            </div>
          </div>
          <Button variant="danger" onClick={() => void signOut()}>
            <LogOut size={14} /> Sign out
          </Button>
        </div>

        {DEMO ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-400/15 bg-amber-500/[0.06] p-3">
            <div>
              <div className="text-xs font-medium text-amber-200">Reset demo data</div>
              <div className="text-[11px] text-amber-200/60">Clears pages, screens and announcements from this browser.</div>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                if (!window.confirm('Clear all demo data in this browser?')) return;
                resetLocalDemo();
                window.location.reload();
              }}
            >
              <RotateCcw size={14} /> Reset
            </Button>
          </div>
        ) : null}
      </Section>
    </div>
  );
}
