import { createContext, useContext } from 'react';
import type { Theme } from '@shared/types';

export interface DisplayContextValue {
  theme: Theme;
  lite: boolean;
  editing: boolean;
  screenId?: string;
  pageId: string;
}

export const DisplayContext = createContext<DisplayContextValue>({
  theme: {} as Theme,
  lite: false,
  editing: false,
  pageId: '',
});

export function useDisplay() {
  return useContext(DisplayContext);
}
