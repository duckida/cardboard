import { useEffect, useMemo, useState } from 'react';
import type { Card, ScheduleConfig, ScheduleEvent } from '@shared/types';
import { dayKey, dayLabel, formatEventTime, relativeDay } from '@/lib/time';

import { DEMO } from '@/lib/store';
import { demoSchedule } from '@/lib/demoSchedule';
import { useBoard } from '@/lib/board';

interface Response {
  events: ScheduleEvent[];
  configured?: boolean;
  stale?: boolean;
}

export function ScheduleCard({ card }: { card: Card }) {
  const cfg = card.config as ScheduleConfig;
  const boardConfig = useBoard().config;
  const timezone = boardConfig?.settings.timezone ?? '';
  const calendarUrl = boardConfig?.settings.calendar.url ?? '';
  const calendarIncludeInternal = boardConfig?.settings.calendar.includeInternal ?? false;
  const [state, setState] = useState<Response | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (DEMO) {
        setState({ events: demoSchedule(cfg.daysAhead), configured: true });
        return;
      }
      try {
        const params = new URLSearchParams({
          days: String(cfg.daysAhead),
          url: calendarUrl,
          includeInternal: calendarIncludeInternal ? '1' : '0',
        });
        const response = await fetch(`/api/schedule?${params.toString()}`);
        if (!response.ok) throw new Error('schedule');
        const json = (await response.json()) as Response;
        if (alive) {
          setState(json);
          setFailed(false);
        }
      } catch {
        if (alive) {
          setFailed(true);
          if (import.meta.env.DEV) setState({ events: demoSchedule(cfg.daysAhead), configured: true });
        }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [cfg.daysAhead, calendarUrl, calendarIncludeInternal]);

  const events = useMemo(() => {
    const all = state?.events ?? [];
    const filtered = cfg.categories.length
      ? all.filter((event) =>
          event.categories.some((category) =>
            cfg.categories.some((wanted) => category.toLowerCase().includes(wanted.toLowerCase())),
          ),
        )
      : all;
    return filtered.slice(0, cfg.maxEvents);
  }, [state?.events, cfg.categories, cfg.maxEvents]);

  const groups = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of events) {
      const key = dayKey(event.start, timezone);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [events, timezone]);

  if (state && state.configured === false) {
    return (
      <div className="cb-schedule">
        <div className="cb-eyebrow">{cfg.title || 'Schedule'}</div>
        <div className="cb-muted">Calendar not configured. Add a feed in Control → Settings.</div>
      </div>
    );
  }

  return (
    <div className="cb-schedule">
      <div className="cb-schedule-head">
        <div className="cb-eyebrow">{cfg.title || 'Schedule'}</div>
        {state?.stale ? <div className="cb-pill">cached</div> : null}
      </div>
      {failed && !state ? <div className="cb-muted">Calendar unavailable.</div> : null}
      {!failed && state && groups.length === 0 ? <div className="cb-muted">Nothing scheduled.</div> : null}
      <div className="cb-schedule-list">
        {groups.map(([key, items]) => (
          <div className="cb-schedule-group" key={key}>
            <div className="cb-schedule-day">{relativeDay(items[0].start, timezone) ?? dayLabel(items[0].start, timezone)}</div>
            {items.map((event) => (
              <div className="cb-schedule-event" key={event.id}>
                <div className="cb-schedule-time">{event.allDay ? 'ALL DAY' : formatEventTime(event.start, timezone)}</div>
                <div className="cb-schedule-dot" aria-hidden="true" />
                <div className="cb-schedule-body">
                  <div className="cb-schedule-title">{event.title}</div>
                  {cfg.showLocation && event.location ? (
                    <div className="cb-schedule-location">{event.location}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
