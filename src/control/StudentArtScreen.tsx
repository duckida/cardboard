import { useRef, useState } from 'react';
import { ImagePlus, LayoutGrid, Loader2, LogOut, Trash2, Upload } from 'lucide-react';
import type { StudentArtItem } from '@shared/types';
import { newId } from '@shared/ids';
import { useAuth } from '@/lib/auth';
import { useStudentArt } from '@/lib/hooks';
import { getStore } from '@/lib/store';
import { Button } from '@/components/ui';
import { useFeedback } from './Feedback';

export function StudentArtScreen() {
  const { signOut, email } = useAuth();
  const { toast, confirm } = useFeedback();
  const items = useStudentArt();
  const store = getStore();
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const sorted = [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  const uploadFiles = async (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      toast('Please choose a photo file.', 'error');
      return;
    }
    setBusy(true);
    try {
      const token = await getToken();
      for (const file of images) {
        const asset = await store.uploadImage(file, token);
        const item: StudentArtItem = {
          id: newId('art'),
          url: asset.url,
          caption: '',
          name: asset.name,
          width: asset.width,
          height: asset.height,
          bytes: asset.bytes,
          cdnId: asset.cdnId,
          createdAt: Date.now(),
        };
        await store.saveStudentArt(item);
      }
      toast(images.length === 1 ? 'Photo added.' : `${images.length} photos added.`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That photo could not be uploaded.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const updateCaption = async (item: StudentArtItem, caption: string) => {
    try {
      await store.saveStudentArt({ ...item, caption });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save that caption.', 'error');
    }
  };

  const remove = async (item: StudentArtItem) => {
    const ok = await confirm({
      title: 'Remove this artwork?',
      body: 'The photo and caption will be removed from the Student Art card.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await store.deleteStudentArt(item.id);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not remove that artwork.', 'error');
    }
  };

  return (
    <div className="cb-control min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-[0_6px_18px_rgba(15,118,110,0.22)]">
            <LayoutGrid size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-semibold leading-tight tracking-[-0.01em] text-ink">Student Art</div>
            <div className="truncate text-[11px] font-medium text-muted">{email || 'Art teacher'}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <LogOut size={15} /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">Student artwork</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Upload photos of student art and add captions. They will appear in the Student Art card on the screen.
            </p>
          </div>
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length) void uploadFiles(files);
                event.target.value = '';
              }}
            />
            <Button variant="primary" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {busy ? 'Uploading…' : 'Add photos'}
            </Button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-line bg-white/60 px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <ImagePlus size={28} />
            </div>
            <h2 className="font-display text-lg font-semibold text-ink">No artwork yet</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Add photos of student art. Each photo can have a caption that will be shown on the screen.
            </p>
            <Button variant="primary" className="mt-5" onClick={() => inputRef.current?.click()} disabled={busy}>
              <Upload size={16} /> Add photos
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((item) => (
              <StudentArtItemCard key={item.id} item={item} onSave={updateCaption} onRemove={remove} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StudentArtItemCard({
  item,
  onSave,
  onRemove,
}: {
  item: StudentArtItem;
  onSave: (item: StudentArtItem, caption: string) => Promise<void>;
  onRemove: (item: StudentArtItem) => Promise<void>;
}) {
  const [caption, setCaption] = useState(item.caption ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = caption !== (item.caption ?? '');

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await onSave(item, caption);
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_2px_4px_rgba(32,37,31,0.04),0_10px_30px_rgba(32,37,31,0.04)]">
      <div className="relative aspect-[4/3] bg-[#f3f0e9]">
        <img src={item.url} alt={item.caption || 'Student artwork'} className="h-full w-full object-cover" loading="lazy" />
        <button
          type="button"
          aria-label="Remove artwork"
          onClick={() => void onRemove(item)}
          className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-muted shadow-sm transition hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="space-y-2 p-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-muted">Caption</span>
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            onBlur={() => void save()}
            placeholder="Add a caption for this artwork"
            rows={2}
            className="w-full resize-none rounded-xl border border-line bg-[#faf8f3] px-3 py-2 text-[13px] leading-relaxed text-ink outline-none transition placeholder:text-muted/70 focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
          />
        </label>
        {dirty ? (
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save caption'}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
