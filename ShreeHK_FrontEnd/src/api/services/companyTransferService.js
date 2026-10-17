import { api } from "../client/axiosInstance";
import { ENDPOINTS } from "../endpoints";

export const executeCompanyTransfer = async (payload) => {
  const res = await api.post(ENDPOINTS.companyTransfer.create, payload);
  return res.data;
};

export const fetchCompanyTransferList = async (params = {}) => {
  const res = await api.get(ENDPOINTS.companyTransfer.list, { params });
  return res.data;
};

export const fetchCompanyTransferById = async (id) => {
  const res = await api.get(ENDPOINTS.companyTransfer.getById(id));
  return res.data;
};

export const executeTransferSaleReturn = async (payload) => {
  const res = await api.post(ENDPOINTS.companyTransfer.return, payload);
  return res.data;
};
