import { useApiQuery } from "../../api/query/useApiQuery";

const useEntityList = (queryKey, fetchFn, params = {}, options = {}) => {
    return useApiQuery({
        queryKey: [queryKey, params],
        queryFn: () => fetchFn(params),
        ...options,
    });
};

export default useEntityList;
