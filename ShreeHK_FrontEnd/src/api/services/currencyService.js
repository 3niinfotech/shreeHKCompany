import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchCurrencyRates = async (params) => {
    const res = await api.get(ENDPOINTS.currency.list, { params });
    return res.data;
};

export const saveCurrencyRate = async (payload) => {
    const res = await api.post(ENDPOINTS.currency.save, payload);
    return res.data;
};
