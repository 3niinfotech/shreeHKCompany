import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchIncrement = async () => {
    const res = await api.get(ENDPOINTS.common.increment);
    return res.data;
};
