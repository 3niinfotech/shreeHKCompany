import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchPartyWiseList = async (params) => {
    const res = await api.get(ENDPOINTS.partyWise.list, { params });
    return res.data;
};

export const savePartyWise = async (payload) => {
    const res = await api.post(ENDPOINTS.partyWise.save, payload);
    return res.data;
};

export const deletePartyWise = async (id) => {
    const res = await api.delete(ENDPOINTS.partyWise.delete, { params: { deleteId: id } });
    return res.data;
};
