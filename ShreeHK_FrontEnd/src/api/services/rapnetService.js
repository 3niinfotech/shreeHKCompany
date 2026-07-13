import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchRapnetPrices = async (params) => {
    const res = await api.get(ENDPOINTS.rapnet.prices, { params });
    return res.data;
};

export const updateRapnetPrice = async () => {
    const res = await api.get(ENDPOINTS.rapnet.updatePrice);
    return res.data;
};

export const fetchRapnetLive = async () => {
    const res = await api.get(ENDPOINTS.rapnet.live);
    return res.data;
};

export const fetchRapnetHistory = async (interval = "1D") => {
    const res = await api.get(ENDPOINTS.rapnet.history, { params: { interval } });
    return res.data;
};

export const postRapnetSnapshot = async () => {
    const res = await api.post(ENDPOINTS.rapnet.snapshot);
    return res.data;
};
