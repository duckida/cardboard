import type { Card, ClockConfig } from '@shared/types';
import { useNow } from '@/lib/useNow';
import { formatDate, formatTime } from '@/lib/time';

function timeParts(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || undefined,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    return { h: get('hour') % 24, m: get('minute'), s: get('second') };
  } catch {
    return { h: date.getHours(), m: date.getMinutes(), s: date.getSeconds() };
  }
}

export function ClockCard({ card }: { card: Card }) {
  const cfg = card.config as ClockConfig;
  const now = useNow(cfg.showSeconds ? 1000 : 15000);
  const time = formatTime(now, cfg.timezone, cfg.format, cfg.showSeconds);
  const date = formatDate(now, cfg.timezone, cfg.dateStyle);

  if (cfg.analog) {
    const { h, m, s } = timeParts(now, cfg.timezone);
    const hourAngle = ((h % 12) + m / 60) * 30;
    const minuteAngle = (m + s / 60) * 6;
    const secondAngle = s * 6;
    return (
      <div className="cb-clock cb-clock-analog">
        {cfg.label ? <div className="cb-eyebrow">{cfg.label}</div> : null}
        <svg viewBox="0 0 200 200" className="cb-analog-svg" aria-hidden>
          <circle cx="100" cy="100" r="94" fill="none" stroke="var(--cb-border)" strokeWidth="2" />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = 100 + Math.sin(angle) * 82;
            const y1 = 100 - Math.cos(angle) * 82;
            const x2 = 100 + Math.sin(angle) * 90;
            const y2 = 100 - Math.cos(angle) * 90;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--cb-muted)" strokeWidth={i % 3 === 0 ? 3 : 1.5} strokeLinecap="round" />;
          })}
          <line x1="100" y1="100" x2="100" y2="56" stroke="var(--cb-text)" strokeWidth="6" strokeLinecap="round" transform={`rotate(${hourAngle} 100 100)`} />
          <line x1="100" y1="100" x2="100" y2="38" stroke="var(--cb-text)" strokeWidth="4" strokeLinecap="round" transform={`rotate(${minuteAngle} 100 100)`} />
          {cfg.showSeconds ? (
            <line x1="100" y1="108" x2="100" y2="34" stroke="var(--cb-accent)" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${secondAngle} 100 100)`} />
          ) : null}
          <circle cx="100" cy="100" r="4" fill="var(--cb-accent)" />
        </svg>
        {cfg.showDate ? <div className="cb-clock-date">{date}</div> : null}
      </div>
    );
  }

  return (
    <div className="cb-clock">
      {cfg.label ? <div className="cb-eyebrow">{cfg.label}</div> : null}
      <div className="cb-clock-time">{time}</div>
      {cfg.showDate ? <div className="cb-clock-date">{date}</div> : null}
    </div>
  );
}
