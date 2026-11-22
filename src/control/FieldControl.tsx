import type { Field } from '@shared/types';
import { Input, Label, Select, Textarea, Toggle } from '@/components/ui';
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
          <div className="text-xs font-medium text-slate-300">{field.label}</div>
          {field.help ? <p className="mt-0.5 text-[11px] text-slate-500">{field.help}</p> : null}
        </div>
        <Toggle checked={Boolean(value)} onChange={onChange} label={field.label} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>{field.label}</Label>
      {field.type === 'images' ? (
        <ImagesEditor
          value={(value as { url: string; caption?: string }[]) ?? []}
          onChange={onChange}
        />
      ) : field.type === 'categories' ? (
        <Input
          value={Array.isArray(value) ? value.join(', ') : ''}
          placeholder="Sport, Music"
          onChange={(event) =>
            onChange(
              event.target.value
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean),
            )
          }
        />
      ) : field.type === 'textarea' ? (
        <Textarea
          value={String(value ?? '')}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === 'select' ? (
        <Select value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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
          onChange={(event) => onChange(Number(event.target.value))}
        />
      ) : field.type === 'color' ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value ?? '#000000')}
            onChange={(event) => onChange(event.target.value)}
            className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
          />
          <Input value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} />
        </div>
      ) : field.type === 'timezone' ? (
        <>
          <Input
            list="cb-timezones"
            value={String(value ?? '')}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
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
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.help ? <p className="text-[11px] leading-snug text-slate-500">{field.help}</p> : null}
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-[11px] tabular-nums text-slate-400">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-400"
      />
    </div>
  );
}
