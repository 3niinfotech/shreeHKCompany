import { useQuery } from "@tanstack/react-query";

const useEntityList = (queryKey, fetchFn, params = {}, options = {}) => {
    return useQuery({
        queryKey: [queryKey, params],
        queryFn: () => fetchFn(params),
        staleTime: 5 * 60 * 1000,
        placeholderData: (previousData) => previousData,
        ...options,
    });
};

export default useEntityList;
