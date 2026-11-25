import type { SportsFixture } from '../../shared/types';
import { HttpError } from './http.js';

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const USER_AGENT = 'Mozilla/5.0 (compatible; Cardboard/0.1; +https://github.com/)';

/** Turn any SOCS sport calendar page into its list view, which carries fixture details. */
export function normalizeSportsUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (/\/calendar(list|week|day)?\.asp$/i.test(url.pathname) || /\/default\.asp$/i.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/[^/]*$/i, '/CalendarList.asp');
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function isSportsUrl(value: string): boolean {
  return normalizeSportsUrl(value) !== null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function fixtureId(fixture: Omit<SportsFixture, 'id'>): string {
  return [
    fixture.date,
    fixture.time,
    fixture.sport,
    fixture.teams.join(','),
    fixture.opponent,
    fixture.venue,
  ].join('|');
}

/**
 * SOCS list pages are old table markup. Each date heading is followed by one
 * row per fixture with sport, time, teams, opponent and venue columns.
 */
export function parseSportsFixtures(html: string): SportsFixture[] {
  const rowPattern =
    /<a class="CalListDateButton"[^>]*>[\s\S]*?<span class="CalListDaySpan">([^<]*)<\/span><span class="CalListDateSpan">([^<]*)<\/span><span class="CalListYearSpan">([^<]*)<\/span>[\s\S]*?<\/a>|<tr><td[^>]*background:#eee[^>]*>[\s\S]*?<\/tr>/gi;

  const found = new Map<string, SportsFixture>();
  let date = '';

  for (const match of html.matchAll(rowPattern)) {
    if (match[1] !== undefined) {
      // match[1] is the weekday ("Wed"); match[2] is the day and month ("25 Nov").
      const parts = match[2].trim().split(/\s+/);
      const day = Number(parts[0]);
      const month = MONTHS[(parts[1] ?? '').slice(0, 3).toLowerCase()];
      const year = Number(match[3].trim());
      if (Number.isFinite(day) && month && Number.isFinite(year)) {
        date = `${year}-${pad(month)}-${pad(day)}`;
      }
      continue;
    }

    if (!date) continue;
    const row = match[0];
    const sport = decodeHtml(row.match(/<b>([\s\S]*?)<\/b>/i)?.[1] ?? '');
    if (!sport) continue;

    const time = row.match(/<td>\s*(\d{1,2}:\d{2})\s*<\/td>/i)?.[1] ?? '';
    const opponent = decodeHtml(row.match(/<td>\s*v\s*([\s\S]*?)<\/td>/i)?.[1] ?? '');
    const rawVenue = (row.match(/<td>\s*(H|A|N|tbc)\s*<\/td>/i)?.[1] ?? '').toUpperCase();
    const venue: SportsFixture['venue'] =
      rawVenue === 'H' || rawVenue === 'A' || rawVenue === 'N' || rawVenue === 'TBC' ? rawVenue : '';

    const teams: string[] = [];
    const teamPattern = /class="FixtureDetailsLink"[^>]*>([\s\S]*?)<\/a>/gi;
    for (const team of row.matchAll(teamPattern)) {
      const name = decodeHtml(team[1]);
      if (name) teams.push(name);
    }

    const fixture = { date, time, sport, teams, opponent, venue };
    const id = fixtureId(fixture);
    found.set(id, { id, ...fixture });
  }

  return [...found.values()];
}

async function fetchSportsPage(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(2_000, Math.min(9_000, timeoutMs)));
  try {
    let response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'User-Agent': USER_AGENT,
      },
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    });
    let body = await response.text();

    // SOCS sports sites may serve a small JavaScript cookie challenge first.
    const challenge = body.match(/__jschk=([^;"'\s]+)/)?.[1];
    if (challenge) {
      response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'User-Agent': USER_AGENT,
          Cookie: `__jschk=${challenge}`,
        },
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
      });
      body = await response.text();
    }

    if (!response.ok) {
      throw new HttpError(502, `The sports calendar returned ${response.status}.`, 'sports_unavailable');
    }
    return body;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(502, 'That sports calendar could not be read.', 'sports_unavailable');
  } finally {
    clearTimeout(timer);
  }
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

function dateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function formatListDate(key: string): string {
  const date = dateFromKey(key);
  return `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function withStartDate(base: string, key: string): string {
  const url = new URL(base);
  url.searchParams.set('D', formatListDate(key));
  return url.toString();
}

function sortKey(fixture: SportsFixture): string {
  return `${fixture.date}T${fixture.time || '23:59'}`;
}

export async function fetchSportsFixtures(rawUrl: string, daysAhead: number): Promise<SportsFixture[]> {
  const base = normalizeSportsUrl(rawUrl);
  if (!base) {
    throw new HttpError(400, 'Paste a valid http or https sports calendar URL.', 'invalid_url');
  }

  const days = Math.min(60, Math.max(1, Number(daysAhead) || 14));
  const start = dateKey(new Date());
  const until = addDays(start, days);
  const deadline = Date.now() + 8_000;
  const found = new Map<string, SportsFixture>();

  let cursor = start;
  for (let page = 0; page < 4 && cursor <= until; page += 1) {
    const remaining = deadline - Date.now();
    if (remaining < 1_000) break;

    const html = await fetchSportsPage(withStartDate(base, cursor), remaining);
    const fixtures = parseSportsFixtures(html);
    for (const fixture of fixtures) {
      if (fixture.date >= start && fixture.date <= until) found.set(fixture.id, fixture);
    }

    const lastDate = fixtures.reduce((latest, fixture) => (fixture.date > latest ? fixture.date : latest), '');
    if (!lastDate || lastDate >= until) break;
    const next = addDays(lastDate, 1);
    if (next <= cursor) break;
    cursor = next;
  }

  return [...found.values()]
    .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    .slice(0, 400);
}
