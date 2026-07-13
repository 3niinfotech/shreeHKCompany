import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

/**
 * Hold or unhold products — port of PHP Puthold() → outwardController fn=hold
 * @param {{ ids: number[], status: 0|1, date?: string, description?: string }} payload
 */
export const postProductHold = async (payload) => {
  const res = await api.post(ENDPOINTS.outward.hold, payload);
  return res.data;
};

export const fetchHoldDetail = async (productId) => {
  const res = await api.get(ENDPOINTS.product.holdDetail, {
    params: { productId },
  });
  return res.data;
};
