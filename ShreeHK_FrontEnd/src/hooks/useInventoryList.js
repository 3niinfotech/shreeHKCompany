import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Form } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useFetchApi } from "../api/ApiFunction";
import { ENDPOINTS } from "../constants/endpoints";
import { buildOnHandApiFilters, mapInventoryRowSnake } from "../utils/inventoryApiFilters";
import useTableBodyScrollHeight from "./useTableBodyScrollHeight";

const PAGE_LIMIT = 100;

/**
 * Shared inventory list fetch with scroll pagination and optional filter form.
 *
 * @param {object} options
 * @param {string} options.queryKey - React Query key prefix
 * @param {object} [options.baseFilters] - Static API filters (e.g. type: ['box'])
 * @param {import('antd').FormInstance} [options.filterForm] - Form with stockChecks / fwRadio
 * @param {function} [options.buildFilters] - Custom filter builder (stockChecks, fwRadio, searchText) => params
 * @param {string} [options.searchText] - Controlled search string
 * @param {function} [options.mapRow] - Row mapper; defaults to snake_case
 */
export default function useInventoryList({
  queryKey = "InventoryList",
  baseFilters = {},
  filterForm,
  buildFilters,
  searchText = "",
  mapRow = mapInventoryRowSnake,
} = {}) {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [tableData, setTableData] = useState([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const tableWrapRef = useRef(null);
  const [fallbackForm] = Form.useForm();
  const activeForm = filterForm || fallbackForm;

  const stockChecks = Form.useWatch("stockChecks", activeForm);
  const fwRadio = Form.useWatch("fwRadio", activeForm);
  const baseFiltersKey = JSON.stringify(baseFilters);

  const appliedFilters = useMemo(() => {
    if (typeof buildFilters === "function") {
      return buildFilters({ stockChecks, fwRadio, searchText, baseFilters });
    }
    return {
      ...buildOnHandApiFilters({ stockChecks, fwRadio, searchInput: searchText }),
      ...baseFilters,
    };
  }, [buildFilters, stockChecks, fwRadio, searchText, baseFiltersKey, baseFilters]);

  const inventoryQueryParams = useMemo(
    () => ({ limit: PAGE_LIMIT, offset, ...appliedFilters }),
    [offset, appliedFilters],
  );

  const { data: productData, isLoading, isFetching, isError, error, refetch } = useFetchApi(
    queryKey,
    ENDPOINTS.product.inventory,
    inventoryQueryParams,
    "GET",
    { placeholderData: undefined },
  );

  const totalItems = productData?.TotalData?.TotalItems ?? productData?.TotalItems ?? 0;
  const tableScrollY = useTableBodyScrollHeight(tableWrapRef, [tableData.length, totalItems]);

  const refresh = useCallback(async () => {
    // Do not clear tableData before fetch — that leaves "No data" if API does not re-run.
    if (offset !== 0) {
      setOffset(0);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      queryClient.invalidateQueries({ queryKey: ["GetProductData"] });
      return;
    }
    await refetch();
  }, [offset, refetch, queryClient, queryKey]);

  useEffect(() => {
    setOffset(0);
    setTableData([]);
  }, [baseFiltersKey, searchText, stockChecks, fwRadio]);

  useEffect(() => {
    if (!productData) return;
    const rows = productData.Data || [];
    if (rows.length > 0) {
      const mapped = rows.map((item, index) => mapRow(item, index, offset + 1, PAGE_LIMIT));
      setTableData((prev) => {
        if (offset === 0) return mapped;
        const existing = new Set(prev.map((d) => d.id));
        return [...prev, ...mapped.filter((d) => !existing.has(d.id))];
      });
    } else if (offset === 0 && !isFetching && !isLoading) {
      setTableData([]);
    }
    setIsFetchingMore(false);
  }, [productData, offset, mapRow, isFetching, isLoading]);

  useEffect(() => {
    const tableBody = tableWrapRef.current?.querySelector(".ant-table-body");
    if (!tableBody) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = tableBody;
      if (
        scrollTop + clientHeight >= scrollHeight - 48 &&
        !isFetchingMore &&
        !isLoading &&
        tableData.length < totalItems
      ) {
        setIsFetchingMore(true);
        setOffset((prev) => prev + 1);
      }
    };

    tableBody.addEventListener("scroll", onScroll);
    return () => tableBody.removeEventListener("scroll", onScroll);
  }, [tableData.length, isFetchingMore, isLoading, totalItems]);

  const cachedMappedRows = useMemo(() => {
    if (offset !== 0 || !productData?.Data?.length) return [];
    return productData.Data.map((item, index) => mapRow(item, index, offset + 1, PAGE_LIMIT));
  }, [productData, offset, mapRow]);

  const displayTableData = tableData.length > 0 ? tableData : cachedMappedRows;

  return {
    tableData: displayTableData,
    isLoading: isLoading && offset === 0 && displayTableData.length === 0,
    isFetchingMore,
    isError,
    error,
    totalItems,
    tableWrapRef,
    tableScrollY,
    refresh,
    appliedFilters,
  };
}
