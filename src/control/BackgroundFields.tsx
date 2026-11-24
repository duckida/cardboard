import type { Background } from '@shared/types';
import { Field, Input, Segmented, Select, Slider } from '@/components/ui';
import { SinglePhotoField } from './PhotoFields';

const SWATCHES = ['#0b1020', '#10241f', '#1b2748', '#3f3a5c', '#7a4a2b', '#f4f1ea'];

export function BackgroundFields({
  value,
  onChange,
}: {
  value: Background;
  onChange: (next: Background) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Background style">
        <Segmented
          value={value.type}
          onChange={(type) => {
            if (type === 'solid') onChange({ type: 'solid', color: '#0b1020' });
            if (type === 'gradient') onChange({ type: 'gradient', from: '#0b1020', to: '#1b2748', angle: 160 });
            if (type === 'image') onChange({ type: 'image', url: '', dim: 0.35, blur: 0, fit: 'cover' });
          }}
          ariaLabel="Background style"
          options={[
            { value: 'solid', label: 'Colour' },
            { value: 'gradient', label: 'Gradient' },
            { value: 'image', label: 'Photo' },
          ]}
        />
      </Field>

      {value.type === 'solid' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Use ${color}`}
                onClick={() => onChange({ ...value, color })}
                className="h-9 w-9 rounded-xl border border-black/10 shadow-sm transition hover:scale-105"
                style={{ background: color }}
              />
            ))}
          </div>
          <Field label="Or choose a colour">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value.color}
                onChange={(event) => onChange({ ...value, color: event.target.value })}
                className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
                aria-label="Background colour"
              />
              <Input value={value.color} onChange={(event) => onChange({ ...value, color: event.target.value })} />
            </div>
          </Field>
        </div>
      ) : null}

      {value.type === 'gradient' ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input
                type="color"
                value={value.from}
                onChange={(event) => onChange({ ...value, from: event.target.value })}
                className="h-10 w-full cursor-pointer rounded-lg border border-line bg-white p-1"
              />
            </Field>
            <Field label="To">
              <input
                type="color"
                value={value.to}
                onChange={(event) => onChange({ ...value, to: event.target.value })}
                className="h-10 w-full cursor-pointer rounded-lg border border-line bg-white p-1"
              />
            </Field>
          </div>
          <Slider
            label="Direction"
            value={value.angle}
            min={0}
            max={360}
            step={5}
            onChange={(angle) => onChange({ ...value, angle })}
            suffix="°"
          />
        </>
      ) : null}

      {value.type === 'image' ? (
        <>
          <SinglePhotoField value={value.url} onChange={(url) => onChange({ ...value, url })} />
          <Slider
            label="Darken the photo"
            value={Math.round(value.dim * 100)}
            min={0}
            max={100}
            onChange={(dim) => onChange({ ...value, dim: dim / 100 })}
            suffix="%"
          />
          <Slider
            label="Blur"
            value={value.blur}
            min={0}
            max={40}
            onChange={(blur) => onChange({ ...value, blur })}
            suffix="px"
          />
          <Field label="How it fits">
            <Select
              value={value.fit}
              onChange={(event) => onChange({ ...value, fit: event.target.value as 'cover' | 'contain' })}
            >
              <option value="cover">Fill the screen</option>
              <option value="contain">Show the whole photo</option>
            </Select>
          </Field>
        </>
      ) : null}
    </div>
  );
}
