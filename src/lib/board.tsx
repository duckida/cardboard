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
  const pendingRef = useRef(false);
  const latestRef = useRef<BoardConfig | null>(null);
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
      setConfig(next);
    });
    return unsub;
  }, [store]);

  const flush = useCallback(async () => {
    const target = latestRef.current;
    if (!target) return;
    try {
      await store.saveConfig(target);
      setSaveState('saved');
      setError(null);
    } catch (err) {
      setSaveState('error');
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      if (latestRef.current === target) pendingRef.current = false;
      else if (latestRef.current) void flush();
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
      latestRef.current = next;
      pendingRef.current = true;
      setSaveState('saving');
      await store.saveConfig(next);
      pendingRef.current = false;
      setSaveState('saved');
    },
    [bumpHistory, store],
  );

  const createBoard = useCallback(async () => {
    const board = defaultBoard();
    configRef.current = board;
    setConfig(board);
    setSaveState('saving');
    await store.saveConfig(board);
    setSaveState('saved');
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
