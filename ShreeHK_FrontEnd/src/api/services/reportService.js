import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchOutstandingReport = async (payload) => {
    const res = await api.post(ENDPOINTS.report.outstanding, payload);
    return res.data;
};
