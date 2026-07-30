import axios from "axios";

const baseURL =
    import.meta.env.VITE_NODE_API_URL ||
    (import.meta.env.DEV ? "" : "http://localhost:3500");

export const api = axios.create({
    baseURL: baseURL,
    timeout: 30000,
});

let cachedAuthStorageRaw = null;
let cachedToken = null;

const getAuthToken = () => {
    const authData = localStorage.getItem("auth-storage");
    if (!authData) {
        cachedAuthStorageRaw = null;
        cachedToken = null;
        return null;
    }

    if (authData === cachedAuthStorageRaw) {
        return cachedToken;
    }

    try {
        const parsedData = JSON.parse(authData);
        cachedAuthStorageRaw = authData;
        cachedToken = parsedData.state?.token || null;
        return cachedToken;
    } catch {
        localStorage.removeItem("auth-storage");
        cachedAuthStorageRaw = null;
        cachedToken = null;
        return null;
    }
};

api.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || "";
        const isLoginRequest = requestUrl.includes("/user/login");

        const forbiddenCode = error.response?.data?.code;

        if (status === 403 && forbiddenCode === "FORBIDDEN_PAGE" && !isLoginRequest) {
            const skipRedirect =
                requestUrl.includes("/admin/activity-log/track") ||
                requestUrl.includes("/admin/activity-log/track-ui") ||
                requestUrl.includes("/dashboard/summary") ||
                requestUrl.includes("/master/category");
            if (!skipRedirect && !window.location.pathname.startsWith("/forbidden")) {
                window.location.href = "/forbidden";
            }
            return Promise.reject(error);
        }

        if ((status === 401 || status === 403) && !isLoginRequest) {
            localStorage.removeItem("auth-storage");
            cachedAuthStorageRaw = null;
            cachedToken = null;
            window.location.href = "/auth/login";
        }
        return Promise.reject(error);
    }
);

export default api;
