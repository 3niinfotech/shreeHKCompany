import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchLabs = async (params) => {
    const res = await api.get(ENDPOINTS.lab.list, { params });
    return res.data;
};

export const saveLab = async (payload) => {
    const res = await api.post(ENDPOINTS.lab.save, payload);
    return res.data;
};

export const deleteLab = async (id) => {
    const res = await api.delete(ENDPOINTS.lab.delete, {
        params: { deleteId: id },
    });
    return res.data;
};
