import { useEffect, useRef } from 'react';
import type { Card, VideoConfig } from '@shared/types';

export function VideoCard({ card }: { card: Card }) {
  const cfg = card.config as VideoConfig;
  const ref = useRef<HTMLVideoElement>(null);

  // Some browsers ignore the muted attribute on first render, which makes
  // autoplay fail. Setting this property before play() keeps silent looping
  // videos working on TVs.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = cfg.muted;
    if (cfg.url) void video.play().catch(() => undefined);
  }, [cfg.url, cfg.muted]);

  if (!cfg.url) {
    return <div className="cb-empty">Add a video URL in Control. Direct MP4 or WebM files work best.</div>;
  }

  return (
    <div className="cb-video">
      <video
        key={cfg.url}
        ref={ref}
        src={cfg.url}
        poster={cfg.poster || undefined}
        className="cb-video-el"
        style={{ objectFit: cfg.fit }}
        autoPlay
        playsInline
        muted={cfg.muted}
        loop={cfg.loop}
        controls={cfg.controls}
        preload="auto"
      />
    </div>
  );
}
