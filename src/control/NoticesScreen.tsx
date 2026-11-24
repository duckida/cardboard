import { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Megaphone,
  PanelTop,
  Pencil,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import type {
  Announcement,
  AnnouncementStyle,
  AnnouncementTarget,
  AnnouncementTone,
  Page,
} from '@shared/types';
import { newId } from '@shared/ids';
import { getStore } from '@/lib/store';
import { useAnnouncements, useScreens } from '@/lib/hooks';
import { useBoard } from '@/lib/board';
import { cn } from '@/lib/cn';
import {
  Badge,
  Button,
  Field,
  Input,
  Segmented,
  SectionHeading,
  Select,
  Textarea,
} from '@/components/ui';
import { useFeedback } from './Feedback';
import { PageStage } from './PageStage';

const TONES: { value: AnnouncementTone; label: string; dot: string; bar: string; hex: string }[] = [
  { value: 'info', label: 'Information', dot: 'bg-blue-500', bar: 'bg-[#2563eb]', hex: '#2563eb' },
  { value: 'success', label: 'Good news', dot: 'bg-emerald-500', bar: 'bg-emerald-600', hex: '#059669' },
  { value: 'warning', label: 'Heads up', dot: 'bg-amber-500', bar: 'bg-amber-500', hex: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', dot: 'bg-red-500', bar: 'bg-red-600', hex: '#dc2626' },
];

const STYLES: { value: AnnouncementStyle; label: string; description: string; icon: typeof PanelTop }[] = [
  { value: 'banner', label: 'Top banner', description: 'A coloured bar across the top.', icon: PanelTop },
  { value: 'overlay', label: 'Pop-up card', description: 'Big and centred over the screen.', icon: Square },
  { value: 'ticker', label: 'Scrolling line', description: 'Text moving along the bottom.', icon: ArrowLeftRight },
];

const DURATIONS = [
  { value: '20', label: '20 sec' },
  { value: '60', label: '1 min' },
  { value: '300', label: '5 min' },
  { value: 'keep', label: 'Keep it' },
];

function toLocalInput(value: number | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, '0');
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

function targetLabel(
  target: AnnouncementTarget,
  pageName: (id: string) => string,
  screenName: (id: string) => string,
) {
  if (target.type === 'all') return 'Everyone';
  if (target.type === 'pages') {
    return target.ids.map(pageName).join(', ') || 'No pages chosen';
  }
  return target.ids.map(screenName).join(', ') || 'No screens chosen';
}

export function NoticesScreen() {
  const store = getStore();
  const { config } = useBoard();
  const items = useAnnouncements();
  const screens = useScreens();
  const { confirm, toast } = useFeedback();
  const [draft, setDraft] = useState<Announcement>(() => emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pages = config?.pages ?? [];
  const now = Date.now();
  const pageName = (id: string) => pages.find((page) => page.id === id)?.name ?? id;
  const screenName = (id: string) => screens.find((screen) => screen.id === id)?.name ?? id;

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [items],
  );

  const patch = (values: Partial<Announcement>) => {
    setDraft((current) => ({ ...current, ...values }));
    setError(null);
  };

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

  const reset = () => {
    setDraft(emptyDraft());
    setError(null);
  };

  const save = async () => {
    if (!draft.body.trim()) {
      setError('Write the message you want everyone to see.');
      return;
    }
    if (draft.target.type !== 'all' && draft.target.ids.length === 0) {
      setError('Choose at least one screen or page.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await store.saveAnnouncement({
        ...draft,
        id: draft.id || newId('ann'),
        title: draft.title?.trim() || undefined,
        body: draft.body.trim(),
        durationSec:
          draft.durationSec && draft.durationSec > 0 ? Math.max(1, Math.round(draft.durationSec)) : null,
        createdAt: draft.id ? draft.createdAt : Date.now(),
      });
      toast(draft.id ? 'Notice updated.' : 'Notice is showing on the screens.', 'success');
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that notice.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (item: Announcement) => {
    setDraft(structuredClone(item));
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (item: Announcement) => {
    const ok = await confirm({
      title: 'Remove this notice?',
      body: 'It will disappear from the screens straight away.',
      confirmLabel: 'Remove notice',
      destructive: true,
    });
    if (!ok) return;
    await store.deleteAnnouncement(item.id);
    if (draft.id === item.id) reset();
    toast('Notice removed.', 'success');
  };

  const durationValue = draft.durationSec == null ? 'keep' : String(draft.durationSec);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-7">
      <SectionHeading
        title="Notices"
        description="Put a message over whatever is on the screens. It can stay for a few minutes or until you remove it."
        action={
          draft.id ? (
            <Button variant="ghost" onClick={reset}>
              <X size={15} /> Cancel editing
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(32,37,31,0.04)] sm:p-6">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Megaphone size={18} />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">
                  {draft.id ? 'Edit notice' : 'Write a notice'}
                </h2>
                <p className="text-[12px] text-muted">Keep it short so it is easy to read from a distance.</p>
              </div>
            </div>

            <div className="space-y-4">
              <Field label="Heading" help="Optional. A few words at the top.">
                <Input
                  value={draft.title ?? ''}
                  onChange={(event) => patch({ title: event.target.value })}
                  placeholder="e.g. Lunch is served"
                  maxLength={80}
                />
              </Field>

              <Field label="Message">
                <Textarea
                  value={draft.body}
                  onChange={(event) => patch({ body: event.target.value })}
                  placeholder="e.g. Lunch is in the main hall today, starting at 12:30."
                  className="min-h-24"
                  maxLength={500}
                />
              </Field>

              <Field label="Colour">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TONES.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => patch({ tone: tone.value })}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[12px] font-semibold transition',
                        draft.tone === tone.value
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line bg-white text-muted hover:border-[#d6d0c2] hover:text-ink',
                      )}
                    >
                      <span className={cn('h-3 w-3 rounded-full', tone.dot)} />
                      {tone.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="How it appears">
                <div className="grid gap-2 sm:grid-cols-3">
                  {STYLES.map((style) => {
                    const Icon = style.icon;
                    const active = draft.style === style.value;
                    return (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => patch({ style: style.value })}
                        className={cn(
                          'rounded-2xl border p-3 text-left transition',
                          active
                            ? 'border-accent bg-accent-soft'
                            : 'border-line bg-white hover:border-[#d6d0c2]',
                        )}
                      >
                        <Icon size={18} className={active ? 'text-accent' : 'text-muted'} />
                        <div className="mt-2 text-[13px] font-semibold text-ink">{style.label}</div>
                        <div className="mt-0.5 text-[11px] leading-snug text-muted">{style.description}</div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="How long it stays" help="“Keep it” leaves the notice up until you remove it.">
                <Segmented
                  value={durationValue}
                  onChange={(value) => patch({ durationSec: value === 'keep' ? null : Number(value) })}
                  ariaLabel="How long the notice stays"
                  options={DURATIONS}
                />
                {durationValue !== 'keep' && !DURATIONS.some((option) => option.value === durationValue) ? (
                  <Input
                    type="number"
                    min={1}
                    value={draft.durationSec ?? ''}
                    onChange={(event) => patch({ durationSec: event.target.value === '' ? null : Number(event.target.value) })}
                    className="mt-2"
                  />
                ) : null}
              </Field>

              <Field label="Who sees it">
                <Select
                  value={draft.target.type}
                  onChange={(event) => setTarget(event.target.value as AnnouncementTarget['type'])}
                >
                  <option value="all">Everyone</option>
                  <option value="screens">Only some screens</option>
                  <option value="pages">Only when certain pages are showing</option>
                </Select>
              </Field>

              {draft.target.type !== 'all' ? (
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-line bg-[#faf8f3] p-2">
                  {(draft.target.type === 'screens' ? screens : pages).map((entry) => {
                    const id = entry.id;
                    const label = (entry as { name: string }).name;
                    const checked = draft.target.type !== 'all' && draft.target.ids.includes(id);
                    return (
                      <label
                        key={id}
                        className={cn(
                          'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition',
                          checked ? 'bg-white text-ink shadow-sm' : 'text-muted hover:bg-white/70',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTarget(id)}
                          className="h-4 w-4 accent-[#0f766e]"
                        />
                        <span className="truncate">{label}</span>
                      </label>
                    );
                  })}
                  {(draft.target.type === 'screens' ? screens : pages).length === 0 ? (
                    <p className="px-3 py-2 text-[12px] text-muted">Nothing to choose yet.</p>
                  ) : null}
                </div>
              ) : null}

              <details className="rounded-2xl border border-line bg-[#faf8f3] px-3.5 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-semibold text-muted transition hover:text-ink">
                  Schedule it for later
                  <span className="text-[16px] leading-none">+</span>
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Show from">
                    <Input
                      type="datetime-local"
                      value={toLocalInput(draft.startsAt)}
                      onChange={(event) => patch({ startsAt: fromLocalInput(event.target.value) })}
                    />
                  </Field>
                  <Field label="Hide after">
                    <Input
                      type="datetime-local"
                      value={toLocalInput(draft.expiresAt)}
                      onChange={(event) => patch({ expiresAt: fromLocalInput(event.target.value) })}
                    />
                  </Field>
                </div>
              </details>

              {error ? (
                <p className="rounded-xl bg-[#fdf3f0] px-3 py-2 text-[13px] font-medium text-danger">{error}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button variant="primary" size="lg" onClick={() => void save()} disabled={busy}>
                  {draft.id ? <Pencil size={16} /> : <Plus size={16} />}
                  {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Show on screens'}
                </Button>
                <span className="text-[12px] text-muted">Screens update within a few seconds.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(32,37,31,0.04)]">
            <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Preview</div>
            <NoticePreview
              draft={draft}
              page={pages.find((page) => page.id === config?.settings.defaultPageId) ?? pages[0]}
            />
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              This is how the notice will look over the page.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold tracking-[-0.02em] text-ink">Showing and scheduled</h2>
        {sorted.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-[#faf8f3] px-5 py-8 text-center text-[13px] text-muted">
            No notices yet. Write one above and it will appear on the screens.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((item) => {
              const scheduled = item.startsAt != null && item.startsAt > now;
              const expired = item.expiresAt != null && item.expiresAt < now;
              const tone = TONES.find((entry) => entry.value === item.tone) ?? TONES[0];
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(32,37,31,0.04)]"
                >
                  <span className={cn('mt-1 h-3 w-3 shrink-0 rounded-full', tone.dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink">{item.title || 'Notice'}</span>
                      <Badge tone={expired ? 'neutral' : scheduled ? 'amber' : 'green'}>
                        {expired ? 'Finished' : scheduled ? 'Scheduled' : 'Live'}
                      </Badge>
                      <span className="text-[11px] font-medium text-muted">
                        {item.durationSec ? `${item.durationSec < 60 ? `${item.durationSec}s` : `${Math.round(item.durationSec / 60)} min`}` : 'Until removed'}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-muted">{item.body}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {targetLabel(item.target, pageName, screenName)} · {STYLES.find((style) => style.value === item.style)?.label}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(item)}>
                      <Pencil size={13} /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void remove(item)} className="hover:text-danger">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NoticePreview({ draft, page }: { draft: Announcement; page?: Page }) {
  const tone = TONES.find((entry) => entry.value === draft.tone) ?? TONES[0];
  const title = draft.title?.trim();
  const body = draft.body.trim() || 'Your message appears here.';

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#141a17]">
      {page ? <PageStage page={page} rounded="rounded-none" className="pointer-events-none absolute inset-0" /> : null}
      {draft.style === 'banner' ? (
        <div className={cn('absolute inset-x-0 top-0 px-4 py-3 text-white', tone.bar)}>
          {title ? <div className="text-[13px] font-bold leading-tight">{title}</div> : null}
          <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/90">{body}</div>
        </div>
      ) : null}

      {draft.style === 'overlay' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-4">
          <div
            className="w-full rounded-xl border-t-4 bg-white px-3 py-3 text-center text-ink shadow-lg"
            style={{ borderTopColor: tone.hex }}
          >
            {title ? <div className="text-[13px] font-bold leading-tight">{title}</div> : null}
            <div className="mt-1 line-clamp-3 text-[11px] leading-snug text-[#525852]">{body}</div>
          </div>
        </div>
      ) : null}

      {draft.style === 'ticker' ? (
        <div className={cn('absolute inset-x-0 bottom-0 flex items-center gap-2 overflow-hidden px-3 py-2.5 text-white', tone.bar)}>
          <span className="text-[11px] font-bold">{title || 'Notice'}</span>
          <span className="truncate text-[11px] text-white/90">{body}</span>
        </div>
      ) : null}

      <div className="absolute bottom-2 left-2 rounded-md bg-black/40 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-white/60">
        Screen preview
      </div>
    </div>
  );
}
