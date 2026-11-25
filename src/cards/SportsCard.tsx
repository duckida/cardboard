import { useEffect, useMemo, useState } from 'react';
import type { Card, SportsConfig, SportsFixture } from '@shared/types';
import { DEMO } from '@/lib/store';
import { demoSports } from '@/lib/demoSports';
import { useBoard } from '@/lib/board';
import { dayKey } from '@/lib/time';

interface Response {
  fixtures: SportsFixture[];
  configured?: boolean;
}

function venueLabel(venue: SportsFixture['venue']): string {
  if (venue === 'H') return 'Home';
  if (venue === 'A') return 'Away';
  if (venue === 'N') return 'Neutral';
  if (venue === 'TBC') return 'Venue TBC';
  return '';
}

function dateLabel(value: string, timezone: string, locale: string): string {
  const today = dayKey(new Date(), timezone);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dayKey(tomorrowDate, timezone);
  if (value === today) return 'Today';
  if (value === tomorrow) return 'Tomorrow';

  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale || 'en-GB', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function SportsCard({ card }: { card: Card }) {
  const cfg = card.config as SportsConfig;
  const boardConfig = useBoard().config;
  const timezone = boardConfig?.settings.timezone ?? '';
  const locale = boardConfig?.settings.locale ?? 'en-GB';
  const sportsUrl = boardConfig?.settings.sports.url ?? '';
  const [state, setState] = useState<Response | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (DEMO) {
        setState({ fixtures: demoSports(cfg.daysAhead), configured: true });
        return;
      }
      if (!sportsUrl.trim()) {
        setState({ fixtures: [], configured: false });
        setFailed(false);
        return;
      }
      try {
        const params = new URLSearchParams({
          days: String(cfg.daysAhead),
          url: sportsUrl.trim(),
        });
        const response = await fetch(`/api/sports?${params.toString()}`);
        if (!response.ok) throw new Error('sports');
        const json = (await response.json()) as Response;
        if (alive) {
          setState(json);
          setFailed(false);
        }
      } catch {
        if (alive) {
          setFailed(true);
          if (import.meta.env.DEV) setState({ fixtures: demoSports(cfg.daysAhead), configured: true });
        }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [cfg.daysAhead, sportsUrl]);

  const fixtures = useMemo(
    () => (state?.fixtures ?? []).slice(0, Math.max(1, cfg.maxFixtures || 8)),
    [state?.fixtures, cfg.maxFixtures],
  );

  const groups = useMemo(() => {
    const map = new Map<string, SportsFixture[]>();
    for (const fixture of fixtures) {
      const list = map.get(fixture.date) ?? [];
      list.push(fixture);
      map.set(fixture.date, list);
    }
    return [...map.entries()];
  }, [fixtures]);

  if (state && state.configured === false) {
    return (
      <div className="cb-schedule">
        <div className="cb-eyebrow">{cfg.title || 'Fixtures'}</div>
        <div className="cb-muted">Sports calendar not configured. Add a link in Control → Settings.</div>
      </div>
    );
  }

  return (
    <div className="cb-schedule">
      <div className="cb-schedule-head">
        <div className="cb-eyebrow">{cfg.title || 'Fixtures'}</div>
      </div>
      {failed && !state ? <div className="cb-muted">Sports calendar unavailable.</div> : null}
      {!failed && state && groups.length === 0 ? <div className="cb-muted">No fixtures coming up.</div> : null}
      <div className="cb-schedule-list">
        {groups.map(([date, items]) => (
          <div className="cb-schedule-group" key={date}>
            <div className="cb-schedule-day">{dateLabel(date, timezone, locale)}</div>
            {items.map((fixture) => {
              const shownTeams =
                cfg.showTeam !== false && fixture.teams.length
                  ? fixture.teams.length > 3
                    ? `${fixture.teams.slice(0, 3).join(', ')} +${fixture.teams.length - 3}`
                    : fixture.teams.join(', ')
                  : '';
              const title = [fixture.sport, shownTeams].filter(Boolean).join(' · ');
              const opponent =
                fixture.opponent.toLowerCase() === 'training' ? 'Training' : `v ${fixture.opponent}`;
              const meta = [
                cfg.showVenue !== false ? venueLabel(fixture.venue) : '',
                fixture.opponent ? opponent : '',
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <div className="cb-schedule-event" key={fixture.id}>
                  <div className="cb-schedule-time">{fixture.time || 'TBC'}</div>
                  <div className="cb-schedule-dot" aria-hidden="true" />
                  <div className="cb-schedule-body">
                    <div className="cb-schedule-title">{title}</div>
                    {meta ? <div className="cb-schedule-location">{meta}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
