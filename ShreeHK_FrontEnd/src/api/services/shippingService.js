import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchShipping = async (params) => {
    const res = await api.get(ENDPOINTS.shipping.list, { params });
    return res.data;
};

export const saveShipping = async (payload) => {
    const res = await api.post(ENDPOINTS.shipping.save, payload);
    return res.data;
};

export const deleteShipping = async (id) => {
    const res = await api.delete(ENDPOINTS.shipping.delete, {
        params: { deleteId: id },
    });
    return res.data;
};
