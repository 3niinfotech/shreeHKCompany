import { api } from "../client/axiosInstance";
import { ENDPOINTS } from "../../api/endpoints";

export const bulkUpdate = async (payload) => {
    const res = await api.post(ENDPOINTS.bulk.update, payload);
    return res.data;
};
