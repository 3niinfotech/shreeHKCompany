import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchProfile = async () => {
    const res = await api.get(ENDPOINTS.profile.me);
    return res.data;
};

export const updateProfile = async (payload) => {
    const res = await api.post(ENDPOINTS.profile.update, payload);
    return res.data;
};

export const changePassword = async (payload) => {
    const res = await api.post(ENDPOINTS.profile.changePassword, payload);
    return res.data;
};
