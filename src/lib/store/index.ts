import { auth, db, firebaseConfigured } from '../firebase';
import { FirebaseStore } from './firebase';
import { LocalStore } from './local';
import type { BoardStore } from './types';

export const DEMO = !firebaseConfigured || import.meta.env.VITE_DEMO === '1';
export const BOARD_ID = import.meta.env.VITE_BOARD_ID || 'main';

let singleton: BoardStore | null = null;

export function createStore(): BoardStore {
  if (singleton) return singleton;
  if (!DEMO && auth && db) {
    singleton = new FirebaseStore(db, auth, BOARD_ID);
  } else {
    singleton = new LocalStore();
  }
  return singleton;
}

export function getStore(): BoardStore {
  return createStore();
}

export { LocalStore, FirebaseStore };
export type { BoardStore };
