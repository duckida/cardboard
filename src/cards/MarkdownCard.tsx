import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Card, MarkdownConfig } from '@shared/types';

marked.setOptions({ gfm: true, breaks: true });

export function MarkdownCard({ card }: { card: Card }) {
  const cfg = card.config as MarkdownConfig;
  const html = useMemo(() => {
    if (!cfg.markdown?.trim()) return '<p class="cb-muted">Add some markdown in Control.</p>';
    const raw = marked.parse(cfg.markdown, { async: false }) as string;
    return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  }, [cfg.markdown]);

  return <div className="cb-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
