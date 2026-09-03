import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client/axiosInstance";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import { toastDeleted } from "../../utils/toastNotify";
/**
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {readonly unknown[] | readonly unknown[][] | null | undefined} invalidate
 */
const runInvalidation = (queryClient, invalidate) => {
    if (!invalidate?.length) return;

    const targets = Array.isArray(invalidate[0]) ? invalidate : [invalidate];

    targets.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
    });
};

/**
 * POST mutation — mirrors usePostApiRequest behavior.
 *
 * @param {string} url
 * @param {string | readonly unknown[] | null} [invalidate]
 * @param {{ showToast?: boolean }} [defaultOptions]
 */
export const useApiPostMutation = (url, invalidate = null, defaultOptions = {}) => {
    const { showToast = true, ...mutationOptions } = defaultOptions;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload) => {
            const res = await api.post(url, payload);
            return res.data;
        },
        ...mutationOptions,
        onSuccess: (data, variables, context) => {
            runInvalidation(queryClient, invalidate);
            if (showToast) {
                if (data?.status === false) toastApiError({ response: { data } });
                else toastApiSuccess(data);
            }
            mutationOptions.onSuccess?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            if (showToast) toastApiError(error);
            mutationOptions.onError?.(error, variables, context);
        },
        onSettled: (data, error, variables, context) => {
            mutationOptions.onSettled?.(data, error, variables, context);
        },
    });
};

/**
 * PUT mutation — mirrors usePutApiRequest behavior.
 */
export const useApiPutMutation = (url, invalidate = null, defaultOptions = {}) => {
    const { showToast = true, ...mutationOptions } = defaultOptions;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, payload }) => {
            const res = await api.put(`${url}/${id}`, payload);
            return res.data;
        },
        ...mutationOptions,
        onSuccess: (data, variables, context) => {
            runInvalidation(queryClient, invalidate);
            if (showToast) {
                if (data?.status === false) toastApiError({ response: { data } });
                else toastApiSuccess(data);
            }
            mutationOptions.onSuccess?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            if (showToast) toastApiError(error);
            mutationOptions.onError?.(error, variables, context);
        },
        onSettled: (data, error, variables, context) => {
            mutationOptions.onSettled?.(data, error, variables, context);
        },
    });
};

/**
 * DELETE mutation — mirrors useDeleteApiRequest behavior.
 */
export const useApiDeleteMutation = (url, invalidate = null, defaultOptions = {}) => {
    const { showToast = true, ...mutationOptions } = defaultOptions;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            const res = await api.delete(url, { params: { deleteId: id } });
            return res.data;
        },
        ...mutationOptions,
        onSuccess: (data, variables, context) => {
            runInvalidation(queryClient, invalidate);
            if (showToast) toastDeleted(data);
            mutationOptions.onSuccess?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            if (showToast) toastApiError(error);
            mutationOptions.onError?.(error, variables, context);
        },
        onSettled: (data, error, variables, context) => {
            mutationOptions.onSettled?.(data, error, variables, context);
        },
    });
};
