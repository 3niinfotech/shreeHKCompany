import { useQuery } from "@tanstack/react-query";

const DEFAULT_STALE_MS = 5 * 60 * 1000;
const DEFAULT_GC_MS = 30 * 60 * 1000;

/**
 * Thin TanStack Query wrapper for GET (and read-only POST) fetches.
 * Used by feature *.queries.js files — not imported by pages directly during migration.
 *
 * @param {object} config
 * @param {readonly unknown[]} config.queryKey - Hierarchical key from queryKeys.*
 * @param {() => Promise<unknown>} config.queryFn
 * @param {number} [config.staleTime]
 * @param {number} [config.gcTime]
 * @param {boolean | ((prev: unknown) => unknown)} [config.placeholderData]
 * @param {object} [config.options] - remaining useQuery options
 */
export const useApiQuery = ({
    queryKey,
    queryFn,
    staleTime = DEFAULT_STALE_MS,
    gcTime = DEFAULT_GC_MS,
    placeholderData = (previousData) => previousData,
    ...options
}) => {
    return useQuery({
        queryKey,
        queryFn,
        staleTime,
        gcTime,
        placeholderData,
        ...options,
    });
};

export default useApiQuery;
