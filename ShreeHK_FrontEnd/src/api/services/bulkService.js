import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const bulkUpdate = async (payload) => {
    const res = await api.post(ENDPOINTS.bulk.update, payload);
    return res.data;
};
