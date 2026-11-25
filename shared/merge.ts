import type { BoardConfig } from './types';

type Dict = Record<string, any>;

function isPlainObject(value: unknown): value is Dict {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function has(object: Dict, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => has(b, key) && deepEqual(a[key], b[key]));
  }
  return false;
}

function arrayIds(list: unknown[]): string[] {
  return list.map((item) => (isPlainObject(item) && typeof item.id === 'string' ? item.id : ''));
}

function indexById(list: unknown[]): Map<string, unknown> {
  const map = new Map<string, unknown>();
  for (const item of list) {
    if (isPlainObject(item) && typeof item.id === 'string') map.set(item.id, item);
  }
  return map;
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * Merges an array of objects that all carry an `id` (pages and cards do).
 * Additions and edits from both sides survive; only a true same-field clash
 * falls back to the local value.
 */
function mergeArrays(base: unknown[], local: unknown[], remote: unknown[]): unknown[] {
  const mergeable =
    [base, local, remote].every((list) =>
      list.every((item) => isPlainObject(item) && typeof item.id === 'string'),
    );
  if (!mergeable) return clone(local);

  const baseMap = indexById(base);
  const localMap = indexById(local);
  const remoteMap = indexById(remote);
  const baseIds = arrayIds(base);
  const localIds = arrayIds(local);
  const remoteIds = arrayIds(remote);

  // Preserve the order of whichever side actually reordered. Otherwise follow
  // the remote order and append anything only this device added.
  const localReordered = !sameOrder(baseIds, localIds);
  const remoteReordered = !sameOrder(baseIds, remoteIds);
  const order = localReordered && !remoteReordered
    ? [...localIds, ...remoteIds.filter((id) => !localMap.has(id))]
    : [...remoteIds, ...localIds.filter((id) => !remoteMap.has(id))];

  const result: unknown[] = [];
  for (const id of order) {
    const inBase = baseMap.has(id);
    const inLocal = localMap.has(id);
    const inRemote = remoteMap.has(id);

    if (!inLocal) {
      // Removed on this device. Keep it only if another device edited it.
      if (inRemote && !deepEqual(remoteMap.get(id), baseMap.get(id))) {
        result.push(clone(remoteMap.get(id)));
      }
      continue;
    }
    if (!inRemote) {
      // Removed on another device. Keep ours only if we edited it.
      if (!inBase || !deepEqual(localMap.get(id), baseMap.get(id))) {
        result.push(clone(localMap.get(id)));
      }
      continue;
    }
    result.push(
      mergeValue(baseMap.get(id), localMap.get(id), remoteMap.get(id)),
    );
  }
  return result;
}

/**
 * Three-way merge. `base` is the last remote value this device started from,
 * `local` is what it wants to save and `remote` is what the server has now.
 * When only one side changed we take that side; when both changed we recurse
 * into objects and merge id-carrying arrays. Local wins genuine primitive
 * clashes, because the person in front of this screen expects their edit.
 */
export function mergeValue(base: unknown, local: unknown, remote: unknown): any {
  if (deepEqual(local, base)) return clone(remote);
  if (deepEqual(remote, base)) return clone(local);
  if (deepEqual(local, remote)) return clone(local);

  if (isPlainObject(local) && isPlainObject(remote)) {
    const baseObject = isPlainObject(base) ? base : {};
    const result: Dict = {};
    const keys = new Set([...Object.keys(baseObject), ...Object.keys(local), ...Object.keys(remote)]);

    for (const key of keys) {
      const inBase = has(baseObject, key);
      const inLocal = has(local, key);
      const inRemote = has(remote, key);

      if (!inLocal && !inRemote) continue;

      if (!inLocal) {
        // Deleted locally. Restore it only if the other device changed it.
        if (inRemote && (!inBase || !deepEqual(remote[key], baseObject[key]))) {
          result[key] = clone(remote[key]);
        }
        continue;
      }

      if (!inRemote) {
        // Deleted remotely. Keep it only if we changed it.
        if (!inBase || !deepEqual(local[key], baseObject[key])) {
          result[key] = clone(local[key]);
        }
        continue;
      }

      result[key] = mergeValue(baseObject[key], local[key], remote[key]);
    }
    return result;
  }

  if (Array.isArray(local) && Array.isArray(remote)) {
    return mergeArrays(Array.isArray(base) ? base : [], local, remote);
  }

  return clone(local);
}

/**
 * Merges unsaved local edits with a newer server board. Used both when a save
 * discovers another writer and when a new snapshot lands mid-edit, so adding a
 * background on one device no longer erases a calendar link set on another.
 */
export function mergeBoardConfig(
  base: BoardConfig | null,
  local: BoardConfig,
  remote: BoardConfig,
): BoardConfig {
  if (!base) {
    return {
      ...clone(local),
      version: Math.max(local.version, remote.version) + 1,
      updatedAt: Date.now(),
    };
  }

  return {
    schemaVersion: remote.schemaVersion ?? local.schemaVersion,
    version: Math.max(base.version, local.version, remote.version) + 1,
    updatedAt: Date.now(),
    settings: mergeValue(base.settings, local.settings, remote.settings),
    theme: mergeValue(base.theme, local.theme, remote.theme),
    pages: mergeValue(base.pages, local.pages, remote.pages),
  };
}
