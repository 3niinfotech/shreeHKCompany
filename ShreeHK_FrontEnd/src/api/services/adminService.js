import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchAdminUsers = async (params) => {
    const res = await api.get(ENDPOINTS.admin.users, { params });
    return res.data;
};

export const saveAdminUser = async (payload) => {
    const res = await api.post(ENDPOINTS.admin.saveUser, payload);
    return res.data;
};

export const deleteAdminUser = async (id) => {
    const res = await api.delete(ENDPOINTS.admin.deleteUser, { params: { deleteId: id } });
    return res.data;
};

export const fetchRoleList = async () => {
    const res = await api.get(ENDPOINTS.role.list);
    return res.data;
};

export const addRole = async (payload) => {
    const res = await api.post(ENDPOINTS.role.add, payload);
    return res.data;
};

export const updateRole = async (id, payload) => {
    const res = await api.put(`${ENDPOINTS.role.update}/${id}`, payload);
    return res.data;
};

export const deleteRole = async (id) => {
    const res = await api.delete(ENDPOINTS.role.delete, { params: { deleteId: id } });
    return res.data;
};
