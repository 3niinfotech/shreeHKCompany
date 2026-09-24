import { api } from "../client/axiosInstance";
import { ENDPOINTS } from "../../api/endpoints";

export const fetchOutstandingReport = async (payload) => {
    const res = await api.post(ENDPOINTS.report.outstanding, payload);
    return res.data;
};
