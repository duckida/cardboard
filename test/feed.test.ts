import { describe, expect, it } from 'vitest';
import { normalizeFeedUrl, parseIcs, withinWindow } from '../api/_lib/feed';

const pad = (n: number) => String(n).padStart(2, '0');

/** Floating local timestamp n days from today at hh:mm. */
function localStamp(daysAhead: number, hour: number, minute = 0): string {
  const d = new Date(Date.now() + daysAhead * 86400_000);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}${pad(minute)}00`;
}

function dateStamp(daysAhead: number): string {
  return localStamp(daysAhead, 0).slice(0, 8);
}

// Mirrors a real SOCS CalendarSync feed: Windows-style "GMT Standard Time"
// VTIMEZONE, multi-value CATEGORIES, escaped DESCRIPTION.
function socsFeed(events: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SOCS//SchoolCalendar//EN',
    'X-WR-CALNAME;VALUE=TEXT:SOCS School Calendar',
    'BEGIN:VTIMEZONE',
    'TZID:GMT Standard Time',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'DTSTART:19810329T010000',
    'TZNAME:GMT+01:00',
    'TZOFFSETTO:+0100',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0100',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'DTSTART:19961027T020000',
    'TZNAME:GMT',
    'TZOFFSETTO:+0000',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

const window60 = (): [Date, Date] => [
  new Date(Date.now() - 12 * 3600_000),
  new Date(Date.now() + 60 * 86400_000),
];

describe('parseIcs', () => {
  it('keeps every value from a multi-value CATEGORIES line', () => {
    const ics = socsFeed([
      'BEGIN:VEVENT',
      'UID:cat-1',
      `DTSTART;TZID=GMT Standard Time:${localStamp(1, 14, 30)}`,
      `DTEND;TZID=GMT Standard Time:${localStamp(1, 15, 30)}`,
      'SUMMARY:Rugby Union 3rd XV vs Example College',
      'CATEGORIES:Sport, Rugby Union, Fixture',
      'END:VEVENT',
    ]);
    const [event] = parseIcs(ics, ...window60());
    expect(event.categories).toEqual(['Sport', 'Rugby Union', 'Fixture']);
  });

  it('keeps categories from repeated CATEGORIES properties', () => {
    const ics = socsFeed([
      'BEGIN:VEVENT',
      'UID:cat-2',
      `DTSTART;TZID=GMT Standard Time:${localStamp(1, 9)}`,
      `DTEND;TZID=GMT Standard Time:${localStamp(1, 10)}`,
      'SUMMARY:Chapel',
      'CATEGORIES:Regular Fixtures',
      'CATEGORIES:Chapel',
      'END:VEVENT',
    ]);
    const [event] = parseIcs(ics, ...window60());
    expect(event.categories).toEqual(['Regular Fixtures', 'Chapel']);
  });

  it('parses GMT Standard Time events and all-day events', () => {
    const ics = socsFeed([
      'BEGIN:VEVENT',
      'UID:timed-1',
      `DTSTART;TZID=GMT Standard Time:${localStamp(2, 17)}`,
      `DTEND;TZID=GMT Standard Time:${localStamp(2, 20)}`,
      'SUMMARY:Parents Evening',
      'CATEGORIES:Academic Dates',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:allday-1',
      `DTSTART;VALUE=DATE:${dateStamp(3)}`,
      `DTEND;VALUE=DATE:${dateStamp(4)}`,
      'SUMMARY:Founders Day',
      'END:VEVENT',
    ]);
    const events = parseIcs(ics, ...window60());
    expect(events).toHaveLength(2);
    const [timed, allDay] = events;
    expect(timed.allDay).toBe(false);
    expect(Number.isNaN(new Date(timed.start).getTime())).toBe(false);
    expect(allDay.allDay).toBe(true);
  });

  it('skips a malformed event instead of failing the whole feed', () => {
    const ics = socsFeed([
      'BEGIN:VEVENT',
      'UID:bad-1',
      'DTSTART:00000000T000000',
      'SUMMARY:Broken event',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:good-1',
      `DTSTART;TZID=GMT Standard Time:${localStamp(0, 12)}`,
      `DTEND;TZID=GMT Standard Time:${localStamp(0, 13)}`,
      'SUMMARY:Good event',
      'END:VEVENT',
    ]);
    const events = parseIcs(ics, ...window60());
    expect(events.map((e) => e.title)).toEqual(['Good event']);
  });

  it('expands recurring events', () => {
    const ics = socsFeed([
      'BEGIN:VEVENT',
      'UID:rrule-1',
      `DTSTART;TZID=GMT Standard Time:${localStamp(0, 8)}`,
      `DTEND;TZID=GMT Standard Time:${localStamp(0, 8, 45)}`,
      'RRULE:FREQ=DAILY;COUNT=5',
      'SUMMARY:Registration',
      'END:VEVENT',
    ]);
    const events = parseIcs(ics, ...window60());
    expect(events).toHaveLength(5);
  });
});

describe('withinWindow', () => {
  it('keeps events ending soon after now and starting within the window', () => {
    const hour = 3600_000;
    const now = Date.now();
    const mk = (id: string, start: number, end: number) => ({
      id,
      title: id,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      allDay: false,
      categories: [],
    });
    const events = [
      mk('just-ended', now - 2 * hour, now - 1 * hour),
      mk('long-past', now - 30 * 24 * hour, now - 29 * 24 * hour),
      mk('soon', now + hour, now + 2 * hour),
      mk('far-future', now + 30 * 24 * hour, now + 30 * 24 * hour + hour),
    ];
    const ids = withinWindow(events, 7).map((e) => e.id);
    expect(ids).toContain('just-ended');
    expect(ids).toContain('soon');
    expect(ids).not.toContain('long-past');
    expect(ids).not.toContain('far-future');
  });
});

describe('feed URLs', () => {
  it('normalizes webcal URLs to https', () => {
    expect(normalizeFeedUrl('webcal://cal.example.com/CalendarSync.ashx?ID=1')).toBe(
      'https://cal.example.com/CalendarSync.ashx?ID=1',
    );
  });
});
