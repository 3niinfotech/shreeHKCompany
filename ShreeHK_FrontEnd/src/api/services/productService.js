import { api } from "../axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";

export const fetchProductInventory = async (params) => {
    const res = await api.get(ENDPOINTS.product.inventory, { params });
    return res.data;
};

export const fetchProductDetail = async (params) => {
    const res = await api.get(ENDPOINTS.product.detail, { params });
    return res.data;
};

export const saveProduct = async (payload) => {
    const res = await api.post(ENDPOINTS.product.save, payload);
    return res.data;
};

export const postChangePrice = async (payload) => {
    const res = await api.post(ENDPOINTS.product.changePrice, payload);
    return res.data;
};

export const postLabelA4Print = async (payload) => {
    const res = await api.post(ENDPOINTS.product.labelA4Print, payload, {
        responseType: "blob",
    });
    return res.data;
};

export const postLabelPrint = async (payload) => {
    const res = await api.post(ENDPOINTS.product.labelPrint, payload, {
        responseType: "blob",
    });
    return res.data;
};

export const postInventoryExport = async (payload) => {
    const res = await api.post(ENDPOINTS.product.export, payload, {
        responseType: "blob",
    });
    const baseName = String(payload?.fileName || "Defult_Stock_List").trim() || "Defult_Stock_List";
    const safeName = baseName.replace(/[\\/:*?"<>|]+/g, "_");
    return {
        blob: res.data,
        fileName: `${safeName}.xlsx`,
    };
};

export const postInventoryMail = async (payload) => {
    const res = await api.post(ENDPOINTS.product.mail, payload);
    return res.data;
};

export const fetchProductHistory = async (params) => {
    const res = await api.get(ENDPOINTS.product.history, { params });
    return res.data;
};

export const addStonesToBox = async (payload) => {
    const res = await api.post(ENDPOINTS.product.boxAdd, payload);
    return res.data;
};

export const addStonesToParcel = async (payload) => {
    const res = await api.post(ENDPOINTS.product.parcelAdd, payload);
    return res.data;
};

export const fetchCategorizeTree = async () => {
    const res = await api.get(ENDPOINTS.product.categorizeTree);
    return res.data;
};

export const assignProductCategory = async (payload) => {
    const res = await api.post(ENDPOINTS.product.categorizeAssign, payload);
    return res.data;
};

export const fetchCategoryStats = async (categoryId) => {
    const res = await api.get(ENDPOINTS.product.categorizeStats, {
        params: { categoryId },
    });
    return res.data;
};

export const postIExport = async (payload) => {
    const res = await api.post(ENDPOINTS.product.iExport, payload, {
        responseType: "blob",
    });
    const format = payload?.format === "csv" ? "csv" : "xlsx";
    const baseName = String(payload?.fileName || "Import_Format").trim() || "Import_Format";
    const safeName = baseName.replace(/[\\/:*?"<>|]+/g, "_");
    return {
        blob: res.data,
        fileName: `${safeName}.${format}`,
    };
};
