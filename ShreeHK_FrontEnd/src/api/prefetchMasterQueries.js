import { api } from "./axiosInstance";
import { ENDPOINTS } from "../constants/endpoints";

const STALE_MS = 5 * 60 * 1000;
const GC_MS = 30 * 60 * 1000;

const prefetchGet = (queryClient, key, url, params = {}) =>
  queryClient.prefetchQuery({
    queryKey: [key, url, params, "GET"],
    queryFn: async () => {
      const res = await api.get(url, { params });
      return res.data;
    },
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });

export const prefetchMasterQueries = (queryClient) => {
  if (!queryClient) return;
  prefetchGet(queryClient, "GetCompany", ENDPOINTS.company.options, {});
  prefetchGet(queryClient, "inventoryCategoryOptions", ENDPOINTS.category.list, {
    limit: 500,
    offset: 0,
  });
};
