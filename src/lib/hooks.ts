import { useEffect, useState } from 'react';
import type { Announcement, Asset, ScheduleMeta, Screen } from '@shared/types';
import { getStore } from './store';

export function useScreens(): Screen[] {
  const [items, setItems] = useState<Screen[]>([]);
  useEffect(() => getStore().subscribeScreens(setItems), []);
  return items;
}

export function useAnnouncements(): Announcement[] {
  const [items, setItems] = useState<Announcement[]>([]);
  useEffect(() => getStore().subscribeAnnouncements(setItems), []);
  return items;
}

export function useAssets(): Asset[] {
  const [items, setItems] = useState<Asset[]>([]);
  useEffect(() => getStore().subscribeAssets(setItems), []);
  return items;
}

export function useScheduleMeta(): ScheduleMeta | null {
  const [meta, setMeta] = useState<ScheduleMeta | null>(null);
  useEffect(() => getStore().subscribeScheduleMeta(setMeta), []);
  return meta;
}
