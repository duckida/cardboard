import {
  CalendarDays,
  Clock,
  CloudSun,
  Frame,
  Image,
  Images,
  Quote,
  Timer,
  Type,
  type LucideIcon,
} from 'lucide-react';
import type { Card, CardType, Field } from '@shared/types';
import { ClockCard } from './ClockCard';
import { WeatherCard } from './WeatherCard';
import { QuoteCard } from './QuoteCard';
import { PhotoCard } from './PhotoCard';
import { ImageCard } from './ImageCard';
import { IframeCard } from './IframeCard';
import { MarkdownCard } from './MarkdownCard';
import { ScheduleCard } from './ScheduleCard';
import { CountdownCard } from './CountdownCard';

export interface CardDef {
  type: CardType;
  name: string;
  description: string;
  icon: LucideIcon;
  defaultSize: { w: number; h: number };
  fields: Field[];
  Component: (props: { card: Card }) => React.ReactNode;
}

export const CARD_DEFS: Record<CardType, CardDef> = {
  clock: {
    type: 'clock',
    name: 'Clock',
    description: 'Time and date, digital or analog.',
    icon: Clock,
    defaultSize: { w: 8, h: 6 },
    fields: [
      { key: 'label', label: 'Label', type: 'text', placeholder: 'Optional' },
      { key: 'timezone', label: 'Timezone', type: 'timezone', placeholder: 'Europe/London' },
      {
        key: 'format',
        label: 'Format',
        type: 'select',
        options: [
          { value: '24h', label: '24-hour' },
          { value: '12h', label: '12-hour' },
        ],
      },
      { key: 'showSeconds', label: 'Show seconds', type: 'toggle' },
      { key: 'showDate', label: 'Show date', type: 'toggle' },
      {
        key: 'dateStyle',
        label: 'Date style',
        type: 'select',
        options: [
          { value: 'long', label: 'Long' },
          { value: 'short', label: 'Short' },
        ],
      },
      { key: 'analog', label: 'Analog clock', type: 'toggle' },
    ],
    Component: ClockCard,
  },
  weather: {
    type: 'weather',
    name: 'Weather',
    description: 'Current conditions and forecast from Open-Meteo.',
    icon: CloudSun,
    defaultSize: { w: 7, h: 6 },
    fields: [
      { key: 'label', label: 'Place name', type: 'text' },
      { key: 'lat', label: 'Latitude', type: 'number', step: 0.0001 },
      { key: 'lon', label: 'Longitude', type: 'number', step: 0.0001 },
      {
        key: 'units',
        label: 'Units',
        type: 'select',
        options: [
          { value: 'metric', label: 'Metric (°C)' },
          { value: 'imperial', label: 'Imperial (°F)' },
        ],
      },
      { key: 'days', label: 'Forecast days', type: 'number', min: 0, max: 7 },
      { key: 'showForecast', label: 'Show forecast', type: 'toggle' },
    ],
    Component: WeatherCard,
  },
  quote: {
    type: 'quote',
    name: 'Quote',
    description: 'A rotating quote from the bundled collection.',
    icon: Quote,
    defaultSize: { w: 9, h: 6 },
    fields: [
      {
        key: 'mode',
        label: 'Changes',
        type: 'select',
        options: [
          { value: 'daily', label: 'Daily' },
          { value: 'hourly', label: 'Hourly' },
        ],
      },
      { key: 'showAuthor', label: 'Show author', type: 'toggle' },
    ],
    Component: QuoteCard,
  },
  photo: {
    type: 'photo',
    name: 'Photo slideshow',
    description: 'One or more photos, each with an optional caption.',
    icon: Images,
    defaultSize: { w: 14, h: 10 },
    fields: [
      { key: 'images', label: 'Photos', type: 'images' },
      { key: 'intervalSec', label: 'Seconds per photo', type: 'number', min: 3, max: 3600 },
      {
        key: 'fit',
        label: 'Fit',
        type: 'select',
        options: [
          { value: 'cover', label: 'Fill' },
          { value: 'contain', label: 'Contain' },
        ],
      },
      { key: 'kenBurns', label: 'Slow zoom', type: 'toggle' },
      { key: 'showCaption', label: 'Show captions', type: 'toggle' },
      {
        key: 'captionPosition',
        label: 'Caption position',
        type: 'select',
        options: [
          { value: 'bottom', label: 'Bottom' },
          { value: 'top', label: 'Top' },
        ],
      },
    ],
    Component: PhotoCard,
  },
  image: {
    type: 'image',
    name: 'Image',
    description: 'A single image with a caption.',
    icon: Image,
    defaultSize: { w: 10, h: 8 },
    fields: [
      { key: 'url', label: 'Image URL', type: 'url', placeholder: 'https://…' },
      { key: 'caption', label: 'Caption', type: 'text' },
      {
        key: 'fit',
        label: 'Fit',
        type: 'select',
        options: [
          { value: 'cover', label: 'Fill' },
          { value: 'contain', label: 'Contain' },
        ],
      },
      { key: 'showCaption', label: 'Show caption', type: 'toggle' },
      {
        key: 'captionPosition',
        label: 'Caption position',
        type: 'select',
        options: [
          { value: 'bottom', label: 'Bottom' },
          { value: 'top', label: 'Top' },
        ],
      },
    ],
    Component: ImageCard,
  },
  iframe: {
    type: 'iframe',
    name: 'Embed',
    description: 'An iframe. Some sites refuse to be embedded.',
    icon: Frame,
    defaultSize: { w: 12, h: 10 },
    fields: [
      { key: 'url', label: 'URL', type: 'url', placeholder: 'https://…' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'refreshSec', label: 'Refresh every (seconds, 0 = never)', type: 'number', min: 0, max: 86400 },
    ],
    Component: IframeCard,
  },
  schedule: {
    type: 'schedule',
    name: 'Schedule',
    description: 'Agenda from your SOCS iCalendar feed.',
    icon: CalendarDays,
    defaultSize: { w: 10, h: 10 },
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'daysAhead', label: 'Days ahead', type: 'number', min: 1, max: 60 },
      { key: 'maxEvents', label: 'Max events', type: 'number', min: 1, max: 40 },
      {
        key: 'categories',
        label: 'Categories',
        type: 'categories',
        help: 'Comma separated. Leave blank for everything. Matches any token, e.g. Sport, Music.',
      },
      { key: 'showLocation', label: 'Show location', type: 'toggle' },
    ],
    Component: ScheduleCard,
  },
  markdown: {
    type: 'markdown',
    name: 'Text',
    description: 'Markdown text, headings, lists and links.',
    icon: Type,
    defaultSize: { w: 12, h: 6 },
    fields: [{ key: 'markdown', label: 'Markdown', type: 'textarea' }],
    Component: MarkdownCard,
  },
  countdown: {
    type: 'countdown',
    name: 'Countdown',
    description: 'Days, hours, minutes until a date.',
    icon: Timer,
    defaultSize: { w: 8, h: 4 },
    fields: [
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'target', label: 'Target date', type: 'text', placeholder: '2027-07-01T09:00' },
      { key: 'showDays', label: 'Show days', type: 'toggle' },
    ],
    Component: CountdownCard,
  },
};

export const CARD_LIST = Object.values(CARD_DEFS);
