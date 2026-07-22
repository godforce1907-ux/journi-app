/**
 * Polyfill for `window.storage`.
 *
 * The app was originally built inside a Claude.ai "artifact," which provides
 * a built-in `window.storage` key-value API (get/set/delete/list) backed by
 * a real per-user datastore, with an optional `shared` flag for data visible
 * to all users of the artifact.
 *
 * Outside that environment there is no such API, no backend, and no concept
 * of "the current user" — so this polyfill backs the same interface with
 * plain browser localStorage instead. This means:
 *
 *   - Data persists per-browser, per-device only. It will NOT sync across
 *     devices or be visible to other people, unlike the original artifact
 *     runtime.
 *   - The `shared` parameter is accepted for API compatibility but has no
 *     real effect here (there is no multi-user backend to share data with).
 *   - `App.jsx` itself required ZERO changes to run against this shim — it
 *     was already written defensively (every storage call is wrapped in
 *     try/catch), which is exactly what makes this drop-in replacement safe.
 *
 * Replace this file with a real backend-backed implementation whenever
 * JOURNI moves beyond a local prototype — see README.md.
 */

const PREFIX = "journi:";

function fullKey(key, shared) {
  return `${PREFIX}${shared ? "shared:" : "user:"}${key}`;
}

async function get(key, shared = false) {
  const raw = localStorage.getItem(fullKey(key, shared));
  if (raw === null) {
    // Matches the documented artifact behavior: accessing a non-existent
    // key throws rather than resolving to null.
    throw new Error(`Key not found: ${key}`);
  }
  return { key, value: raw, shared };
}

async function set(key, value, shared = false) {
  localStorage.setItem(fullKey(key, shared), value);
  return { key, value, shared };
}

async function del(key, shared = false) {
  const existed = localStorage.getItem(fullKey(key, shared)) !== null;
  localStorage.removeItem(fullKey(key, shared));
  return { key, deleted: existed, shared };
}

async function list(prefix = "", shared = false) {
  const scope = `${PREFIX}${shared ? "shared:" : "user:"}`;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(scope + prefix)) {
      keys.push(k.slice(scope.length));
    }
  }
  return { keys, prefix, shared };
}

export function installStorageShim() {
  if (typeof window !== "undefined" && !window.storage) {
    window.storage = { get, set, delete: del, list };
  }
}
