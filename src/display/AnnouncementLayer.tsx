import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { Announcement, Theme } from '@shared/types';
import { useNow } from '@/lib/useNow';

interface Props {
  announcements: Announcement[];
  screenId?: string;
  pageId: string;
  theme: Theme;
  lite: boolean;
}

export function AnnouncementLayer({ announcements, screenId, pageId, theme, lite }: Props) {
  const now = useNow(1000);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const active = useMemo(() => {
    return announcements
      .filter((item) => !dismissed.has(item.id))
      .filter((item) => {
        if (item.startsAt && item.startsAt > now.getTime()) return false;
        if (item.expiresAt && item.expiresAt <= now.getTime()) return false;
        if (item.target.type === 'screens') return Boolean(screenId && item.target.ids.includes(screenId));
        if (item.target.type === 'pages') return item.target.ids.includes(pageId);
        return true;
      })
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [announcements, dismissed, now, pageId, screenId]);

  const current = active[0] ?? null;

  useEffect(() => {
    if (!current || current.durationSec == null) return;
    const timer = window.setTimeout(() => {
      setDismissed((set) => new Set(set).add(current.id));
    }, Math.max(1, current.durationSec) * 1000);
    return () => window.clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  const html = DOMPurify.sanitize(marked.parse(current.body || '', { async: false }) as string, {
    USE_PROFILES: { html: true },
  });

  const tone = current.tone;
  const duration = current.durationSec;
  const content = (
    <>
      {current.title ? <div className="cb-ann-title">{current.title}</div> : null}
      <div className="cb-ann-body" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );

  if (current.style === 'ticker') {
    return (
      <div className={`cb-ann cb-ann-ticker cb-tone-${tone}`}>
        <div className="cb-ticker-track">
          <div className="cb-ticker-item">{content}</div>
          <div className="cb-ticker-item" aria-hidden>{content}</div>
        </div>
      </div>
    );
  }

  if (current.style === 'banner') {
    return (
      <div className={`cb-ann cb-ann-banner cb-tone-${tone}`}>
        <div className="cb-ann-banner-inner">
          {content}
          {duration ? (
            <div
              className="cb-ann-progress"
              style={{ animationDuration: `${duration}s`, animationPlayState: lite ? 'paused' : 'running' }}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="cb-ann cb-ann-overlay">
      <div className={`cb-ann-card cb-tone-${tone}`}>
        {content}
        {duration ? (
          <div
            className="cb-ann-progress"
            style={{ animationDuration: `${duration}s`, animationPlayState: lite ? 'paused' : 'running' }}
          />
        ) : null}
      </div>
    </div>
  );
}
