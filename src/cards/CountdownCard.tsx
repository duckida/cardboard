import type { Card, CountdownConfig } from '@shared/types';
import { useNow } from '@/lib/useNow';

export function CountdownCard({ card }: { card: Card }) {
  const cfg = card.config as CountdownConfig;
  const now = useNow(1000);
  const target = cfg.target ? new Date(cfg.target) : null;
  if (!target || Number.isNaN(target.getTime())) {
    return <div className="cb-empty">Set a target date in Control.</div>;
  }
  const diff = Math.max(0, target.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return (
    <div className="cb-countdown">
      <div className="cb-eyebrow">{cfg.label}</div>
      {diff === 0 ? (
        <div className="cb-countdown-now">Now</div>
      ) : (
        <div className="cb-countdown-row">
          {cfg.showDays ? (
            <div className="cb-countdown-unit">
              <strong>{days}</strong>
              <span>days</span>
            </div>
          ) : null}
          <div className="cb-countdown-unit">
            <strong>{hours}</strong>
            <span>hrs</span>
          </div>
          <div className="cb-countdown-unit">
            <strong>{minutes}</strong>
            <span>min</span>
          </div>
          <div className="cb-countdown-unit">
            <strong>{seconds}</strong>
            <span>sec</span>
          </div>
        </div>
      )}
    </div>
  );
}
