import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchOutwardList = async (payload) => {
    const res = await api.post(ENDPOINTS.outward.list, payload);
    return res.data;
};

export const fetchOutwardProducts = async (payload) => {
    const res = await api.post(ENDPOINTS.outward.getProducts, payload);
    return res.data;
};

export const fetchOutwardById = async (id) => {
    const res = await api.get(`${ENDPOINTS.outward.getById}/?id=${id}`);
    return res.data;
};

export const deleteOutward = async (id) => {
    const res = await api.delete(ENDPOINTS.outward.delete, { params: { deleteId: id } });
    return res.data;
};

export const sendToOutward = async (payload) => {
    const res = await api.post(ENDPOINTS.outward.sendTo, payload);
    return res.data;
};
