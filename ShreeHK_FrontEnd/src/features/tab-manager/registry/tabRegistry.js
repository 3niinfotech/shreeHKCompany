import { resolveTabFromPath, HOME_TAB } from "../../../utils/tabRouteMeta";
import { HOME_TAB_CONFIG } from "../config/tabConfig";

/**
 * Resolve display title and metadata for a given path and search string.
 */
export const resolveTabMeta = (pathname, search = "", user, authorizedRoutes) => {
  const normalized = pathname === "" ? "/" : pathname;

  if (normalized === "/" || normalized === "/dashboard") {
    return {
      ...HOME_TAB_CONFIG,
      location: {
        pathname: "/dashboard",
        search: "",
        hash: "",
        state: null,
        key: "/dashboard",
      },
    };
  }

  const baseMeta = resolveTabFromPath(normalized, user, authorizedRoutes);
  let label = baseMeta?.label || "Page";

  // If there are search parameters, append short hints if helpful (e.g. sku=123)
  if (search) {
    try {
      const params = new URLSearchParams(search);
      const sku = params.get("sku");
      const id = params.get("id");
      if (sku) {
        label = `${label} (${sku})`;
      } else if (id) {
        label = `${label} (#${id})`;
      }
    } catch {
      // ignore parse errors
    }
  }

  const key = `${normalized}${search}`;

  return {
    key,
    path: key,
    pathname: normalized,
    search: search || "",
    hash: "",
    label,
    closable: true,
    location: {
      pathname: normalized,
      search: search || "",
      hash: "",
      state: null,
      key,
    },
  };
};
