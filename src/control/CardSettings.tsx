import { useState, type ReactNode } from 'react';
import {
  CalendarDays,
  Clock,
  CloudSun,
  Copy,
  Frame,
  Image,
  Images,
  MapPin,
  Quote,
  Search,
  Timer,
  Trash2,
  Type,
  Video,
} from 'lucide-react';
import type { Card, PhotoImage } from '@shared/types';
import { CARD_DEFS } from '@/cards/registry';
import {
  Button,
  Field,
  Input,
  Segmented,
  Select,
  Textarea,
  Toggle,
  ToggleRow,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { useFeedback } from './Feedback';
import { MenuButton, MenuDivider, MenuItem } from './Menu';
import { PhotoListField, SinglePhotoField } from './PhotoFields';
import { cardKind, cardLabel, cardSummary } from './common';

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

function SettingsSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      {title ? (
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.1em] text-muted">{title}</h3>
          {description ? <p className="mt-1 text-[12px] leading-relaxed text-muted">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Advanced({ children, label = 'More options' }: { children: ReactNode; label?: string }) {
  return (
    <details className="group rounded-2xl border border-line bg-[#faf8f3] px-3.5 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[12px] font-semibold text-muted transition hover:text-ink">
        {label}
        <span className="text-[16px] leading-none transition group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

export function CardSettings({
  card,
  onUpdate,
  onDuplicate,
  onDelete,
  onOpenSettings,
  onClose,
}: {
  card: Card;
  onUpdate: (fn: (card: Card) => void) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenSettings: () => void;
  onClose?: () => void;
}) {
  const def = CARD_DEFS[card.type];
  const Icon = def?.icon ?? Type;
  const set = (key: string, value: unknown) => onUpdate((draft) => { draft.config[key] = value; });
  const media = ['photo', 'image', 'video', 'iframe'].includes(card.type);

  return (
    <div className="space-y-6 pb-2">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold leading-tight tracking-[-0.02em] text-ink">
            {cardKind(card)}
          </h2>
          <p className="mt-0.5 truncate text-[12px] text-muted">
            {cardLabel(card) !== cardKind(card) ? cardLabel(card) : cardSummary(card)}
          </p>
        </div>
        <MenuButton label="Item options">
          <MenuItem icon={<Copy size={15} />} onSelect={onDuplicate}>
            Duplicate
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={<Trash2 size={15} />} danger onSelect={onDelete}>
            Remove from page
          </MenuItem>
        </MenuButton>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-[#f1eee7] hover:text-ink"
            aria-label="Close settings"
          >
            ×
          </button>
        ) : null}
      </div>

      <SettingsSection>
        <CardContentFields
          card={card}
          set={set}
          onUpdate={onUpdate}
          onOpenSettings={onOpenSettings}
        />
      </SettingsSection>

      <SettingsSection title="On the page">
        <ToggleRow
          label="Show on screen"
          description="Turn off to keep it on the page but hide it."
          checked={card.visible}
          onChange={(visible) => onUpdate((draft) => { draft.visible = visible; })}
        />
        {media ? (
          <ToggleRow
            label="Fill the whole screen"
            description="Edge to edge, on top of the page background."
            checked={Boolean(card.fullscreen)}
            onChange={(fullscreen) => onUpdate((draft) => { draft.fullscreen = fullscreen; })}
          />
        ) : null}
      </SettingsSection>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button variant="secondary" size="sm" onClick={onDuplicate}>
          <Copy size={14} /> Duplicate
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 size={14} /> Remove
        </Button>
      </div>
    </div>
  );
}

function CardContentFields({
  card,
  set,
  onUpdate,
  onOpenSettings,
}: {
  card: Card;
  set: (key: string, value: unknown) => void;
  onUpdate: (fn: (card: Card) => void) => void;
  onOpenSettings: () => void;
}) {
  const cfg = card.config ?? {};
  const def = CARD_DEFS[card.type];

  switch (card.type) {
    case 'clock':
      return (
        <>
          <Field label="Label" help="Optional. Shown above the time.">
            <Input value={cfg.label ?? ''} onChange={(event) => set('label', event.target.value)} placeholder="e.g. Good morning" />
          </Field>
          <Field label="Time style">
            <Segmented
              value={cfg.format === '12h' ? '12h' : '24h'}
              onChange={(value) => set('format', value)}
              ariaLabel="Time style"
              options={[
                { value: '24h', label: '24-hour' },
                { value: '12h', label: '12-hour' },
              ]}
            />
          </Field>
          <ToggleRow
            label="Show the date"
            checked={Boolean(cfg.showDate)}
            onChange={(value) => set('showDate', value)}
          />
          <ToggleRow
            label="Show seconds"
            checked={Boolean(cfg.showSeconds)}
            onChange={(value) => set('showSeconds', value)}
          />
          <ToggleRow
            label="Analog face"
            description="A traditional round clock."
            checked={Boolean(cfg.analog)}
            onChange={(value) => set('analog', value)}
          />
          <Advanced>
            <Field label="Date style">
              <Segmented
                value={cfg.dateStyle === 'short' ? 'short' : 'long'}
                onChange={(value) => set('dateStyle', value)}
                ariaLabel="Date style"
                options={[
                  { value: 'long', label: 'Long date' },
                  { value: 'short', label: 'Short date' },
                ]}
              />
            </Field>
            <Field label="Time zone" help="Leave on the board time zone unless this clock should follow somewhere else.">
              <Select value={cfg.timezone ?? ''} onChange={(event) => set('timezone', event.target.value)}>
                <option value="">Use the board time zone</option>
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </Select>
            </Field>
          </Advanced>
        </>
      );

    case 'weather':
      return <WeatherFields cfg={cfg} set={set} />;

    case 'photo':
      return (
        <>
          <Field label="Photos">
            <PhotoListField
              value={(cfg.images as PhotoImage[]) ?? []}
              onChange={(images) => set('images', images)}
            />
          </Field>
          <Field label="Time each photo">
            <Select value={String(cfg.intervalSec ?? 12)} onChange={(event) => set('intervalSec', Number(event.target.value))}>
              {[5, 8, 10, 15, 20, 30, 45, 60, 120].map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minute${seconds === 60 ? '' : 's'}`}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="How photos fit">
            <Segmented
              value={cfg.fit === 'contain' ? 'contain' : 'cover'}
              onChange={(value) => set('fit', value)}
              ariaLabel="How photos fit"
              options={[
                { value: 'cover', label: 'Fill the card' },
                { value: 'contain', label: 'Show the whole photo' },
              ]}
            />
          </Field>
          <ToggleRow label="Slow gentle zoom" checked={cfg.kenBurns !== false} onChange={(value) => set('kenBurns', value)} />
          <ToggleRow
            label="Show captions"
            checked={cfg.showCaption !== false}
            onChange={(value) => set('showCaption', value)}
          />
          {cfg.showCaption !== false ? (
            <Field label="Caption position">
              <Segmented
                value={cfg.captionPosition === 'top' ? 'top' : 'bottom'}
                onChange={(value) => set('captionPosition', value)}
                ariaLabel="Caption position"
                options={[
                  { value: 'bottom', label: 'Bottom' },
                  { value: 'top', label: 'Top' },
                ]}
              />
            </Field>
          ) : null}
        </>
      );

    case 'image':
      return (
        <>
          <Field label="Photo">
            <SinglePhotoField value={cfg.url ?? ''} onChange={(url) => set('url', url)} />
          </Field>
          <Field label="Caption" help="Optional. Shown over the photo.">
            <Input
              value={cfg.caption ?? ''}
              onChange={(event) => set('caption', event.target.value)}
              placeholder="e.g. Sports day"
            />
          </Field>
          <ToggleRow
            label="Show the caption"
            checked={cfg.showCaption !== false}
            onChange={(value) => set('showCaption', value)}
          />
          {cfg.showCaption !== false ? (
            <Field label="Caption position">
              <Segmented
                value={cfg.captionPosition === 'top' ? 'top' : 'bottom'}
                onChange={(value) => set('captionPosition', value)}
                ariaLabel="Caption position"
                options={[
                  { value: 'bottom', label: 'Bottom' },
                  { value: 'top', label: 'Top' },
                ]}
              />
            </Field>
          ) : null}
          <Field label="How the photo fits">
            <Segmented
              value={cfg.fit === 'contain' ? 'contain' : 'cover'}
              onChange={(value) => set('fit', value)}
              ariaLabel="How the photo fits"
              options={[
                { value: 'cover', label: 'Fill the card' },
                { value: 'contain', label: 'Show it all' },
              ]}
            />
          </Field>
        </>
      );

    case 'video':
      return (
        <>
          <Field label="Video link" help="A direct MP4 or WebM link works best. YouTube links belong in a Web page card.">
            <Input
              value={cfg.url ?? ''}
              onChange={(event) => set('url', event.target.value)}
              placeholder="https://…/video.mp4"
              type="url"
            />
          </Field>
          <ToggleRow label="Repeat the video" checked={cfg.loop !== false} onChange={(value) => set('loop', value)} />
          <ToggleRow
            label="Muted"
            description="Screens can only start videos automatically when they are muted."
            checked={cfg.muted !== false}
            onChange={(value) => set('muted', value)}
          />
          <ToggleRow label="Show playback controls" checked={Boolean(cfg.controls)} onChange={(value) => set('controls', value)} />
          <Field label="How the video fits">
            <Segmented
              value={cfg.fit === 'contain' ? 'contain' : 'cover'}
              onChange={(value) => set('fit', value)}
              ariaLabel="How the video fits"
              options={[
                { value: 'cover', label: 'Fill the card' },
                { value: 'contain', label: 'Show it all' },
              ]}
            />
          </Field>
          <Advanced>
            <Field label="Still image before it plays" help="Optional poster image link.">
              <Input value={cfg.poster ?? ''} onChange={(event) => set('poster', event.target.value)} type="url" />
            </Field>
          </Advanced>
        </>
      );

    case 'iframe':
      return (
        <>
          <Field label="Web address" help="Some websites do not allow themselves to be shown inside another page.">
            <Input
              value={cfg.url ?? ''}
              onChange={(event) => set('url', event.target.value)}
              placeholder="https://…"
              type="url"
            />
          </Field>
          <Field label="Name" help="Only used to help you recognise this item.">
            <Input value={cfg.title ?? ''} onChange={(event) => set('title', event.target.value)} placeholder="e.g. School news" />
          </Field>
          <Advanced>
            <Field label="Reload every" help="Leave at 0 to keep the page as it is.">
              <Select value={String(cfg.refreshSec ?? 0)} onChange={(event) => set('refreshSec', Number(event.target.value))}>
                <option value="0">Never reload</option>
                <option value="300">Every 5 minutes</option>
                <option value="900">Every 15 minutes</option>
                <option value="3600">Every hour</option>
              </Select>
            </Field>
          </Advanced>
        </>
      );

    case 'schedule':
      return (
        <>
          <Field label="Heading">
            <Input value={cfg.title ?? ''} onChange={(event) => set('title', event.target.value)} placeholder="e.g. This week" />
          </Field>
          <Field label="How far ahead">
            <Select value={String(cfg.daysAhead ?? 7)} onChange={(event) => set('daysAhead', Number(event.target.value))}>
              <option value="3">Next 3 days</option>
              <option value="7">Next week</option>
              <option value="14">Next 2 weeks</option>
              <option value="30">Next month</option>
            </Select>
          </Field>
          <Field label="How many events">
            <Select value={String(cfg.maxEvents ?? 8)} onChange={(event) => set('maxEvents', Number(event.target.value))}>
              {[3, 5, 8, 12, 20].map((value) => (
                <option key={value} value={value}>{value} events</option>
              ))}
            </Select>
          </Field>
          <ToggleRow
            label="Show where events are"
            checked={cfg.showLocation !== false}
            onChange={(value) => set('showLocation', value)}
          />
          <Advanced label="Only show some categories">
            <Field
              label="Categories"
              help="Separate with commas. Leave blank to show everything. For example: Sport, Music"
            >
              <Input
                value={Array.isArray(cfg.categories) ? cfg.categories.join(', ') : ''}
                onChange={(event) =>
                  set(
                    'categories',
                    event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                  )
                }
                placeholder="Sport, Music"
              />
            </Field>
          </Advanced>
          <div className="rounded-2xl bg-[#faf8f3] p-3">
            <div className="flex items-start gap-2.5">
              <CalendarDays size={17} className="mt-0.5 shrink-0 text-muted" />
              <p className="text-[12px] leading-relaxed text-muted">
                The timetable uses the school calendar link. If nothing appears, check the calendar in Settings.
              </p>
            </div>
            <Button size="sm" variant="secondary" className="mt-2.5" onClick={onOpenSettings}>
              Open calendar settings
            </Button>
          </div>
        </>
      );

    case 'markdown':
      return (
        <>
          <Field label="Your message" help="Use ## at the start of a line for a heading, and ** around words to make them bold.">
            <Textarea
              value={cfg.markdown ?? ''}
              onChange={(event) => set('markdown', event.target.value)}
              placeholder={'## Welcome\n\nA short message for everyone.'}
              className="min-h-40"
            />
          </Field>
          <div className="rounded-2xl bg-[#faf8f3] p-3 text-[12px] leading-relaxed text-muted">
            <div className="font-semibold text-ink">A little formatting help</div>
            <div className="mt-1">## Big heading</div>
            <div>**Bold words**</div>
            <div>- A bullet point</div>
          </div>
        </>
      );

    case 'countdown': {
      const target = String(cfg.target ?? '');
      const [date = '', time = ''] = target.split('T');
      const updateTarget = (nextDate: string, nextTime: string) => {
        if (!nextDate) {
          set('target', '');
          return;
        }
        set('target', `${nextDate}T${(nextTime || '09:00').slice(0, 5)}`);
      };
      return (
        <>
          <Field label="What are you counting down to?">
            <Input value={cfg.label ?? ''} onChange={(event) => set('label', event.target.value)} placeholder="e.g. Summer holidays" />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(event) => updateTarget(event.target.value, time)} />
          </Field>
          <Field label="Time" help="Optional. Defaults to 9am.">
            <Input type="time" value={time.slice(0, 5)} onChange={(event) => updateTarget(date, event.target.value)} />
          </Field>
          <ToggleRow label="Show days" checked={cfg.showDays !== false} onChange={(value) => set('showDays', value)} />
        </>
      );
    }

    case 'quote':
      return (
        <>
          <Field label="How often it changes">
            <Segmented
              value={cfg.mode === 'hourly' ? 'hourly' : 'daily'}
              onChange={(value) => set('mode', value)}
              ariaLabel="How often the quote changes"
              options={[
                { value: 'daily', label: 'Every day' },
                { value: 'hourly', label: 'Every hour' },
              ]}
            />
          </Field>
          <ToggleRow label="Show who said it" checked={cfg.showAuthor !== false} onChange={(value) => set('showAuthor', value)} />
        </>
      );

    default:
      return (
        <div className="space-y-3">
          {(def?.fields ?? []).map((field) => (
            <Field key={field.key} label={field.label} help={field.help}>
              {field.type === 'toggle' ? (
                <Toggle
                  checked={Boolean(cfg[field.key])}
                  onChange={(value) => set(field.key, value)}
                  label={field.label}
                />
              ) : field.type === 'textarea' ? (
                <Textarea
                  value={String(cfg[field.key] ?? '')}
                  onChange={(event) => set(field.key, event.target.value)}
                />
              ) : (
                <Input
                  value={String(cfg[field.key] ?? '')}
                  onChange={(event) => set(field.key, event.target.value)}
                />
              )}
            </Field>
          ))}
          {!def?.fields?.length ? (
            <p className="text-[13px] text-muted">This item has no settings yet.</p>
          ) : null}
        </div>
      );
  }
}

function WeatherFields({
  cfg,
  set,
}: {
  cfg: Record<string, any>;
  set: (key: string, value: unknown) => void;
}) {
  const { toast } = useFeedback();
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const findPlace = async () => {
    const query = search.trim();
    if (!query) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`,
      );
      if (!response.ok) throw new Error('Search failed.');
      const json = (await response.json()) as {
        results?: { name: string; latitude: number; longitude: number; country?: string; admin1?: string }[];
      };
      const place = json.results?.[0];
      if (!place) {
        toast('No place found with that name. Try a nearby town.', 'error');
        return;
      }
      set('label', place.name);
      set('lat', place.latitude);
      set('lon', place.longitude);
      toast(`Weather set to ${place.name}.`, 'success');
    } catch {
      toast('Could not look up that place. Check your connection and try again.', 'error');
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <Field label="Place shown" help="This is the name above the temperature.">
        <Input value={cfg.label ?? ''} onChange={(event) => set('label', event.target.value)} />
      </Field>

      <Field label="Find your town" help="Search once and the weather location is set for you.">
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="e.g. Wokingham"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void findPlace();
            }}
          />
          <Button size="sm" variant="secondary" onClick={() => void findPlace()} disabled={searching || !search.trim()}>
            <Search size={14} /> {searching ? '…' : 'Find'}
          </Button>
        </div>
      </Field>

      <div className="flex items-center gap-2 rounded-2xl bg-[#faf8f3] px-3 py-2.5 text-[12px] text-muted">
        <MapPin size={15} />
        {cfg.lat != null && cfg.lon != null
          ? `Weather is set for ${Number(cfg.lat).toFixed(2)}, ${Number(cfg.lon).toFixed(2)}`
          : 'No weather location set yet.'}
      </div>

      <Field label="Temperature">
        <Segmented
          value={cfg.units === 'imperial' ? 'imperial' : 'metric'}
          onChange={(value) => set('units', value)}
          ariaLabel="Temperature units"
          options={[
            { value: 'metric', label: '°C' },
            { value: 'imperial', label: '°F' },
          ]}
        />
      </Field>
      <ToggleRow label="Show the forecast" checked={cfg.showForecast !== false} onChange={(value) => set('showForecast', value)} />
      {cfg.showForecast !== false ? (
        <Field label="Days to show">
          <Segmented
            value={String(cfg.days ?? 4)}
            onChange={(value) => set('days', Number(value))}
            ariaLabel="Forecast days"
            options={[
              { value: '2', label: '2 days' },
              { value: '4', label: '4 days' },
              { value: '7', label: '7 days' },
            ]}
          />
        </Field>
      ) : null}

      <Advanced>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Latitude">
            <Input
              type="number"
              step="0.0001"
              value={String(cfg.lat ?? '')}
              onChange={(event) => set('lat', Number(event.target.value))}
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              step="0.0001"
              value={String(cfg.lon ?? '')}
              onChange={(event) => set('lon', Number(event.target.value))}
            />
          </Field>
        </div>
      </Advanced>
    </>
  );
}

export const CARD_ICONS = { Clock, CloudSun, Quote, Images, Image, Video, Frame, CalendarDays, Type, Timer };
