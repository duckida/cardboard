import { useRef, useState } from 'react';
import { GripVertical, ImagePlus, Link2, Loader2, Upload, X } from 'lucide-react';
import type { PhotoImage } from '@shared/types';
import { useAssets } from '@/lib/hooks';
import { cn } from '@/lib/cn';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { useImageUploader } from './common';

function DropSurface({
  busy,
  multiple,
  onFiles,
  compact,
}: {
  busy: boolean;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length) onFiles(files);
      }}
      className={cn(
        'rounded-2xl border-2 border-dashed transition',
        compact ? 'p-3' : 'p-4',
        over ? 'border-accent bg-accent-soft' : 'border-line bg-[#faf8f3] hover:border-[#d6d0c2]',
      )}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full items-center gap-3 text-left disabled:opacity-60"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent shadow-sm">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-ink">
            {busy ? 'Uploading…' : multiple ? 'Add photos' : 'Add a photo'}
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-muted">
            Drag a photo here, or click to choose one.
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onFiles(files);
          event.target.value = '';
        }}
      />
    </div>
  );
}

function PhotoLibrary({ onPick }: { onPick: (url: string, caption?: string) => void }) {
  const assets = useAssets();
  if (!assets.length) return null;
  const recent = [...assets].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 12);

  return (
    <div className="space-y-2">
      <div className="text-[12px] font-semibold text-muted">Or choose a photo you’ve used before</div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {recent.map((asset) => (
          <button
            key={asset.id}
            type="button"
            title={asset.name}
            onClick={() => onPick(asset.url, asset.caption ?? '')}
            className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-[#f3f0e9] transition hover:border-accent/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15"
          >
            <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" loading="lazy" />
            <span className="absolute inset-0 hidden items-center justify-center bg-accent/70 text-[11px] font-semibold text-white group-hover:flex">
              Use photo
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SinglePhotoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const { upload, busy } = useImageUploader();
  const [showLink, setShowLink] = useState(false);

  const add = async (files: File[]) => {
    const assets = await upload(files.slice(0, 1));
    if (assets[0]) onChange(assets[0].url);
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-line bg-[#f3f0e9]">
          <img src={value} alt="" className="aspect-video w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-2.5 text-[12px] font-semibold text-ink shadow-sm">
              <Upload size={13} /> Replace
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.length) void add(files);
                  event.target.value = '';
                }}
              />
            </label>
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange('')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-muted shadow-sm transition hover:text-danger"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <DropSurface busy={busy} onFiles={(files) => void add(files)} />
      )}

      <PhotoLibrary onPick={(url) => onChange(url)} />

      <button
        type="button"
        onClick={() => setShowLink((value) => !value)}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted transition hover:text-ink"
      >
        <Link2 size={13} /> {showLink ? 'Hide web address' : 'Use a web address instead'}
      </button>
      {showLink ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://…"
          type="url"
        />
      ) : null}
    </div>
  );
}

export function PhotoListField({
  value,
  onChange,
}: {
  value: PhotoImage[];
  onChange: (next: PhotoImage[]) => void;
}) {
  const { upload, busy } = useImageUploader();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [link, setLink] = useState('');
  const [showLink, setShowLink] = useState(false);

  const append = (items: PhotoImage[]) => onChange([...value, ...items]);
  const update = (index: number, patch: Partial<PhotoImage>) =>
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const addFiles = async (files: File[]) => {
    const assets = await upload(files);
    if (assets.length) {
      append(assets.map((asset) => ({ url: asset.url, caption: asset.caption ?? '' })));
    }
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <DropSurface busy={busy} multiple onFiles={(files) => void addFiles(files)} />

      {value.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-[#faf8f3] px-3 py-3 text-[12px] text-muted">
          <ImagePlus size={16} /> Photos you add will take turns on the screen.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {value.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              draggable
              onDragStart={(event) => {
                setDragIndex(index);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex != null) move(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={cn(
                'group overflow-hidden rounded-xl border bg-white transition',
                dragIndex === index ? 'border-accent opacity-50' : 'border-line',
              )}
            >
              <div className="relative aspect-[4/3] bg-[#f3f0e9]">
                {image.url ? (
                  <img src={image.url} alt={image.caption ?? ''} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center p-2 text-center text-[11px] text-muted">
                    No picture yet
                  </div>
                )}
                <span className="absolute left-1.5 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-black/55 px-1 text-[10px] font-semibold text-white">
                  {index + 1}
                </span>
                <div className="absolute right-1.5 top-1.5 flex gap-1">
                  <span className="inline-flex h-6 w-6 cursor-grab items-center justify-center rounded-md bg-white/90 text-muted shadow-sm active:cursor-grabbing">
                    <GripVertical size={12} />
                  </span>
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => remove(index)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-muted shadow-sm transition hover:text-danger"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div className="p-1.5">
                <Textarea
                  value={image.caption ?? ''}
                  onChange={(event) => update(index, { caption: event.target.value })}
                  placeholder="Caption (optional)"
                  rows={2}
                  className="min-h-0 resize-none border-0 bg-transparent px-1.5 py-1 text-[12px] focus:ring-0"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <PhotoLibrary onPick={(url, caption) => append([{ url, caption }])} />

      <button
        type="button"
        onClick={() => setShowLink((value) => !value)}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted transition hover:text-ink"
      >
        <Link2 size={13} /> {showLink ? 'Hide web address' : 'Add a photo from a web address'}
      </button>
      {showLink ? (
        <div className="flex gap-2">
          <Input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://…"
            type="url"
          />
          <Button
            size="sm"
            onClick={() => {
              if (!link.trim()) return;
              append([{ url: link.trim(), caption: '' }]);
              setLink('');
            }}
          >
            Add
          </Button>
        </div>
      ) : null}

      {value.length > 1 ? (
        <Field help="Drag a photo to change the order.">
          <div className="text-[12px] text-muted">The first photo appears first.</div>
        </Field>
      ) : null}
    </div>
  );
}
