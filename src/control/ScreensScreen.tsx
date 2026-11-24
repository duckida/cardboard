import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  ScanEye,
  Trash2,
  Wand2,
} from 'lucide-react';
import type { CommandType, Screen } from '@shared/types';
import { slugify } from '@shared/ids';
import { getStore } from '@/lib/store';
import { useScreens } from '@/lib/hooks';
import { useBoard } from '@/lib/board';
import { useNow } from '@/lib/useNow';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  Panel,
  SectionHeading,
  Select,
} from '@/components/ui';
import { useFeedback } from './Feedback';
import { MenuButton, MenuDivider, MenuItem } from './Menu';
import { isOnline, relativeSeen } from './common';

export function ScreensScreen() {
  const store = getStore();
  const { config } = useBoard();
  const screens = useScreens();
  const now = useNow(15_000);
  const { confirm, toast } = useFeedback();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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
    const id = suggestedId;
    setBusy(true);
    try {
      await store.saveScreen({
        id,
        name: name.trim() || 'New screen',
        assignedPageId: null,
        createdAt: Date.now(),
      });
      toast(`${name.trim() || 'Screen'} was added.`, 'success');
      setName('');
      setAddOpen(false);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add that screen.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (screen: Screen) => {
    const url = `${origin}/screen/${screen.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(screen.id);
      window.setTimeout(() => setCopied((value) => (value === screen.id ? null : value)), 1800);
      toast('Link copied. Open it on the TV.', 'success');
    } catch {
      toast(`Copy this link: ${url}`, 'error');
    }
  };

  const command = (screen: Screen, type: CommandType, payload?: unknown) => {
    void store.sendCommand(screen.id, { type, payload, createdAt: Date.now() });
  };

  const remove = async (screen: Screen) => {
    const ok = await confirm({
      title: `Remove “${screen.name || screen.id}”?`,
      body: 'The TV will keep showing what is on it now, but it will stop appearing here.',
      confirmLabel: 'Remove screen',
      destructive: true,
    });
    if (!ok) return;
    await store.deleteScreen(screen.id);
    toast('Screen removed.', 'success');
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7">
      <SectionHeading
        title="Your screens"
        description="Each TV or display opens its own web link. Add a screen, then open that link on the device in full-screen mode."
        action={
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add a screen
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<MonitorSmartphone size={30} />}
          title="No screens yet"
          body="Add your first screen to get a link you can open on a TV, Raspberry Pi or any display."
          action={
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add a screen
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {sorted.map((screen) => {
            const online = isOnline(screen.lastSeen, now.getTime());
            const url = `${origin}/screen/${screen.id}`;
            return (
              <Panel key={screen.id} className="rounded-3xl">
                <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4f1ea] text-muted">
                    <MonitorSmartphone size={20} />
                    <span
                      className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${online ? 'bg-emerald-500' : 'bg-[#c9c4b8]'}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[15px] font-semibold text-ink">{screen.name || screen.id}</h3>
                      <Badge tone={online ? 'green' : 'neutral'}>{relativeSeen(screen.lastSeen, now.getTime())}</Badge>
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted">
                      {screen.meta?.width ? `${screen.meta.width} × ${screen.meta.height} · ` : ''}
                      {screen.id}
                    </div>
                  </div>
                  <MenuButton label={`Options for ${screen.name || screen.id}`}>
                    <MenuItem icon={<ExternalLink size={15} />} onSelect={() => window.open(url, '_blank', 'noopener')}>
                      Open this screen
                    </MenuItem>
                    <MenuItem icon={<ScanEye size={15} />} onSelect={() => command(screen, 'identify')}>
                      Show its name on the TV
                    </MenuItem>
                    <MenuItem icon={<RefreshCw size={15} />} onSelect={() => command(screen, 'reload')}>
                      Reload
                    </MenuItem>
                    <MenuItem icon={<Wand2 size={15} />} onSelect={() => command(screen, 'blank')}>
                      Blank for a minute
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem icon={<Trash2 size={15} />} danger onSelect={() => void remove(screen)}>
                      Remove screen
                    </MenuItem>
                  </MenuButton>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <Field label="What should this screen show?">
                    <Select
                      value={screen.assignedPageId ?? ''}
                      onChange={(event) =>
                        void store.saveScreen({ ...screen, assignedPageId: event.target.value || null })
                      }
                    >
                      <option value="">Follow the page loop</option>
                      {pages.map((page) => (
                        <option key={page.id} value={page.id}>
                          Always show “{page.name}”
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <div>
                    <div className="mb-1.5 text-[13px] font-semibold text-ink">Link for this screen</div>
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-[#faf8f3] py-1.5 pl-3 pr-1.5">
                      <code className="min-w-0 flex-1 truncate text-[12px] text-muted">{url}</code>
                      <Button size="sm" variant="ghost" onClick={() => void copyLink(screen)}>
                        {copied === screen.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copied === screen.id ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => window.open(url, '_blank', 'noopener')}>
                      <ExternalLink size={13} /> Open
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void copyLink(screen)}>
                      <Copy size={13} /> Copy link
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => command(screen, 'identify')}>
                      <ScanEye size={13} /> Show name
                    </Button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Panel className="flex items-start gap-3.5 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Wand2 size={18} />
        </div>
        <div>
          <div className="text-[13px] font-semibold text-ink">Setting up a new TV?</div>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            Add a screen here, copy its link, and open that link on the TV in a full-screen browser. The screen will
            appear as online within a minute. You can then choose a page for it, reload it or blank it from this
            page.
          </p>
        </div>
      </Panel>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a screen"
        description="Give it a name you will recognise, like “Reception TV”."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void addScreen()} disabled={busy}>
              {busy ? 'Adding…' : 'Add screen'}
            </Button>
          </>
        }
      >
        <Field label="Screen name">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Reception TV"
            autoFocus
            maxLength={60}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void addScreen();
            }}
          />
        </Field>
        <div className="mt-3 rounded-xl bg-[#faf8f3] px-3 py-2.5 text-[12px] leading-relaxed text-muted">
          Its link will be <span className="font-medium text-ink">/screen/{suggestedId}</span>. You can copy it after
          adding the screen.
        </div>
      </Modal>
    </div>
  );
}
