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

export const sendAgentQuery = (payload) =>
  postAi(ENDPOINTS.ai.agentQuery, payload);

export const fetchUserThreads = async () => {
  const res = await api.get(ENDPOINTS.ai.threads);
  return res.data;
};

export const fetchThreadHistory = async (threadId) => {
  const res = await api.get(ENDPOINTS.ai.threadDetail(threadId));
  return res.data;
};

export const deleteUserThread = async (threadId) => {
  const res = await api.delete(ENDPOINTS.ai.threadDetail(threadId));
  return res.data;
};

export const fetchBarcodeLookup = (payload) =>
  postAi(ENDPOINTS.ai.barcodeLookup, payload);

