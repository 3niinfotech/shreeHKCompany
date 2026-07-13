import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchCategories = async (params) => {
    const res = await api.get(ENDPOINTS.category.list, { params });
    return res.data;
};

export const saveCategory = async (payload) => {
    const res = await api.post(ENDPOINTS.category.save, payload);
    return res.data;
};

export const deleteCategory = async (id) => {
    const res = await api.delete(ENDPOINTS.category.delete, {
        params: { deleteId: id },
    });
    return res.data;
};
