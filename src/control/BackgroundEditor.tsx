import { useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import type { Background } from '@shared/types';
import { getStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Button, Field, Input, Select } from '@/components/ui';
import { Slider } from './FieldControl';

export function BackgroundEditor({
  value,
  onChange,
}: {
  value: Background;
  onChange: (next: Background) => void;
}) {
  const store = getStore();
  const { getToken } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const token = await getToken();
      const asset = await store.uploadImage(file, token);
      await store.saveAsset(asset);
      onChange({ type: 'image', url: asset.url, dim: 0.35, blur: 0, fit: 'cover' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Field label="Background">
        <Select
          value={value.type}
          onChange={(event) => {
            const type = event.target.value as Background['type'];
            if (type === 'solid') onChange({ type: 'solid', color: '#0b1020' });
            if (type === 'gradient') onChange({ type: 'gradient', from: '#0b1020', to: '#1b2748', angle: 160 });
            if (type === 'image') onChange({ type: 'image', url: '', dim: 0.35, blur: 0, fit: 'cover' });
          }}
        >
          <option value="solid">Solid colour</option>
          <option value="gradient">Gradient</option>
          <option value="image">Image</option>
        </Select>
      </Field>

      {value.type === 'solid' ? (
        <Field label="Colour">
          <div className="flex gap-2">
            <input
              type="color"
              value={value.color}
              onChange={(event) => onChange({ ...value, color: event.target.value })}
              className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
            />
            <Input value={value.color} onChange={(event) => onChange({ ...value, color: event.target.value })} />
          </div>
        </Field>
      ) : null}

      {value.type === 'gradient' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <input
                type="color"
                value={value.from}
                onChange={(event) => onChange({ ...value, from: event.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
              />
            </Field>
            <Field label="To">
              <input
                type="color"
                value={value.to}
                onChange={(event) => onChange({ ...value, to: event.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
              />
            </Field>
          </div>
          <Slider label="Angle" value={value.angle} min={0} max={360} onChange={(angle) => onChange({ ...value, angle })} suffix="°" />
        </>
      ) : null}

      {value.type === 'image' ? (
        <>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
              <Upload size={13} />
              {busy ? 'Uploading…' : 'Upload'}
            </Button>
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
            {!value.url ? (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <ImagePlus size={13} /> or paste a URL
              </span>
            ) : null}
          </div>
          <Input
            placeholder="https://…"
            value={value.url}
            onChange={(event) => onChange({ ...value, url: event.target.value })}
          />
          <Slider label="Dim" value={Math.round(value.dim * 100)} min={0} max={100} onChange={(dim) => onChange({ ...value, dim: dim / 100 })} suffix="%" />
          <Slider label="Blur" value={value.blur} min={0} max={40} onChange={(blur) => onChange({ ...value, blur })} suffix="px" />
          <Field label="Fit">
            <Select
              value={value.fit}
              onChange={(event) => onChange({ ...value, fit: event.target.value as 'cover' | 'contain' })}
            >
              <option value="cover">Fill</option>
              <option value="contain">Contain</option>
            </Select>
          </Field>
        </>
      ) : null}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
