import { useMemo, useState } from 'react';
import { Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Announcement, AnnouncementStyle, AnnouncementTarget, AnnouncementTone } from '@shared/types';
import { newId } from '@shared/ids';
import { getStore } from '@/lib/store';
import { useAnnouncements, useScreens } from '@/lib/hooks';
import { useBoard } from '@/lib/board';
import { Badge, Button, EmptyState, Field, Input, Section, Select, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

const TONES: { value: AnnouncementTone; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'urgent', label: 'Urgent' },
];

const STYLES: { value: AnnouncementStyle; label: string }[] = [
  { value: 'banner', label: 'Banner across the top' },
  { value: 'overlay', label: 'Centre card' },
  { value: 'ticker', label: 'Scrolling ticker' },
];

function toLocalInput(value: number | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function emptyDraft(): Announcement {
  return {
    id: '',
    title: '',
    body: '',
    tone: 'info',
    style: 'banner',
    durationSec: 20,
    target: { type: 'all' },
    startsAt: null,
    expiresAt: null,
    createdAt: Date.now(),
  };
}

function targetLabel(target: AnnouncementTarget, pageName: (id: string) => string, screenName: (id: string) => string) {
  if (target.type === 'all') return 'All screens';
  if (target.type === 'pages') return target.ids.map(pageName).join(', ') || 'No pages';
  return target.ids.map(screenName).join(', ') || 'No screens';
}

export function AnnouncementsPanel() {
  const store = getStore();
  const { config } = useBoard();
  const items = useAnnouncements();
  const screens = useScreens();
  const [draft, setDraft] = useState<Announcement>(() => emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pages = config?.pages ?? [];
  const now = Date.now();

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [items],
  );

  const pageName = (id: string) => pages.find((page) => page.id === id)?.name ?? id;
  const screenName = (id: string) => screens.find((screen) => screen.id === id)?.name ?? id;

  const patch = (values: Partial<Announcement>) => setDraft((current) => ({ ...current, ...values }));

  const setTarget = (type: AnnouncementTarget['type']) => {
    if (type === 'all') patch({ target: { type: 'all' } });
    else patch({ target: { type, ids: [] } });
  };

  const toggleTarget = (id: string) => {
    setDraft((current) => {
      if (current.target.type === 'all') return current;
      const ids = current.target.ids.includes(id)
        ? current.target.ids.filter((item) => item !== id)
        : [...current.target.ids, id];
      return { ...current, target: { type: current.target.type, ids } };
    });
  };

  const save = async () => {
    setError(null);
    if (!draft.body.trim()) {
      setError('Write something to show on the screens.');
      return;
    }
    if (draft.target.type !== 'all' && draft.target.ids.length === 0) {
      setError('Pick at least one target.');
      return;
    }
    setBusy(true);
    try {
      const item: Announcement = {
        ...draft,
        id: draft.id || newId('ann'),
        title: draft.title?.trim() || undefined,
        body: draft.body.trim(),
        durationSec: draft.durationSec && draft.durationSec > 0 ? Math.round(draft.durationSec) : null,
        createdAt: draft.id ? draft.createdAt : Date.now(),
      };
      await store.saveAnnouncement(item);
      setDraft(emptyDraft());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that announcement.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: Announcement) => {
    if (!window.confirm('Delete this announcement?')) return;
    await store.deleteAnnouncement(item.id);
    if (draft.id === item.id) setDraft(emptyDraft());
  };

  return (
    <div className="space-y-4">
      <Section
        title={draft.id ? 'Edit announcement' : 'New announcement'}
        description="Announcements sit on top of every page until they expire or are dismissed."
        actions={
          draft.id ? (
            <Button size="sm" variant="ghost" onClick={() => setDraft(emptyDraft())}>
              <X size={13} /> Cancel
            </Button>
          ) : null
        }
      >
        <Field label="Title" help="Optional. Shown above the message.">
          <Input value={draft.title ?? ''} onChange={(event) => patch({ title: event.target.value })} placeholder="Sports day" />
        </Field>

        <Field label="Message" help="Markdown works: **bold**, lists and links.">
          <Textarea
            value={draft.body}
            onChange={(event) => patch({ body: event.target.value })}
            placeholder="Lunch moves to 12:40 today."
            className="min-h-28"
          />
        </Field>

        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Tone">
            <Select value={draft.tone} onChange={(event) => patch({ tone: event.target.value as AnnouncementTone })}>
              {TONES.map((tone) => (
                <option key={tone.value} value={tone.value}>
                  {tone.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Style">
            <Select value={draft.style} onChange={(event) => patch({ style: event.target.value as AnnouncementStyle })}>
              {STYLES.map((style) => (
                <option key={style.value} value={style.value}>
                  {style.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Show for" help="Seconds. Leave blank to keep it up until deleted.">
            <Input
              type="number"
              min={1}
              value={draft.durationSec ?? ''}
              onChange={(event) =>
                patch({ durationSec: event.target.value === '' ? null : Number(event.target.value) })
              }
              placeholder="20"
            />
          </Field>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Starts">
            <Input
              type="datetime-local"
              value={toLocalInput(draft.startsAt)}
              onChange={(event) => patch({ startsAt: fromLocalInput(event.target.value) })}
            />
          </Field>
          <Field label="Expires">
            <Input
              type="datetime-local"
              value={toLocalInput(draft.expiresAt)}
              onChange={(event) => patch({ expiresAt: fromLocalInput(event.target.value) })}
            />
          </Field>
        </div>

        <Field label="Show on">
          <Select value={draft.target.type} onChange={(event) => setTarget(event.target.value as AnnouncementTarget['type'])}>
            <option value="all">All screens</option>
            <option value="pages">Specific pages</option>
            <option value="screens">Specific screens</option>
          </Select>
        </Field>

        {draft.target.type !== 'all' ? (
          <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/20 p-2 sm:grid-cols-2">
            {(draft.target.type === 'pages' ? pages : screens).map((entry) => {
              const id = entry.id;
              const label = draft.target.type === 'pages' ? (entry as { name: string }).name : (entry as { name: string }).name;
              const checked = draft.target.type !== 'all' && draft.target.ids.includes(id);
              return (
                <label
                  key={id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition',
                    checked ? 'bg-indigo-500/15 text-indigo-100' : 'text-slate-400 hover:bg-white/[0.05]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTarget(id)}
                    className="h-3.5 w-3.5 accent-indigo-500"
                  />
                  <span className="truncate">{label}</span>
                </label>
              );
            })}
            {(draft.target.type === 'pages' ? pages : screens).length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-500">Nothing to pick yet.</p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-xs text-rose-300">{error}</p> : null}

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {draft.id ? <Pencil size={14} /> : <Plus size={14} />}
            {draft.id ? 'Save changes' : 'Publish announcement'}
          </Button>
          <span className="text-[11px] text-slate-500">Screens update immediately.</span>
        </div>
      </Section>

      {sorted.length === 0 ? (
        <EmptyState title="Nothing announced" body="Publish a message above and it will appear on the selected screens." />
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => {
            const scheduled = item.startsAt != null && item.startsAt > now;
            const expired = item.expiresAt != null && item.expiresAt < now;
            const tone = item.tone === 'urgent' ? 'red' : item.tone === 'warning' ? 'amber' : item.tone === 'success' ? 'green' : 'blue';
            return (
              <div key={item.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Megaphone size={13} className="text-slate-500" />
                      <span className="truncate text-sm font-medium text-slate-100">{item.title || 'Announcement'}</span>
                      <Badge tone={tone as 'red' | 'amber' | 'green' | 'blue'}>{item.tone}</Badge>
                      <Badge tone={expired ? 'neutral' : scheduled ? 'amber' : 'green'}>
                        {expired ? 'Expired' : scheduled ? 'Scheduled' : 'Live'}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-slate-400">{item.body}</p>
                    <p className="mt-1 text-[10px] text-slate-600">
                      {item.style} · {targetLabel(item.target, pageName, screenName)}
                      {item.durationSec ? ` · ${item.durationSec}s` : ' · until removed'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setDraft(structuredClone(item))}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void remove(item)} className="hover:text-rose-300">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
