import { api } from "../client/axiosInstance";
import { ENDPOINTS } from "../endpoints";

let inFlightCompanyYears = null;
let cachedCompanyYears = null;

/**
 * Fetch company-years metadata with in-flight promise deduplication and memory caching.
 * Prevents multiple parallel requests at login or during context resolution.
 */
export const fetchCompanyYears = async (force = false) => {
  if (!force && cachedCompanyYears) {
    return cachedCompanyYears;
  }

  if (!inFlightCompanyYears) {
    inFlightCompanyYears = api
      .get(ENDPOINTS.portal.companyYears)
      .then((res) => {
        cachedCompanyYears = res;
        inFlightCompanyYears = null;
        return res;
      })
      .catch((err) => {
        inFlightCompanyYears = null;
        throw err;
      });
  }

  return inFlightCompanyYears;
};

export const clearCompanyYearsCache = () => {
  cachedCompanyYears = null;
  inFlightCompanyYears = null;
};

