import type { Card, ImageConfig } from '@shared/types';
import { placeholderImage } from '@shared/defaults';

export function ImageCard({ card }: { card: Card }) {
  const cfg = card.config as ImageConfig;
  const url = cfg.url || placeholderImage('Add an image in Control');
  return (
    <div className="cb-photo">
      <img
        src={url}
        alt={cfg.caption || ''}
        className="cb-photo-img"
        style={{ objectFit: cfg.fit }}
        decoding="async"
      />
      {cfg.showCaption && cfg.caption?.trim() ? (
        <div className={`cb-caption cb-caption-${cfg.captionPosition}`}>
          <span>{cfg.caption}</span>
        </div>
      ) : null}
    </div>
  );
}
