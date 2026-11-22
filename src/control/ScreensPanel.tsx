import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, MonitorSmartphone, Plus, RefreshCw, ScanEye, Trash2, Wand2 } from 'lucide-react';
import type { CommandType, Screen } from '@shared/types';
import { slugify } from '@shared/ids';
import { getStore } from '@/lib/store';
import { useScreens } from '@/lib/hooks';
import { useBoard } from '@/lib/board';
import { useNow } from '@/lib/useNow';
import { Badge, Button, EmptyState, Field, IconButton, Input, Section, Select } from '@/components/ui';

const ONLINE_MS = 120_000;

function lastSeenLabel(lastSeen: number | undefined, now: number) {
  if (!lastSeen) return 'Never connected';
  const diff = Math.max(0, now - lastSeen);
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

export function ScreensPanel() {
  const store = getStore();
  const { config } = useBoard();
  const screens = useScreens();
  const now = useNow(15_000);
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pages = config?.pages ?? [];
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const sorted = useMemo(
    () => [...screens].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)),
    [screens],
  );

  const suggestedId = useMemo(() => {
    const base = slugify(name) || 'screen';
    const taken = new Set(screens.map((s) => s.id));
    if (!taken.has(base)) return base;
    let i = 2;
    while (taken.has(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }, [name, screens]);

  const addScreen = async () => {
    const finalId = slugify(id || suggestedId) || suggestedId;
    if (!finalId) return;
    setBusy(true);
    setError(null);
    try {
      if (screens.some((s) => s.id === finalId)) throw new Error('A screen with that ID already exists.');
      await store.saveScreen({ id: finalId, name: name.trim() || finalId, assignedPageId: null, createdAt: Date.now() });
      setName('');
      setId('');
      setIdTouched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that screen.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (screenId: string) => {
    const url = `${origin}/screen/${screenId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(screenId);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError('Could not copy. Select the URL and copy it manually.');
    }
  };

  const command = (screen: Screen, type: CommandType, payload?: unknown) => {
    void store.sendCommand(screen.id, { type, payload, createdAt: Date.now() });
  };

  const remove = async (screen: Screen) => {
    if (!window.confirm(`Remove "${screen.name || screen.id}"? The screen will keep showing its last page.`)) return;
    await store.deleteScreen(screen.id);
  };

  return (
    <div className="space-y-5 pb-10">
      <Section
        title="Add a screen"
        description="Each TV or display needs a unique ID. Open the URL on that device in a full-screen browser."
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Screen name" help="Something like 'Reception TV' or 'Hall screen'.">
            <Input
              value={name}
              placeholder="Reception TV"
              onChange={(e) => {
                setName(e.target.value);
                if (!idTouched) setId(slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="URL slug" help="Used in the web address. Letters, numbers and dashes only.">
            <Input
              value={id || suggestedId}
              onChange={(e) => {
                setIdTouched(true);
                setId(e.target.value);
              }}
            />
          </Field>
          <div className="flex items-end">
            <Button variant="primary" onClick={() => void addScreen()} disabled={busy}>
              <Plus size={14} /> Add screen
            </Button>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </Section>

      {sorted.length === 0 ? (
        <EmptyState
          title="No screens yet"
          body="Add a screen above, then open its URL on your TV or display in a kiosk-mode browser."
          action={
            <Button variant="primary" onClick={() => void addScreen()}>
              <MonitorSmartphone size={14} /> Add a screen
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((screen) => {
            const online = Boolean(screen.lastSeen && now.getTime() - screen.lastSeen < ONLINE_MS);
            const url = `${origin}/screen/${screen.id}`;
            return (
              <div key={screen.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-stone-900">{screen.name || screen.id}</span>
                      <Badge tone={online ? 'green' : 'neutral'}>{online ? '● Online' : 'Offline'}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-stone-400">
                      {screen.id} · {lastSeenLabel(screen.lastSeen, now.getTime())}
                      {screen.meta?.width ? ` · ${screen.meta.width}×${screen.meta.height}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton label="Copy URL" onClick={() => void copy(screen.id)}>
                      {copied === screen.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </IconButton>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                      title="Open screen"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <IconButton label="Remove screen" onClick={() => void remove(screen)} className="hover:text-red-500">
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,13rem)_1fr]">
                  <Field label="Show this page" help="Leave blank to use rotation or the default page.">
                    <Select
                      value={screen.assignedPageId ?? ''}
                      onChange={(e) => void store.saveScreen({ ...screen, assignedPageId: e.target.value || null })}
                    >
                      <option value="">Rotation / default</option>
                      {pages.map((page) => (
                        <option key={page.id} value={page.id}>{page.name}</option>
                      ))}
                    </Select>
                  </Field>
                  <div>
                    <div className="mb-1.5 text-sm font-medium text-stone-700">Remote controls</div>
                    <div className="flex flex-wrap gap-1.5">
                      <Select
                        className="h-8 w-auto text-xs"
                        value=""
                        onChange={(e) => {
                          const pageId = e.target.value;
                          if (pageId) command(screen, 'goto', { pageId });
                          e.target.value = '';
                        }}
                      >
                        <option value="">Jump to page…</option>
                        {pages.map((page) => (
                          <option key={page.id} value={page.id}>{page.name}</option>
                        ))}
                      </Select>
                      <Button size="sm" onClick={() => command(screen, 'reload')}>
                        <RefreshCw size={12} /> Reload
                      </Button>
                      <Button size="sm" onClick={() => command(screen, 'identify')}>
                        <ScanEye size={12} /> Identify
                      </Button>
                      <Button size="sm" onClick={() => command(screen, 'blank')}>
                        Blank 1 min
                      </Button>
                      <Button size="sm" onClick={() => command(screen, 'clear-cache')}>
                        <Wand2 size={12} /> Clear cache
                      </Button>
                    </div>
                  </div>
                </div>

                {/* URL bar */}
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2">
                  <code className="min-w-0 flex-1 truncate text-xs text-stone-500">{url}</code>
                  <Button size="sm" variant="ghost" onClick={() => void copy(screen.id)}>
                    {copied === screen.id ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
