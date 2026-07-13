import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchOrigins = async (params) => {
    const res = await api.get(ENDPOINTS.origin.list, { params });
    return res.data;
};

export const saveOrigin = async (payload) => {
    const res = await api.post(ENDPOINTS.origin.save, payload);
    return res.data;
};

export const deleteOrigin = async (id) => {
    const res = await api.delete(ENDPOINTS.origin.delete, {
        params: { deleteId: id },
    });
    return res.data;
};
