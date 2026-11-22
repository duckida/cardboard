const DATE_KEY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
function safeZone(timezone?: string): string | undefined {
  if (!timezone) return undefined;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone });
    return timezone;
  } catch {
    return undefined;
  }
}

export function formatTime(
  date: Date,
  timezone: string,
  format: '12h' | '24h',
  seconds: boolean,
): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: safeZone(timezone),
    hour: '2-digit',
    minute: '2-digit',
    second: seconds ? '2-digit' : undefined,
    hour12: format === '12h',
  }).format(date);
}

export function formatDate(
  date: Date,
  timezone: string,
  style: 'long' | 'short' = 'long',
): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: safeZone(timezone),
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
  }).format(date);
}

export function formatEventTime(iso: string, timezone: string, locale = 'en-GB'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: safeZone(timezone),
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function dayKey(iso: string | Date, timezone: string): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '';
  const zone = safeZone(timezone);
  if (!zone) return DATE_KEY.format(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function dayLabel(iso: string | Date, timezone: string, locale = 'en-GB'): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    timeZone: safeZone(timezone),
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function isToday(iso: string, timezone: string): boolean {
  return dayKey(iso, timezone) === dayKey(new Date(), timezone);
}

export function relativeDay(iso: string, timezone: string): 'Today' | 'Tomorrow' | null {
  const target = dayKey(iso, timezone);
  const today = dayKey(new Date(), timezone);
  if (target === today) return 'Today';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (target === dayKey(tomorrow, timezone)) return 'Tomorrow';
  return null;
}
