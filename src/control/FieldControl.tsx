import type { Field } from '@shared/types';
import { Input, Select, Textarea, Toggle } from '@/components/ui';
import { ImagesEditor } from './ImagesEditor';

const TIMEZONES = [
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export function FieldControl({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.type === 'toggle') {
    return (
      <div className="flex items-center justify-between gap-3 py-0.5">
        <div>
          <div className="text-sm font-medium text-stone-700">{field.label}</div>
          {field.help ? <p className="mt-0.5 text-xs text-stone-500">{field.help}</p> : null}
        </div>
        <Toggle checked={Boolean(value)} onChange={onChange} label={field.label} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium text-stone-700">{field.label}</div>
      {field.type === 'images' ? (
        <ImagesEditor
          value={(value as { url: string; caption?: string }[]) ?? []}
          onChange={onChange}
        />
      ) : field.type === 'categories' ? (
        <Input
          value={Array.isArray(value) ? value.join(', ') : ''}
          placeholder="Sport, Music"
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      ) : field.type === 'textarea' ? (
        <Textarea
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === 'select' ? (
        <Select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ) : field.type === 'number' ? (
        <Input
          type="number"
          value={Number.isFinite(Number(value)) ? Number(value) : 0}
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      ) : field.type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value ?? '#000000')}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-stone-200 bg-white p-1"
          />
          <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
        </div>
      ) : field.type === 'timezone' ? (
        <>
          <Input
            list="cb-timezones"
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          <datalist id="cb-timezones">
            {TIMEZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </>
      ) : (
        <Input
          type={field.type === 'url' ? 'url' : 'text'}
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.help ? <p className="text-xs leading-snug text-stone-400">{field.help}</p> : null}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <span className="text-sm tabular-nums text-stone-500">
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
