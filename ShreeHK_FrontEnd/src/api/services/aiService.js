import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

const postAi = async (url, payload = {}) => {
  const res = await api.post(url, payload, { timeout: 60000 });
  return res.data;
};

export const fetchStockAlert = (payload) =>
  postAi(ENDPOINTS.ai.stockAlert, payload);

export const fetchPriceSuggest = (payload) =>
  postAi(ENDPOINTS.ai.priceSuggest, payload);

export const fetchSalesReport = (payload) =>
  postAi(ENDPOINTS.ai.salesReport, payload);

export const fetchCustomerInsight = (payload) =>
  postAi(ENDPOINTS.ai.customerInsight, payload);

export const sendAiChat = (payload) =>
  postAi(ENDPOINTS.ai.chat, payload);

export const fetchBarcodeLookup = (payload) =>
  postAi(ENDPOINTS.ai.barcodeLookup, payload);
