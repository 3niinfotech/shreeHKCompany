import { useMemo } from "react";
import { useFetchApi } from "../api/ApiFunction";
import { ENDPOINTS } from "../api/endpoints";
import useAuthStore from "../store/Auth.Store";

/**
 * Branch-scoped tenant companies for compulsory Company dropdown.
 * Login HK → dropdown shows ShreeHK International, KG Infrastructure, etc.
 */
export default function useBranchCompanies() {
  const sessionCompanyId = useAuthStore((s) => s.companyId);
  const branchId = useAuthStore((s) => s.branchId);
  const branchName = useAuthStore((s) => s.branchName);

  const { data, isLoading, refetch, isFetching, isError, error } = useFetchApi(
    "branchCompanies",
    ENDPOINTS.portal.branchCompanies,
    {},
    "GET",
    {
      enabled: Boolean(Number(sessionCompanyId) > 0 || Number(branchId) > 0),
      staleTime: 0,
      refetchOnMount: "always",
    }
  );

  const options = useMemo(() => {
    const rows = data?.Data || [];
    return rows.map((c) => ({
      value: Number(c.id),
      label: c.shortcutName ? `${c.name} (${c.shortcutName})` : c.name,
      name: c.name || "",
      code: c.shortcutName || "",
      address: c.address || "",
      number: c.number || "",
      email: c.email || "",
      website: c.website || "",
      rapnetId: c.rapnet_id || "",
    }));
  }, [data]);

  const defaultCompanyId = useMemo(() => {
    const sid = sessionCompanyId != null ? Number(sessionCompanyId) : null;
    if (sid && options.some((o) => Number(o.value) === sid)) return sid;
    return options[0]?.value ?? sid ?? undefined;
  }, [options, sessionCompanyId]);

  return {
    options,
    defaultCompanyId,
    branchId: data?.branchId ?? branchId ?? null,
    branchName: data?.branchName ?? branchName ?? null,
    isLoading: isLoading || isFetching,
    isError,
    error,
    refetch,
  };
}
