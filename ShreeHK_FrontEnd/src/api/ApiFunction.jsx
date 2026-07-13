import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./axiosInstance";
import { toastApiSuccess, toastApiError } from "../utils/apiToast";
import { toastDeleted } from "../utils/toastNotify";

/**
 * 1. GET Hook - Data fetch karne ke liye
 * @param {string} key - Unique key for caching (e.g., 'users')
 * @param {string} url - API Endpoint
 * @param {object} params - Query parameters (filters, pagination)
 */
export const useFetchApi = (key, url, params = {}, method = 'GET', options = {}) => {
    return useQuery({
        queryKey: [key, url, params, method],
        queryFn: async () => {
            if (method.toUpperCase() === 'POST') {
                const res = await api.post(url, params);
                return res.data;
            } else {
                const res = await api.get(url, { params });
                return res.data;
            }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        placeholderData: (previousData) => previousData,
        ...options,
    });
};

/**
 * 2. POST Hook - Naya data create karne ke liye
 * @param {string} url - API Endpoint
 * @param {string} successKey - Key to invalidate/refresh after success
 * @param {{ showToast?: boolean }} options - showToast false for read-only POST (reports)
 */
export const usePostApiRequest = (url, successKey, options = {}) => {
    const { showToast = true } = options;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => {
            const res = await api.post(url, payload);
            return res.data;
        },
        onSuccess: (data) => {
            if (successKey) {
                queryClient.invalidateQueries({ queryKey: [successKey] });
            }
            if (showToast) {
                if (data?.status === false) toastApiError({ response: { data } });
                else toastApiSuccess(data);
            }
        },
        onError: (error) => {
            if (showToast) toastApiError(error);
        }
    });
};

/**
 * 3. PUT Hook - Data update karne ke liye
 * @param {string} url - API Endpoint (base url without ID)
 * @param {string} successKey - Key to refresh
 * @param {{ showToast?: boolean }} options
 */
export const usePutApiRequest = (url, successKey, options = {}) => {
    const { showToast = true } = options;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }) => {
            const res = await api.put(`${url}/${id}`, payload);
            return res.data;
        },
        onSuccess: (data) => {
            if (successKey) {
                queryClient.invalidateQueries({ queryKey: [successKey] });
            }
            if (showToast) {
                if (data?.status === false) toastApiError({ response: { data } });
                else toastApiSuccess(data);
            }
        },
        onError: (error) => {
            if (showToast) toastApiError(error);
        }
    });
};

/**
 * 4. DELETE Hook - Data delete karne ke liye
 * @param {string} url - API Endpoint (base url without ID)
 * @param {string} successKey - Key to refresh
 * @param {{ showToast?: boolean }} options
 */
export const useDeleteApiRequest = (url, successKey, options = {}) => {
    const { showToast = true } = options;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            const res = await api.delete(url, {
                params: { deleteId: id }
            });
            return res.data;
        },
        onSuccess: (data) => {
            if (successKey) {
                queryClient.invalidateQueries({ queryKey: [successKey] });
            }
            if (showToast) toastDeleted(data);
        },
        onError: (error) => {
            if (showToast) toastApiError(error);
        }
    });
};
