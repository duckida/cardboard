import IcalExpander from 'ical-expander';
import type { ScheduleEvent } from '../../shared/types';

export interface FeedConfig {
  url: string;
  includeInternal: boolean;
  updatedAt: number;
}

export interface CachedSchedule {
  events: ScheduleEvent[];
  fetchedAt: number;
  revision: number;
}

/** Accept the webcal links SOCS exposes while always fetching over HTTPS. */
export function normalizeFeedUrl(rawUrl: string): string {
  const value = rawUrl.trim();
  return value.replace(/^webcal:\/\//i, 'https://').replace(/^webcals:\/\//i, 'https://');
}

export function withScope(rawUrl: string, includeInternal: boolean): string {
  const url = new URL(normalizeFeedUrl(rawUrl));
  if (includeInternal) url.searchParams.set('A', '1');
  else url.searchParams.delete('A');
  return url.toString();
}

interface PropertyLike {
  getValues?: () => unknown[];
  getFirstValue?: () => unknown;
}

interface ComponentLike {
  getFirstPropertyValue?: (name: string) => unknown;
  getAllProperties?: (name: string) => PropertyLike[];
}

/**
 * SOCS emits multi-value CATEGORIES lines like `CATEGORIES:Sport, Rugby Union, Fixture`.
 * getFirstPropertyValue only returns the first value, so collect every value from
 * every CATEGORIES property instead — category filters depend on the full list.
 */
function categoriesOf(event: { component?: ComponentLike }): string[] {
  try {
    const component = event.component;
    if (!component) return [];
    const values: unknown[] = [];
    if (typeof component.getAllProperties === 'function') {
      for (const property of component.getAllProperties('categories')) {
        values.push(...(property.getValues?.() ?? [property.getFirstValue?.()]));
      }
    } else {
      values.push(component.getFirstPropertyValue?.('categories'));
    }
    const out: string[] = [];
    for (const value of values) {
      const list = Array.isArray(value) ? value : [value];
      for (const item of list) {
        if (typeof item === 'string') out.push(...item.split(',').map((part) => part.trim()));
        else if (item != null) out.push(String(item));
      }
    }
    return [...new Set(out.filter(Boolean))];
  } catch {
    return [];
  }
}

interface TimeLike {
  toJSDate(): Date;
  isDate?: boolean;
}

interface EventLike {
  uid?: string;
  summary?: string;
  location?: string;
  description?: string;
  startDate: TimeLike;
  endDate: TimeLike;
  component?: ComponentLike;
}

function toEvent(event: EventLike, startDate: TimeLike, endDate: TimeLike): ScheduleEvent {
  const start = startDate.toJSDate();
  const end = endDate.toJSDate();
  return {
    id: `${event.uid || 'event'}@${start.toISOString()}`,
    title: String(event.summary || 'Untitled'),
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: Boolean(startDate.isDate),
    location: event.location ? String(event.location) : undefined,
    categories: categoriesOf(event),
    description: event.description ? String(event.description) : undefined,
  };
}

/**
 * Expands an iCalendar feed into concrete events between two dates.
 * Recurrences (RRULE) are expanded by ical-expander.
 */
export function parseIcs(ics: string, from: Date, to: Date): ScheduleEvent[] {
  const expander = new IcalExpander({ ics, maxIterations: 4000, skipInvalidDates: true });
  const { events, occurrences } = expander.between(from, to);
  const out: ScheduleEvent[] = [];

  for (const event of events) {
    // One malformed VEVENT must not take down the whole feed.
    try {
      out.push(toEvent(event as unknown as EventLike, event.startDate as unknown as TimeLike, event.endDate as unknown as TimeLike));
    } catch {
      // skip the broken event
    }
  }
  for (const occurrence of occurrences) {
    try {
      const item = (occurrence as unknown as { item: EventLike }).item;
      out.push(
        toEvent(
          item,
          (occurrence as unknown as { startDate: TimeLike }).startDate,
          (occurrence as unknown as { endDate: TimeLike }).endDate,
        ),
      );
    } catch {
      // skip the broken occurrence
    }
  }

  const seen = new Set<string>();
  return out
    .filter((event) => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export async function fetchFeed(feed: FeedConfig): Promise<ScheduleEvent[]> {
  const target = withScope(feed.url, feed.includeInternal);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(target, {
      headers: {
        Accept: 'text/calendar, text/plain;q=0.8, */*;q=0.5',
        'User-Agent': 'Cardboard/0.1 (+https://github.com/)',
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`The calendar feed returned ${response.status}.`);
    }
    const body = await response.text();
    if (!/BEGIN:VCALENDAR/i.test(body)) {
      throw new Error('That URL did not return an iCalendar feed.');
    }
    const now = Date.now();
    return parseIcs(body, new Date(now - 12 * 3600_000), new Date(now + 60 * 86400_000));
  } finally {
    clearTimeout(timer);
  }
}

export function withinWindow(events: ScheduleEvent[], days: number): ScheduleEvent[] {
  const now = Date.now();
  const end = now + days * 86400_000;
  return events
    .filter((event) => {
      const start = new Date(event.start).getTime();
      const finish = new Date(event.end).getTime();
      return finish >= now - 6 * 3600_000 && start <= end;
    })
    .slice(0, 400);
}

export function isFeedUrl(value: string): boolean {
  try {
    const url = new URL(normalizeFeedUrl(value));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
