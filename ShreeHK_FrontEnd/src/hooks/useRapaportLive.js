import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRapnetLive,
  fetchRapnetHistory,
  postRapnetSnapshot,
} from "../api/services/rapnetService";
import useUIStore from "../store/Ui.Store";

const LIVE_POLL_MS = 60_000;

export default function useRapaportLive() {
  const queryClient = useQueryClient();
  const interval = useUIStore((s) => s.rapaportInterval) || "1D";

  const liveQuery = useQuery({
    queryKey: ["rapnetLive"],
    queryFn: async () => {
      try {
        await postRapnetSnapshot();
      } catch {
        /* snapshot optional when price table empty */
      }
      const res = await fetchRapnetLive();
      return res?.Data ?? res;
    },
    refetchInterval: LIVE_POLL_MS,
    staleTime: 30_000,
  });

  const historyQuery = useQuery({
    queryKey: ["rapnetHistory", interval],
    queryFn: async () => {
      const res = await fetchRapnetHistory(interval);
      return res?.Data ?? res;
    },
    refetchInterval: LIVE_POLL_MS,
    staleTime: 30_000,
  });

  const recordSnapshot = useCallback(async () => {
    await postRapnetSnapshot();
    await queryClient.invalidateQueries({ queryKey: ["rapnetLive"] });
    await queryClient.invalidateQueries({ queryKey: ["rapnetHistory"] });
  }, [queryClient]);

  const refreshAll = useCallback(async () => {
    await recordSnapshot();
    await liveQuery.refetch();
    await historyQuery.refetch();
  }, [recordSnapshot, liveQuery, historyQuery]);

  return {
    live: liveQuery.data,
    history: historyQuery.data,
    isLoading: liveQuery.isLoading || historyQuery.isLoading,
    isFetching: liveQuery.isFetching || historyQuery.isFetching,
    isError: liveQuery.isError || historyQuery.isError,
    interval,
    refreshAll,
    recordSnapshot,
  };
}
