import { useMemo, useState } from 'react';
import { Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Announcement, AnnouncementStyle, AnnouncementTarget, AnnouncementTone } from '@shared/types';
import { newId } from '@shared/ids';
import { getStore } from '@/lib/store';
import { useAnnouncements, useScreens } from '@/lib/hooks';
import { useBoard } from '@/lib/board';
import { Badge, Button, EmptyState, Field, Input, Section, Select, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';

const TONES: { value: AnnouncementTone; label: string; color: string }[] = [
  { value: 'info', label: 'Info', color: 'bg-blue-500' },
  { value: 'success', label: 'Success', color: 'bg-emerald-500' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

const STYLES: { value: AnnouncementStyle; label: string; description: string }[] = [
  { value: 'banner', label: 'Banner', description: 'Coloured bar across the top' },
  { value: 'overlay', label: 'Pop-up card', description: 'Centred over the screen' },
  { value: 'ticker', label: 'Ticker', description: 'Scrolling text at the bottom' },
];

function toLocalInput(value: number | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
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
  if (target.type === 'pages') return target.ids.map(pageName).join(', ') || 'No pages selected';
  return target.ids.map(screenName).join(', ') || 'No screens selected';
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

  const pageName = (id: string) => pages.find((p) => p.id === id)?.name ?? id;
  const screenName = (id: string) => screens.find((s) => s.id === id)?.name ?? id;

  const patch = (values: Partial<Announcement>) => setDraft((d) => ({ ...d, ...values }));

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
    if (!draft.body.trim()) { setError('Write a message to show on the screens.'); return; }
    if (draft.target.type !== 'all' && draft.target.ids.length === 0) { setError('Pick at least one target.'); return; }
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
    <div className="space-y-5 pb-10">
      <Section
        title={draft.id ? 'Edit announcement' : 'New announcement'}
        description="Announcements appear on top of whatever is showing, then disappear after the time you set."
        actions={
          draft.id ? (
            <Button size="sm" variant="ghost" onClick={() => setDraft(emptyDraft())}>
              <X size={13} /> Cancel
            </Button>
          ) : null
        }
      >
        <Field label="Heading" help="Optional — shown above the message in larger text.">
          <Input
            value={draft.title ?? ''}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Lunch is served"
          />
        </Field>

        <Field label="Message">
          <Textarea
            value={draft.body}
            onChange={(e) => patch({ body: e.target.value })}
            placeholder="Lunch is in the main hall today, starting at 12:30."
            className="min-h-20"
          />
        </Field>

        {/* Tone — visual colour picker */}
        <div>
          <div className="mb-2 text-sm font-medium text-stone-700">Colour</div>
          <div className="flex gap-2">
            {TONES.map((tone) => (
              <button
                key={tone.value}
                type="button"
                onClick={() => patch({ tone: tone.value })}
                className={cn(
                  'flex flex-1 flex-col items-center rounded-xl border-2 py-2 text-xs font-medium text-white transition',
                  tone.color,
                  draft.tone === tone.value ? 'border-stone-900 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div>
          <div className="mb-2 text-sm font-medium text-stone-700">How it appears</div>
          <div className="grid gap-2 sm:grid-cols-3">
            {STYLES.map((style) => (
              <button
                key={style.value}
                type="button"
                onClick={() => patch({ style: style.value })}
                className={cn(
                  'rounded-xl border-2 px-3 py-2.5 text-left transition',
                  draft.style === style.value
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-stone-200 bg-white hover:border-stone-300',
                )}
              >
                <div className="text-sm font-semibold text-stone-800">{style.label}</div>
                <div className="text-xs text-stone-500">{style.description}</div>
              </button>
            ))}
          </div>
        </div>

        <Field label="Show for (seconds)" help="Leave blank to keep it showing until you delete it.">
          <Input
            type="number"
            min={1}
            value={draft.durationSec ?? ''}
            onChange={(e) => patch({ durationSec: e.target.value === '' ? null : Number(e.target.value) })}
            placeholder="20"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Show from (optional)">
            <Input
              type="datetime-local"
              value={toLocalInput(draft.startsAt)}
              onChange={(e) => patch({ startsAt: fromLocalInput(e.target.value) })}
            />
          </Field>
          <Field label="Hide after (optional)">
            <Input
              type="datetime-local"
              value={toLocalInput(draft.expiresAt)}
              onChange={(e) => patch({ expiresAt: fromLocalInput(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="Show on">
          <Select value={draft.target.type} onChange={(e) => setTarget(e.target.value as AnnouncementTarget['type'])}>
            <option value="all">All screens</option>
            <option value="pages">Specific pages</option>
            <option value="screens">Specific screens</option>
          </Select>
        </Field>

        {draft.target.type !== 'all' ? (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-2">
            {(draft.target.type === 'pages' ? pages : screens).map((entry) => {
              const id = entry.id;
              const label = (entry as { name: string }).name;
              const checked = draft.target.type !== 'all' && draft.target.ids.includes(id);
              return (
                <label
                  key={id}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition',
                    checked ? 'bg-amber-50 text-amber-800' : 'text-stone-600 hover:bg-white',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTarget(id)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <span className="truncate">{label}</span>
                </label>
              );
            })}
            {(draft.target.type === 'pages' ? pages : screens).length === 0 ? (
              <p className="px-2 py-2 text-sm text-stone-400">Nothing to pick yet.</p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {draft.id ? <Pencil size={14} /> : <Plus size={14} />}
            {draft.id ? 'Save changes' : 'Show announcement'}
          </Button>
          <span className="text-xs text-stone-400">Screens update within seconds.</span>
        </div>
      </Section>

      {sorted.length === 0 ? (
        <EmptyState
          title="No announcements"
          body="Create one above and it will appear on the selected screens straight away."
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => {
            const scheduled = item.startsAt != null && item.startsAt > now;
            const expired = item.expiresAt != null && item.expiresAt < now;
            const tone = item.tone === 'urgent' ? 'red' : item.tone === 'warning' ? 'amber' : item.tone === 'success' ? 'green' : 'blue';
            return (
              <div key={item.id} className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Megaphone size={13} className="text-stone-400" />
                      <span className="text-sm font-semibold text-stone-900">{item.title || 'Announcement'}</span>
                      <Badge tone={tone as 'red' | 'amber' | 'green' | 'blue'}>{item.tone}</Badge>
                      <Badge tone={expired ? 'neutral' : scheduled ? 'amber' : 'green'}>
                        {expired ? 'Expired' : scheduled ? 'Scheduled' : 'Live'}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-stone-500">{item.body}</p>
                    <p className="mt-1 text-xs text-stone-400">
                      {item.style} · {targetLabel(item.target, pageName, screenName)}
                      {item.durationSec ? ` · ${item.durationSec}s` : ' · stays until deleted'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setDraft(structuredClone(item))}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void remove(item)} className="hover:text-red-500">
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
