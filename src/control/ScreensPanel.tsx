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
    const taken = new Set(screens.map((screen) => screen.id));
    if (!taken.has(base)) return base;
    let index = 2;
    while (taken.has(`${base}-${index}`)) index += 1;
    return `${base}-${index}`;
  }, [name, screens]);

  const addScreen = async () => {
    const finalId = slugify(id || suggestedId) || suggestedId;
    if (!finalId) return;
    setBusy(true);
    setError(null);
    try {
      if (screens.some((screen) => screen.id === finalId)) {
        throw new Error('A screen with that id already exists.');
      }
      await store.saveScreen({
        id: finalId,
        name: name.trim() || finalId,
        assignedPageId: null,
        createdAt: Date.now(),
      });
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
    if (!window.confirm(`Remove “${screen.name || screen.id}”? The screen will keep showing its last page.`)) return;
    await store.deleteScreen(screen.id);
  };

  return (
    <div className="space-y-4">
      <Section
        title="Add a screen"
        description="Give each TV a short id. Open the URL below on that device and add it to the browser's kiosk startup."
      >
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Name">
            <Input
              value={name}
              placeholder="Reception TV"
              onChange={(event) => {
                setName(event.target.value);
                if (!idTouched) setId(slugify(event.target.value));
              }}
            />
          </Field>
          <Field label="Screen id" help="Used in the public URL. Letters, numbers and dashes.">
            <Input
              value={id || suggestedId}
              onChange={(event) => {
                setIdTouched(true);
                setId(event.target.value);
              }}
            />
          </Field>
          <div className="flex items-end">
            <Button variant="primary" onClick={() => void addScreen()} disabled={busy}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </div>
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </Section>

      {sorted.length === 0 ? (
        <EmptyState
          title="No screens yet"
          body="Screens appear here after they load their URL for the first time. You can also add one above to get its link."
          action={
            <Button onClick={() => void addScreen()}>
              <MonitorSmartphone size={14} /> Add a screen
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((screen) => {
            const online = Boolean(screen.lastSeen && now.getTime() - screen.lastSeen < ONLINE_MS);
            const url = `${origin}/screen/${screen.id}`;
            return (
              <div key={screen.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-100">{screen.name || screen.id}</span>
                      <Badge tone={online ? 'green' : 'neutral'}>{online ? 'Online' : 'Offline'}</Badge>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      <code className="text-slate-400">{screen.id}</code> · {lastSeenLabel(screen.lastSeen, now.getTime())}
                      {screen.meta?.width ? ` · ${screen.meta.width}×${screen.meta.height}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <IconButton label="Copy screen URL" onClick={() => void copy(screen.id)}>
                      {copied === screen.id ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                    </IconButton>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                      title="Open screen"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <IconButton label="Remove screen" onClick={() => void remove(screen)} className="hover:text-rose-300">
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,14rem)_auto_1fr]">
                  <Field label="Assigned page">
                    <Select
                      value={screen.assignedPageId ?? ''}
                      onChange={(event) =>
                        void store.saveScreen({ ...screen, assignedPageId: event.target.value || null })
                      }
                    >
                      <option value="">Rotation / start page</option>
                      {pages.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div className="flex items-end">
                    <Select
                      className="w-auto"
                      value=""
                      onChange={(event) => {
                        const pageId = event.target.value;
                        if (pageId) command(screen, 'goto', { pageId });
                        event.target.value = '';
                      }}
                    >
                      <option value="">Go to page…</option>
                      {pages.map((page) => (
                        <option key={page.id} value={page.id}>
                          {page.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex flex-wrap items-end justify-start gap-1.5 sm:justify-end">
                    <Button size="sm" onClick={() => command(screen, 'reload')} title="Reload the browser">
                      <RefreshCw size={13} /> Reload
                    </Button>
                    <Button size="sm" onClick={() => command(screen, 'identify')} title="Show this screen's name">
                      <ScanEye size={13} /> Identify
                    </Button>
                    <Button size="sm" onClick={() => command(screen, 'blank')} title="Blank for one minute">
                      Blank
                    </Button>
                    <Button size="sm" onClick={() => command(screen, 'clear-cache')} title="Clear cached files and reload">
                      <Wand2 size={13} /> Clear cache
                    </Button>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 rounded-lg bg-black/25 px-2 py-1.5">
                  <code className="min-w-0 flex-1 truncate text-[11px] text-slate-400">{url}</code>
                  <Button size="sm" variant="ghost" onClick={() => void copy(screen.id)}>
                    {copied === screen.id ? 'Copied' : 'Copy'}
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
