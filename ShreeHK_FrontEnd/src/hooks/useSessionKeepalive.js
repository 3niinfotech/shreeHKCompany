import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../api/axiosInstance";
import { ENDPOINTS } from "../constants/endpoints";
import useAuthStore from "../store/Auth.Store";

const KEEPALIVE_MS = 30 * 1000;
const KEEPALIVE_DEDUPE_MS = 1500;

let keepaliveTimerId = null;
let keepaliveOwners = 0;
let keepaliveInFlight = false;
let lastKeepaliveAt = 0;

/**
 * Polls session keepalive (legacy dai/checkSession.php parity: s0/s1/s2).
 * Module-level interval + dedupe avoids duplicate calls from StrictMode remounts.
 */
const useSessionKeepalive = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const companyId = useAuthStore((s) => s.companyId);
  const yearId = useAuthStore((s) => s.yearId);
  const logout = useAuthStore((s) => s.logout);
  const warnedRef = useRef(false);

  const contextRef = useRef({});
  contextRef.current = { navigate, logout, companyId, yearId, warnedRef };

  useEffect(() => {
    if (!isAuthenticated || !token) return undefined;

    const poll = async () => {
      const now = Date.now();
      if (keepaliveInFlight || now - lastKeepaliveAt < KEEPALIVE_DEDUPE_MS) {
        return;
      }

      keepaliveInFlight = true;
      lastKeepaliveAt = now;

      const { navigate, logout, companyId, yearId, warnedRef } = contextRef.current;

      try {
        const params = {};
        if (companyId != null) params.companyId = companyId;
        if (yearId != null) params.yearId = yearId;

        const res = await api.get(ENDPOINTS.session.keepalive, { params });
        const state = res.data?.state;

        if (state === "s0") {
          await logout();
          toast.error("Your session has expired. Please sign in again.");
          navigate("/auth/login", { replace: true });
          return;
        }

        if (state === "s2") {
          if (!warnedRef.current) {
            warnedRef.current = true;
            toast.warning(
              "Company or year context changed. Refresh or re-select your company.",
              { duration: 8000 }
            );
          }
          return;
        }

        warnedRef.current = false;
      } catch {
        // Network errors handled by axios interceptors / health check
      } finally {
        keepaliveInFlight = false;
      }
    };

    keepaliveOwners += 1;
    if (!keepaliveTimerId) {
      poll();
      keepaliveTimerId = setInterval(poll, KEEPALIVE_MS);
    }

    return () => {
      keepaliveOwners -= 1;
      if (keepaliveOwners <= 0 && keepaliveTimerId) {
        clearInterval(keepaliveTimerId);
        keepaliveTimerId = null;
      }
    };
  }, [isAuthenticated, token, companyId, yearId, logout, navigate]);
};

export default useSessionKeepalive;
