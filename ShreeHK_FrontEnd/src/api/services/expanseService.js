import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchExpanseList = async (params) => {
    const res = await api.get(ENDPOINTS.expanse.list, { params });
    return res.data;
};

export const saveExpansePayment = async (payload) => {
    const res = await api.post(ENDPOINTS.expanse.payment, payload);
    return res.data;
};

export const deleteExpanse = async (id) => {
    const res = await api.delete(ENDPOINTS.expanse.delete, { params: { deleteId: id } });
    return res.data;
};

export const saveAdvancePayment = async (payload) => {
    const res = await api.post(ENDPOINTS.advance.payment, payload);
    return res.data;
};
