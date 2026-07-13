import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchBalanceList = async (params) => {
    const res = await api.get(ENDPOINTS.balance.list, { params });
    return res.data;
};

export const saveBalanceBook = async (payload) => {
    const res = await api.post(ENDPOINTS.balance.book, payload);
    return res.data;
};

export const deleteBalance = async (id) => {
    const res = await api.delete(ENDPOINTS.balance.delete, { params: { deleteId: id } });
    return res.data;
};
