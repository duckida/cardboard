import type { Card, QuoteConfig } from '@shared/types';
import { quoteFor } from '@shared/quotes';

export function QuoteCard({ card }: { card: Card }) {
  const cfg = card.config as QuoteConfig;
  const now = new Date();
  const seed =
    cfg.mode === 'hourly'
      ? now.getFullYear() * 100000 + (now.getMonth() + 1) * 1000 + now.getDate() * 24 + now.getHours()
      : now.getFullYear() * 1000 + now.getMonth() * 40 + now.getDate();
  const quote = quoteFor(seed);

  return (
    <div className="cb-quote">
      <div className="cb-quote-mark">“</div>
      <blockquote>{quote.text}</blockquote>
      {cfg.showAuthor ? <div className="cb-quote-author">— {quote.author}</div> : null}
    </div>
  );
}
