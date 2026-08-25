import axios from "axios";

const baseURL = import.meta.env.VITE_NODE_API_URL || "";

export const api = axios.create({
    baseURL: baseURL,
    timeout: 30000,
});

let cachedAuthStorageRaw = null;
let cachedContext = { token: null, companyId: null, yearId: null };

const getAuthContext = () => {
    const authData = localStorage.getItem("auth-storage");
    if (!authData) {
        cachedAuthStorageRaw = null;
        cachedContext = { token: null, companyId: null, yearId: null };
        return cachedContext;
    }

    if (authData === cachedAuthStorageRaw) {
        return cachedContext;
    }

    try {
        const parsedData = JSON.parse(authData);
        cachedAuthStorageRaw = authData;
        const state = parsedData.state || {};
        cachedContext = {
            token: state.token || null,
            companyId: state.companyId || null,
            yearId: state.yearId || null,
        };
        return cachedContext;
    } catch {
        localStorage.removeItem("auth-storage");
        cachedAuthStorageRaw = null;
        cachedContext = { token: null, companyId: null, yearId: null };
        return cachedContext;
    }
};

api.interceptors.request.use((config) => {
    const { token, companyId, yearId } = getAuthContext();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (companyId != null && companyId !== "") config.headers["X-Company-Id"] = String(companyId);
    if (yearId != null && yearId !== "") config.headers["X-Year-Id"] = String(yearId);
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
            return Promise.reject(error);
        }

        if (status === 401 && !isLoginRequest) {
            localStorage.removeItem("auth-storage");
            cachedAuthStorageRaw = null;
            cachedToken = null;
            window.location.href = "/auth/login";
        }
        return Promise.reject(error);
    }
);

export default api;
