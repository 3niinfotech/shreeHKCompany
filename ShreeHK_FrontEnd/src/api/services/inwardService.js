import { api } from "../client/axiosInstance";
import { ENDPOINTS } from "../../api/endpoints";

export const checkInwardExist = async (payload) => {
    const res = await api.post(ENDPOINTS.inward.checkExist, payload);
    return res.data;
};

export const saveInward = async (payload) => {
    const res = await api.post(ENDPOINTS.inward.save, payload);
    return res.data;
};
