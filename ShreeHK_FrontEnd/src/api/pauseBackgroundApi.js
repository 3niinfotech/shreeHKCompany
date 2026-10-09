/**
 * TEMPORARY — testing only.
 * `true` = automatic/background API polls & prefetches are paused.
 * Set back to `false` when done. Do not commit while true.
 */
export const PAUSE_BACKGROUND_API = true;

/** Use for React Query refetchInterval (false disables polling). */
export const bgRefetchInterval = (ms) => (PAUSE_BACKGROUND_API ? false : ms);
