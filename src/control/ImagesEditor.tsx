import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import type { PhotoImage } from '@shared/types';
import { getStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { useAssets } from '@/lib/hooks';
import { Button, IconButton, Input, Label, Select } from '@/components/ui';

export function ImagesEditor({
  value,
  onChange,
}: {
  value: PhotoImage[];
  onChange: (next: PhotoImage[]) => void;
}) {
  const store = getStore();
  const { getToken } = useAuth();
  const assets = useAssets();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (index: number, patch: Partial<PhotoImage>) => {
    onChange(value.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next);
  };

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const asset = await store.uploadImage(file, token);
      await store.saveAsset(asset);
      onChange([...value, { url: asset.url, caption: '' }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload size={13} />
          {busy ? 'Uploading…' : 'Upload'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onChange([...value, { url: '', caption: '' }])}>
          <Plus size={13} />
          URL
        </Button>
        {assets.length ? (
          <Select
            className="h-8 w-auto min-w-36 text-xs"
            defaultValue=""
            onChange={(event) => {
              const asset = assets.find((item) => item.id === event.target.value);
              if (asset) onChange([...value, { url: asset.url, caption: asset.caption ?? '' }]);
              event.target.value = '';
            }}
          >
            <option value="">From library…</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </Select>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      {value.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-4 text-xs text-slate-500">
          <ImagePlus size={15} />
          No photos yet. Upload one or paste a URL.
        </div>
      ) : null}

      <div className="space-y-2">
        {value.map((image, index) => (
          <div key={index} className="rounded-xl border border-white/[0.07] bg-black/20 p-2">
            <div className="flex items-start gap-2">
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-white/5">
                {image.url ? <img src={image.url} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <Input
                  className="h-8 text-xs"
                  placeholder="https://…"
                  value={image.url}
                  onChange={(event) => update(index, { url: event.target.value })}
                />
                <Input
                  className="h-8 text-xs"
                  placeholder="Caption (optional)"
                  value={image.caption ?? ''}
                  onChange={(event) => update(index, { caption: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <IconButton label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowUp size={13} />
                </IconButton>
                <IconButton label="Move down" onClick={() => move(index, 1)} disabled={index === value.length - 1}>
                  <ArrowDown size={13} />
                </IconButton>
                <IconButton label="Remove" onClick={() => remove(index)} className="hover:text-rose-300">
                  <Trash2 size={13} />
                </IconButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label>Caption note</Label>
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Captions sit over the photo and are set per image. Turn them off in the card settings.
        </p>
      </div>
    </div>
  );
}
