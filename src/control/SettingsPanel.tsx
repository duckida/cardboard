import { useRef, useState } from 'react';
import {
  Download,
  LogOut,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { Settings } from '@shared/types';
import { exportBoardJson } from '@shared/normalize';
import { useBoard } from '@/lib/board';
import { useAuth } from '@/lib/auth';
import { BOARD_ID, DEMO } from '@/lib/store';
import { resetLocalDemo } from '@/lib/store/local';
import { Button, Field, Input, Section, Select, Toggle } from '@/components/ui';

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
    return json as { ok?: boolean; eventCount?: number };
  };

  if (!config) return null;
  const settings = config.settings;
  const pages = config.pages;

  const patchSettings = (fn: (s: Settings) => void) => {
    mutate((draft) => fn(draft.settings));
  };

  // ── Feed (stored publicly in the board config) ──────────────────────────
  const probeFeed = async () => {
    setFeedError(null);
    setFeedNotice(null);
    const url = settings.calendar.url.trim();
    if (!url) { setFeedError('Paste the calendar URL first.'); return; }
    setFeedBusy(true);
    try {
      if (DEMO) { setFeedNotice('Demo mode uses sample events, not a real calendar.'); return; }
      const result = await authedFeed({ method: 'POST', body: JSON.stringify({ probe: true, url, includeInternal: settings.calendar.includeInternal }) });
      setFeedNotice(`Feed works — found ${result.eventCount ?? 0} events in the next 60 days.`);
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : 'That feed could not be read.');
    } finally {
      setFeedBusy(false);
    }
  };

  const removeFeed = () => {
    if (!window.confirm('Remove the calendar feed? Schedule widgets will stop updating.')) return;
    patchSettings((s) => { s.calendar.url = ''; });
    setFeedNotice('Calendar feed removed.');
  };

  const exportJson = () => {
    const blob = new Blob([exportBoardJson(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cardboard-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Board exported.');
  };

  const importJson = async (file: File) => {
    setImportError(null);
    setNotice(null);
    try {
      const text = await file.text();
      await replaceConfig(text);
      await saveNow();
      setNotice('Imported successfully. Check your pages and theme.');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not import that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5 pb-10">

      {/* ── Board name ──────────────────────────────────────────────────── */}
      <Section title="Board name">
        <Field label="Name shown in the header">
          <Input
            value={settings.name}
            onChange={(e) => patchSettings((s) => { s.name = e.target.value; })}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Default page" help="The page shown when a screen isn't assigned to anything specific.">
            <Select
              value={settings.defaultPageId}
              onChange={(e) => patchSettings((s) => { s.defaultPageId = e.target.value; })}
            >
              {pages.map((page) => (
                <option key={page.id} value={page.id}>{page.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Locale" help="Affects date and number formatting, e.g. en-GB.">
            <Input
              value={settings.locale}
              onChange={(e) => patchSettings((s) => { s.locale = e.target.value; })}
            />
          </Field>
        </div>
        <Field label="Timezone" help="All clocks and calendars use this unless they set their own.">
          <>
            <Input
              list="cb-settings-timezones"
              value={settings.timezone}
              onChange={(e) => patchSettings((s) => { s.timezone = e.target.value; })}
            />
            <datalist id="cb-settings-timezones">
              {TIMEZONES.map((zone) => <option key={zone} value={zone} />)}
            </datalist>
          </>
        </Field>
      </Section>

      {/* ── Performance ─────────────────────────────────────────────────── */}
      <Section title="Performance">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-stone-800">Low-power mode</div>
            <div className="text-xs text-stone-500">Turns off blur, shadows and animations. Good for older Raspberry Pis.</div>
          </div>
          <Toggle
            checked={settings.lowPower}
            onChange={(v) => patchSettings((s) => { s.lowPower = v; })}
            label="Low-power mode"
          />
        </div>
        <Field label="Nightly reload time" help="Set a local time like 03:30. Each screen reloads once a day at this time to stay fresh.">
          <Input
            type="time"
            value={settings.maintenance.reloadAt ?? ''}
            onChange={(e) => patchSettings((s) => { s.maintenance.reloadAt = e.target.value || null; })}
          />
        </Field>
      </Section>

      {/* ── Calendar feed ───────────────────────────────────────────────── */}
      <Section
        title="Calendar feed"
        description="Your SOCS iCalendar URL. Stored in the public board config so screens can read it."
      >
        <div className="rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-600">
          Find the iCalendar link in your SOCS week view — it usually starts with <code className="rounded bg-stone-200 px-1">webcal://</code> and ends in <code className="rounded bg-stone-200 px-1">CalendarSync.ashx</code>. You can paste it as-is; it is converted to https automatically.
        </div>

        <Field label="Feed URL" help="Leave blank to disable the schedule widget.">
          <Input
            type="url"
            autoComplete="off"
            value={settings.calendar.url}
            placeholder="https://…/CalendarSync.ashx?…"
            onChange={(e) => patchSettings((s) => { s.calendar.url = e.target.value; })}
          />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-stone-800">Include internal / approved events</div>
            <div className="text-xs text-stone-500">Adds <code className="rounded bg-stone-100 px-1">A=1</code> to the request. Leave off for the public calendar.</div>
          </div>
          <Toggle
            checked={settings.calendar.includeInternal}
            onChange={(v) => patchSettings((s) => { s.calendar.includeInternal = v; })}
            label="Include internal events"
          />
        </div>

        {feedError ? <p className="text-sm text-red-600">{feedError}</p> : null}
        {feedNotice ? <p className="text-sm text-emerald-700">{feedNotice}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void probeFeed()} disabled={feedBusy || !settings.calendar.url.trim()}>
            <RefreshCw size={14} /> Test connection
          </Button>
          {settings.calendar.url.trim() ? (
            <Button variant="danger" onClick={removeFeed} disabled={feedBusy}>
              <Trash2 size={14} /> Remove
            </Button>
          ) : null}
        </div>
      </Section>

      {/* ── Import / export ─────────────────────────────────────────────── */}
      <Section title="Backup and restore" description="Export saves everything — pages, widgets, theme, settings, including the calendar URL.">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={exportJson}>
            <Download size={14} /> Export backup
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Restore from backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importJson(file);
            }}
          />
        </div>
        {importError ? <p className="text-sm text-red-600">{importError}</p> : null}
        {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
        <p className="text-xs text-stone-400">
          Restoring replaces everything. The file is validated on the way in — unknown widgets are skipped and layouts are corrected automatically.
        </p>
      </Section>

      {/* ── Account ─────────────────────────────────────────────────────── */}
      <Section title="Account">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-stone-800">{email || (DEMO ? 'Demo session' : 'Signed in')}</div>
            <div className="text-xs text-stone-500">
              {DEMO ? 'No Firebase project connected — data lives in this browser.' : 'Firestore admin account.'}
            </div>
          </div>
          <Button variant="danger" onClick={() => void signOut()}>
            <LogOut size={14} /> Sign out
          </Button>
        </div>

        {DEMO ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div>
              <div className="text-sm font-semibold text-amber-800">Reset demo data</div>
              <div className="text-xs text-amber-700">Clears all pages, screens and announcements from this browser.</div>
            </div>
            <Button
              variant="danger"
              onClick={() => {
                if (!window.confirm('Clear all demo data?')) return;
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
