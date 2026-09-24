import { api } from "../client/axiosInstance";
import { ENDPOINTS } from "../../api/endpoints";

export const loginUser = async (payload) => {
    const res = await api.post(ENDPOINTS.auth.login, payload);
    return res.data;
};
