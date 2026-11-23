import { z } from 'zod';
import type { CardType } from './types';

export const clockSchema = z.object({
  timezone: z.string().default(''),
  format: z.enum(['12h', '24h']).default('24h'),
  showSeconds: z.boolean().default(false),
  showDate: z.boolean().default(true),
  dateStyle: z.enum(['long', 'short']).default('long'),
  label: z.string().default(''),
  analog: z.boolean().default(false),
});

export const weatherSchema = z.object({
  lat: z.number().min(-90).max(90).default(51.41),
  lon: z.number().min(-180).max(180).default(-0.83),
  label: z.string().default('Wokingham'),
  units: z.enum(['metric', 'imperial']).default('metric'),
  days: z.number().min(0).max(7).default(4),
  showForecast: z.boolean().default(true),
});

export const quoteSchema = z.object({
  mode: z.enum(['daily', 'hourly']).default('daily'),
  showAuthor: z.boolean().default(true),
});

export const photoSchema = z.object({
  images: z
    .array(
      z.object({
        url: z.string(),
        caption: z.string().optional(),
      }),
    )
    .default([]),
  intervalSec: z.number().min(3).max(3600).default(12),
  fit: z.enum(['cover', 'contain']).default('cover'),
  kenBurns: z.boolean().default(true),
  showCaption: z.boolean().default(true),
  captionPosition: z.enum(['bottom', 'top']).default('bottom'),
});

export const imageSchema = z.object({
  url: z.string().default(''),
  caption: z.string().default(''),
  fit: z.enum(['cover', 'contain']).default('cover'),
  showCaption: z.boolean().default(true),
  captionPosition: z.enum(['bottom', 'top']).default('bottom'),
});

export const iframeSchema = z.object({
  url: z.string().default(''),
  refreshSec: z.number().min(0).max(86400).default(0),
  title: z.string().default(''),
});

export const videoSchema = z.object({
  url: z.string().default(''),
  poster: z.string().default(''),
  fit: z.enum(['cover', 'contain']).default('cover'),
  loop: z.boolean().default(true),
  muted: z.boolean().default(true),
  controls: z.boolean().default(false),
});

export const scheduleSchema = z.object({
  daysAhead: z.number().min(1).max(60).default(7),
  maxEvents: z.number().min(1).max(40).default(8),
  categories: z.array(z.string()).default([]),
  showLocation: z.boolean().default(true),
  title: z.string().default('This week'),
});

export const markdownSchema = z.object({
  markdown: z.string().default(''),
});

export const countdownSchema = z.object({
  target: z.string().default(''),
  label: z.string().default('Countdown'),
  showDays: z.boolean().default(true),
});

export const cardSchemas: Record<CardType, z.ZodTypeAny> = {
  clock: clockSchema,
  weather: weatherSchema,
  quote: quoteSchema,
  photo: photoSchema,
  image: imageSchema,
  video: videoSchema,
  iframe: iframeSchema,
  schedule: scheduleSchema,
  markdown: markdownSchema,
  countdown: countdownSchema,
};

export const CARD_TYPES = Object.keys(cardSchemas) as CardType[];

export function defaultCardConfig(type: CardType): Record<string, any> {
  return cardSchemas[type].parse({}) as Record<string, any>;
}

export function normalizeCardConfig(type: CardType, config: unknown): Record<string, any> {
  const schema = cardSchemas[type];
  if (!schema) return {};
  const parsed = schema.safeParse(config ?? {});
  return (parsed.success ? parsed.data : schema.parse({})) as Record<string, any>;
}
