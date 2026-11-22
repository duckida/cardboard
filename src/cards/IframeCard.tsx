import { useEffect, useState } from 'react';
import type { Card, IframeConfig } from '@shared/types';
import { useDisplay } from '@/display/DisplayContext';

export function IframeCard({ card }: { card: Card }) {
  const cfg = card.config as IframeConfig;
  const { editing } = useDisplay();
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!cfg.refreshSec || cfg.refreshSec <= 0) return;
    const timer = window.setInterval(() => setNonce((n) => n + 1), cfg.refreshSec * 1000);
    return () => window.clearInterval(timer);
  }, [cfg.refreshSec]);

  if (!cfg.url) {
    return <div className="cb-empty">Add a URL in Control. Some sites block embedding.</div>;
  }

  return (
    <iframe
      key={nonce}
      src={cfg.url}
      title={cfg.title || 'Embedded page'}
      className="cb-iframe"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
      referrerPolicy="no-referrer"
      loading="lazy"
      style={{ pointerEvents: editing ? 'none' : undefined }}
    />
  );
}
