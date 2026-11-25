import { useCallback, useState } from 'react';
import type { Asset, BoardConfig, Card } from '@shared/types';
import { FULLSCREEN_CARD_TYPES } from '@shared/types';
import { getStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { CARD_DEFS } from '@/cards/registry';
import { useFeedback } from './Feedback';

/** Keep the rotation playlist in sync with the page order. */
export function syncRotationPages(draft: BoardConfig) {
  draft.settings.rotation.pageIds = draft.pages.map((page) => page.id);
}

export function isMediaCard(card: Card) {
  return card.type === 'photo' || FULLSCREEN_CARD_TYPES.includes(card.type);
}

/** Everyday names for card types, so the control panel avoids technical words. */
export const CARD_TITLES: Record<Card['type'], string> = {
  photo: 'Photo slideshow',
  image: 'Photo',
  video: 'Video',
  iframe: 'Web page',
  markdown: 'Written message',
  clock: 'Clock',
  weather: 'Weather',
  quote: 'Quote',
  schedule: 'Timetable',
  sports: 'Sports fixtures',
  countdown: 'Countdown',
};

export function cardLabel(card: Card): string {
  const config = card.config ?? {};
  switch (card.type) {
    case 'photo':
      return config.images?.[0]?.caption?.trim() || 'Photo slideshow';
    case 'image':
      return config.caption?.trim() || 'Photo';
    case 'video':
      return 'Video';
    case 'iframe':
      return 'Web page';
    case 'markdown': {
      const line = String(config.markdown ?? '')
        .split('\n')
        .map((item) => item.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim())
        .find(Boolean);
      return line || 'Text';
    }
    case 'clock':
      return config.label?.trim() || 'Clock';
    case 'weather':
      return config.label?.trim() || 'Weather';
    case 'quote':
      return 'Quote';
    case 'schedule':
      return config.title?.trim() || 'Timetable';
    case 'sports':
      return config.title?.trim() || 'Sports fixtures';
    case 'countdown':
      return config.label?.trim() || 'Countdown';
    default:
      return 'Item';
  }
}

export function cardKind(card: Card): string {
  return CARD_TITLES[card.type] ?? CARD_DEFS[card.type]?.name ?? card.type;
}

export function cardSummary(card: Card): string {
  const config = card.config ?? {};
  switch (card.type) {
    case 'photo': {
      const count = config.images?.length ?? 0;
      if (!count) return 'No photos yet';
      const seconds = Math.max(3, Number(config.intervalSec) || 12);
      return `${count} photo${count === 1 ? '' : 's'} · ${seconds}s each`;
    }
    case 'image':
      return config.url ? 'One photo' : 'No photo yet';
    case 'video':
      return config.url ? 'Plays on a loop' : 'No video yet';
    case 'iframe':
      return config.url ? 'Embedded web page' : 'No web address yet';
    case 'markdown':
      return String(config.markdown ?? '').trim() ? 'Message text' : 'No text yet';
    case 'clock':
      return config.analog ? 'Analog face' : `${config.format === '12h' ? '12' : '24'}-hour time`;
    case 'weather': {
      const label = config.label?.trim();
      return label ? `Weather in ${label}` : 'Live weather';
    }
    case 'quote':
      return 'A quote from the collection';
    case 'schedule': {
      const days = Number(config.daysAhead) || 7;
      return `Next ${days} day${days === 1 ? '' : 's'}`;
    }
    case 'sports': {
      if (!config.url) return 'No sports calendar yet';
      const days = Number(config.daysAhead) || 14;
      return `Next ${days} day${days === 1 ? '' : 's'}`;
    }
    case 'countdown':
      return config.target ? `Until ${new Date(config.target).toLocaleDateString()}` : 'No date yet';
    default:
      return '';
  }
}

export function relativeSeen(lastSeen: number | undefined, now = Date.now()): string {
  if (!lastSeen) return 'Not connected yet';
  const diff = Math.max(0, now - lastSeen);
  if (diff < 60_000) return 'Online now';
  if (diff < 3_600_000) return `Seen ${Math.max(1, Math.round(diff / 60_000))} min ago`;
  if (diff < 86_400_000) return `Seen ${Math.round(diff / 3_600_000)} hr ago`;
  return `Seen ${Math.round(diff / 86_400_000)} days ago`;
}

export function isOnline(lastSeen: number | undefined, now = Date.now()): boolean {
  return Boolean(lastSeen && now - lastSeen < 120_000);
}

export function useImageUploader() {
  const store = getStore();
  const { getToken } = useAuth();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);

  const upload = useCallback(
    async (files: File[]): Promise<Asset[]> => {
      const images = files.filter((file) => file.type.startsWith('image/'));
      if (!images.length) {
        toast('Please choose a photo file.', 'error');
        return [];
      }
      setBusy(true);
      const uploaded: Asset[] = [];
      try {
        const token = await getToken();
        for (const file of images) {
          const asset = await store.uploadImage(file, token);
          await store.saveAsset(asset);
          uploaded.push(asset);
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : 'That photo could not be uploaded.', 'error');
      } finally {
        setBusy(false);
      }
      return uploaded;
    },
    [getToken, store, toast],
  );

  return { upload, busy };
}

export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = seconds / 60;
  return `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} minute${minutes === 1 ? '' : 's'}`;
}
