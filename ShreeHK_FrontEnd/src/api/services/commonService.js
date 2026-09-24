import { api } from "../client/axiosInstance";
import { ENDPOINTS } from "../../api/endpoints";

export const fetchIncrement = async () => {
    const res = await api.get(ENDPOINTS.common.increment);
    return res.data;
};
