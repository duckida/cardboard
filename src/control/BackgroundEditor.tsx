import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
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
    <div className="space-y-4">
      <Field label="Type">
        <Select
          value={value.type}
          onChange={(e) => {
            const type = e.target.value as Background['type'];
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
              onChange={(e) => onChange({ ...value, color: e.target.value })}
              className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
            />
            <Input value={value.color} onChange={(e) => onChange({ ...value, color: e.target.value })} />
          </div>
        </Field>
      ) : null}

      {value.type === 'gradient' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start colour">
              <input
                type="color"
                value={value.from}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
              />
            </Field>
            <Field label="End colour">
              <input
                type="color"
                value={value.to}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
                className="h-9 w-full cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
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
              {busy ? 'Uploading…' : 'Upload photo'}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </div>
          <Input
            placeholder="Or paste an image URL here"
            value={value.url}
            onChange={(e) => onChange({ ...value, url: e.target.value })}
          />
          <Slider label="Darkness" value={Math.round(value.dim * 100)} min={0} max={100} onChange={(dim) => onChange({ ...value, dim: dim / 100 })} suffix="%" />
          <Slider label="Blur" value={value.blur} min={0} max={40} onChange={(blur) => onChange({ ...value, blur })} suffix="px" />
          <Field label="Fit">
            <Select value={value.fit} onChange={(e) => onChange({ ...value, fit: e.target.value as 'cover' | 'contain' })}>
              <option value="cover">Fill screen</option>
              <option value="contain">Show whole image</option>
            </Select>
          </Field>
        </>
      ) : null}

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
