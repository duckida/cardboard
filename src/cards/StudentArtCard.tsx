import { useEffect, useMemo, useState } from 'react';
import type { Card, StudentArtConfig } from '@shared/types';
import { placeholderImage } from '@shared/defaults';
import { useDisplay } from '@/display/DisplayContext';
import { useStudentArt } from '@/lib/hooks';
import { useInterval } from '@/lib/useNow';

export function StudentArtCard({ card }: { card: Card }) {
  const cfg = card.config as StudentArtConfig;
  const { editing, lite } = useDisplay();
  const studentArt = useStudentArt();
  const images = useMemo(
    () =>
      studentArt.length
        ? [...studentArt]
            .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
            .map((item) => ({ url: item.url, caption: item.caption }))
        : [{ url: placeholderImage('Student art will appear here'), caption: '' }],
    [studentArt],
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= images.length) setIndex(0);
  }, [images.length, index]);

  useInterval(
    () => setIndex((current) => (current + 1) % images.length),
    images.length > 1 && !editing ? Math.max(3, cfg.intervalSec) * 1000 : null,
  );

  useEffect(() => {
    const next = images[(index + 1) % images.length];
    if (next?.url) {
      const img = new Image();
      img.src = next.url;
    }
  }, [index, images]);

  const active = images[index] ?? images[0];
  const caption = active?.caption?.trim();

  return (
    <div className="cb-photo">
      <img
        key={active?.url}
        src={active?.url}
        alt={caption || ''}
        className={`cb-photo-img ${cfg.kenBurns && !lite ? 'cb-kenburns' : ''}`}
        style={{ objectFit: cfg.fit }}
        decoding="async"
      />
      {cfg.showCaption && caption ? (
        <div className={`cb-caption cb-caption-${cfg.captionPosition}`}>
          <span>{caption}</span>
        </div>
      ) : null}
      {images.length > 1 ? (
        <div className="cb-photo-dots">
          {images.map((image, i) => (
            <span key={`${image.url}-${i}`} className={i === index ? 'active' : ''} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
