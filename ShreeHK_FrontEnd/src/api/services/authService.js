import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const loginUser = async (payload) => {
    const res = await api.post(ENDPOINTS.auth.login, payload);
    return res.data;
};
