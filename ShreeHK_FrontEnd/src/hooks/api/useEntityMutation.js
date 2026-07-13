import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import { toastDeleted } from "../../utils/toastNotify";

export const useEntityPostMutation = (mutationFn, successKey, defaultOptions = {}) => {
    const { showToast = true, ...mutationOptions } = defaultOptions;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        ...mutationOptions,
        onSuccess: (data, variables, context) => {
            if (successKey) {
                queryClient.invalidateQueries({ queryKey: [successKey] });
            }
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

export const useEntityDeleteMutation = (mutationFn, successKey, defaultOptions = {}) => {
    const { showToast = true, ...mutationOptions } = defaultOptions;
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn,
        ...mutationOptions,
        onSuccess: (data, variables, context) => {
            if (successKey) {
                queryClient.invalidateQueries({ queryKey: [successKey] });
            }
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
