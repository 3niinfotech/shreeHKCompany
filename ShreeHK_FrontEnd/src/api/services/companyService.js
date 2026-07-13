import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchCompanies = async (params) => {
    const res = await api.get(ENDPOINTS.company.list, { params });
    return res.data;
};

export const saveCompany = async (payload) => {
    const res = await api.post(ENDPOINTS.company.save, payload);
    return res.data;
};

export const deleteCompany = async (id) => {
    const res = await api.delete(ENDPOINTS.company.delete, {
        params: { deleteId: id },
    });
    return res.data;
};

export const fetchCompanyOptions = async () => {
    const res = await api.get(ENDPOINTS.company.options);
    return res.data;
};
