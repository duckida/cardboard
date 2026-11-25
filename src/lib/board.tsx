import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { BoardConfig } from '@shared/types';
import { defaultBoard } from '@shared/defaults';
import { mergeBoardConfig } from '@shared/merge';
import { normalizeBoardConfig } from '@shared/normalize';
import { getStore } from './store';
import { useAuth } from './auth';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface BoardContextValue {
  config: BoardConfig | null;
  loading: boolean;
  saveState: SaveState;
  error: string | null;
  canUndo: boolean;
  canRedo: boolean;
  mutate: (fn: (draft: BoardConfig) => void | BoardConfig, options?: { history?: boolean }) => void;
  beginHistory: () => void;
  replaceConfig: (next: unknown) => Promise<void>;
  createBoard: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  saveNow: () => Promise<void>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => getStore(), []);
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState<BoardConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);

  const configRef = useRef<BoardConfig | null>(null);
  /** The server copy the local state is based on, used for conflict merging. */
  const baseRef = useRef<BoardConfig | null>(null);
  const pendingRef = useRef(false);
  const latestRef = useRef<BoardConfig | null>(null);
  const savingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const undoRef = useRef<BoardConfig[]>([]);
  const redoRef = useRef<BoardConfig[]>([]);
  const lastHistoryAt = useRef(0);

  useEffect(() => {
    const unsub = store.subscribeConfig((raw) => {
      setLoading(false);
      if (!raw) {
        if (!pendingRef.current) {
          configRef.current = null;
          baseRef.current = null;
          setConfig(null);
        }
        return;
      }
      if (pendingRef.current) return;
      // Older or partially-written board docs can be missing fields (settings,
      // theme, rotation…). Normalising on read keeps every consumer safe.
      let next: BoardConfig;
      try {
        next = normalizeBoardConfig(raw);
      } catch {
        next = defaultBoard();
      }
      configRef.current = next;
      baseRef.current = next;
      setConfig(next);
    });
    return unsub;
  }, [store]);

  const flush = useCallback(async () => {
    // One write at a time. Two overlapping whole-document writes could land
    // out of order on a slow connection and silently undo the newest edit.
    if (savingRef.current) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!latestRef.current) return;

    savingRef.current = true;
    try {
      while (latestRef.current && pendingRef.current) {
        const target: BoardConfig = latestRef.current;
        setSaveState('saving');
        try {
          const written = await store.saveConfig(target, { base: baseRef.current });
          baseRef.current = written;
          if (latestRef.current === target) {
            // Another device may have changed the board while we saved; adopt
            // the merged result so those changes appear here too.
            if (written !== target) {
              configRef.current = written;
              latestRef.current = written;
              setConfig(written);
            }
            pendingRef.current = false;
            setSaveState('saved');
            setError(null);
          } else {
            // Edits arrived during the save — rebase them onto what the server
            // now holds and save again, instead of dropping either side.
            const rebased = mergeBoardConfig(target, latestRef.current, written);
            configRef.current = rebased;
            latestRef.current = rebased;
            setConfig(rebased);
          }
        } catch (err) {
          setSaveState('error');
          setError(err instanceof Error ? err.message : 'Could not save.');
          // Leave the edit pending. It stays on screen and retries on the next
          // change or when the connection returns instead of being replaced by
          // the older server copy.
          return;
        }
      }
    } finally {
      savingRef.current = false;
    }
  }, [store]);

  const queueSave = useCallback(
    (next: BoardConfig) => {
      latestRef.current = next;
      pendingRef.current = true;
      setSaveState('saving');
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void flush(), 280);
    },
    [flush],
  );

  const bumpHistory = useCallback(() => setHistoryTick((t) => t + 1), []);

  const pushHistory = useCallback(
    (prev: BoardConfig, force = false) => {
      const now = Date.now();
      if (!force && now - lastHistoryAt.current < 700) return;
      lastHistoryAt.current = now;
      undoRef.current.push(prev);
      if (undoRef.current.length > 60) undoRef.current.shift();
      redoRef.current = [];
      bumpHistory();
    },
    [bumpHistory],
  );

  const beginHistory = useCallback(() => {
    const current = configRef.current;
    if (current) pushHistory(current, true);
  }, [pushHistory]);

  const mutate = useCallback(
    (fn: (draft: BoardConfig) => void | BoardConfig, options?: { history?: boolean }) => {
      const prev = configRef.current;
      if (!prev) return;
      const draft = structuredClone(prev);
      const result = fn(draft);
      const next = (result ?? draft) as BoardConfig;
      next.version = prev.version + 1;
      next.updatedAt = Date.now();
      if (options?.history !== false) pushHistory(prev);
      configRef.current = next;
      setConfig(next);
      queueSave(next);
    },
    [pushHistory, queueSave],
  );

  const replaceConfig = useCallback(
    async (raw: unknown) => {
      const next = normalizeBoardConfig(raw);
      next.version = (configRef.current?.version ?? 0) + 1;
      next.updatedAt = Date.now();
      configRef.current = next;
      setConfig(next);
      undoRef.current = [];
      redoRef.current = [];
      bumpHistory();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      latestRef.current = next;
      pendingRef.current = true;
      setSaveState('saving');
      const written = await store.saveConfig(next, { replace: true });
      configRef.current = written;
      baseRef.current = written;
      latestRef.current = written;
      setConfig(written);
      pendingRef.current = false;
      setSaveState('saved');
    },
    [bumpHistory, store],
  );

  const createBoard = useCallback(async () => {
    const board = defaultBoard();
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setSaveState('saving');
    try {
      // Only creates when the server really has no board. If one already
      // exists (a cold cache used to look empty) we adopt it instead of
      // overwriting pages, settings and the calendar link with defaults.
      const active = normalizeBoardConfig(await store.ensureBoard(board));
      configRef.current = active;
      baseRef.current = active;
      latestRef.current = active;
      setConfig(active);
      pendingRef.current = false;
      setSaveState('saved');
      setError(null);
    } catch (err) {
      setSaveState('error');
      setError(err instanceof Error ? err.message : 'Could not create the board.');
    }
  }, [store]);

  const applyHistory = useCallback(
    (from: BoardConfig[], to: BoardConfig[]) => {
      const target = from.pop();
      const current = configRef.current;
      if (!target || !current) return;
      to.push(current);
      target.version = current.version + 1;
      target.updatedAt = Date.now();
      configRef.current = target;
      setConfig(target);
      queueSave(target);
      bumpHistory();
    },
    [bumpHistory, queueSave],
  );

  const undo = useCallback(() => applyHistory(undoRef.current, redoRef.current), [applyHistory]);
  const redo = useCallback(() => applyHistory(redoRef.current, undoRef.current), [applyHistory]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    await flush();
  }, [flush]);

  // Don't lose the last keystroke when someone closes the tab, switches apps
  // or the phone locks during the 280ms debounce.
  useEffect(() => {
    const hide = () => {
      if (pendingRef.current) void flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hide();
    };
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', hide);
    return () => {
      window.removeEventListener('pagehide', hide);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', hide);
      if (pendingRef.current) void flush();
    };
  }, [flush]);

  useEffect(() => {
    if (!isAdmin || config || loading || store.mode !== 'local') return;
    // Local demo store seeds itself; this is a safety net.
    void createBoard();
  }, [isAdmin, config, loading, store.mode, createBoard]);

  const value = useMemo<BoardContextValue>(
    () => ({
      config,
      loading,
      saveState,
      error,
      canUndo: undoRef.current.length > 0,
      canRedo: redoRef.current.length > 0,
      mutate,
      beginHistory,
      replaceConfig,
      createBoard,
      undo,
      redo,
      saveNow,
    }),
    [
      config,
      loading,
      saveState,
      error,
      historyTick,
      mutate,
      beginHistory,
      replaceConfig,
      createBoard,
      undo,
      redo,
      saveNow,
    ],
  );

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used inside BoardProvider');
  return ctx;
}
