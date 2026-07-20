/**
 * Tiny persistence helpers over localStorage. Everything is wrapped in
 * try/catch: private-mode Safari, disabled storage, or a non-browser test
 * environment must all degrade silently to defaults rather than throw. Nothing
 * here is authoritative game state — only the furthest level reached and the
 * mute preference, both regenerable/optional.
 */

const PROGRESS_KEY = "trinity.progress";
const MUTED_KEY = "trinity.muted";

/** Best-effort storage handle; null when localStorage is unavailable. */
const store = (): Storage | null => {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null; // access itself can throw (blocked cookies/storage)
  }
};

/** Highest level index the player has reached (0-based). Defaults to 0. */
export const loadProgress = (): number => {
  try {
    const raw = store()?.getItem(PROGRESS_KEY);
    const n = raw === null || raw === undefined ? 0 : Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
};

/** Persist the furthest level reached (monotonic — never lowers the record). */
export const saveProgress = (levelIndex: number): void => {
  if (!Number.isFinite(levelIndex) || levelIndex < 0) return;
  try {
    const best = Math.max(loadProgress(), Math.floor(levelIndex));
    store()?.setItem(PROGRESS_KEY, String(best));
  } catch {
    /* ignore: persistence is best-effort */
  }
};

/** Read the persisted mute preference (default: not muted). */
export const loadMuted = (): boolean => {
  try {
    return store()?.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
};

/** Persist the mute preference. */
export const saveMuted = (muted: boolean): void => {
  try {
    store()?.setItem(MUTED_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
};
