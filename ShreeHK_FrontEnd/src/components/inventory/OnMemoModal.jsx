import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Modal, Table, Input, InputNumber, Select, DatePicker, Button, Form, Checkbox, Tag as AntTag } from "antd";
import { toastWarning, toastError } from "../../utils/toastNotify";
import { toast } from "sonner";
import { DeleteOutlined, PlusOutlined, SendOutlined } from "@ant-design/icons";
import { BarChart3, Diamond, DollarSign, Tag } from "lucide-react";
import dayjs from "dayjs";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../api/endpoints";
import { fetchProductDetail } from "../../api/services/productService";
import { toastApiError } from "../../utils/toastNotify";
import { getActionTheme } from "./inventoryActionConfig";
import { SkuLink } from "../../hooks/useSkuModalAction";
import useBranchCompanies from "../../hooks/useBranchCompanies";
import styles from "../../assets/scss/components/inventoryBulkActionModal.module.scss";
import "../../assets/scss/pages/inventory/onMemoModal.scss";

/** PHP Helper::getAllLab() — hardcoded GIA/IGI/CGL/AGT (dai_product_lab query is commented out). */
const PHP_LAB_OPTIONS = [
  { label: "GIA", value: "GIA" },
  { label: "IGI", value: "IGI" },
  { label: "CGL", value: "CGL" },
  { label: "AGT", value: "AGT" },
];

const VAT_OPTIONS = [
  { label: "No VAT", value: "0" },
  { label: "VAT 7%", value: "7" },
];

const resolveOutwardType = (actionType) => {
  if (actionType === "sell") return "sale";
  if (actionType === "consign") return "consign";
  if (actionType === "lab") return "lab";
  if (actionType === "export") return "export";
  return "memo";
};

/** Same formula as OutwardEntryForm / InwardEntryForm: amount = carat × price */
const calcAmount = (carat, price) =>
  Math.round((Number(carat) || 0) * (Number(price) || 0) * 100) / 100;

const isBoxOrParcel = (groupType) => {
  const t = String(groupType || "").toLowerCase();
  return t === "box" || t === "parcel";
};

/** Single stone: Pcs/Carat locked; only box/parcel rows can edit them */
const canEditPcsCarat = (record) =>
  Boolean(record?._resolved) && isBoxOrParcel(record.groupType);

const recalcFromDisc = (row) => {
  const carat = Number(row.polishCarat) || 0;
  const rapPrice = Number(row.rapPrice) || 0;
  const basePrice = Number(row.basePrice) || Number(row.price) || 0;
  const refPrice = rapPrice > 0 ? rapPrice : basePrice;
  const disc = Number(row.disc) || 0;
  const price = refPrice > 0 ? refPrice * (1 + disc / 100) : (Number(row.price) || 0);
  return {
    ...row,
    price: +price.toFixed(2),
    amount: calcAmount(carat, price),
    basePrice: basePrice || +price.toFixed(2),
  };
};

const recalcFromAmount = (row) => {
  const carat = Number(row.polishCarat) || 0;
  const rapPrice = Number(row.rapPrice) || 0;
  let basePrice = Number(row.basePrice) || 0;
  const amount = Number(row.amount) || 0;
  const price = carat > 0 ? amount / carat : 0;
  if (!basePrice && price > 0) basePrice = price;
  const refPrice = rapPrice > 0 ? rapPrice : basePrice;
  const disc = refPrice > 0 ? ((price * 100) / refPrice - 100) : (Number(row.disc) || 0);
  return {
    ...row,
    price: +price.toFixed(2),
    amount: calcAmount(carat, price),
    disc: +disc.toFixed(2),
    basePrice,
  };
};

const recalcFromPrice = (row) => {
  const carat = Number(row.polishCarat) || 0;
  const rapPrice = Number(row.rapPrice) || 0;
  const price = Number(row.price) || 0;
  let basePrice = Number(row.basePrice) || 0;
  if (!basePrice && price > 0) basePrice = price;
  const refPrice = rapPrice > 0 ? rapPrice : basePrice;
  const disc = refPrice > 0 ? ((price * 100) / refPrice - 100) : (Number(row.disc) || 0);
  return {
    ...row,
    amount: calcAmount(carat, price),
    disc: +disc.toFixed(2),
    basePrice,
  };
};

const recalcFromCarat = (row, caratValue) => {
  const polishCarat = Number(caratValue) || 0;
  return recalcFromPrice({ ...row, polishCarat });
};

/** Pcs change: for box/parcel keep avg carat/pcs from stock, then amount = carat × price */
const recalcFromPcs = (row, pcsValue) => {
  const polishPcs = Number(pcsValue) || 0;
  const stockPcs = Number(row.stockPcs) || 0;
  const stockCarat = Number(row.stockCarat) || 0;
  let polishCarat = Number(row.polishCarat) || 0;
  if (isBoxOrParcel(row.groupType) && stockPcs > 0) {
    polishCarat = Math.round((stockCarat / stockPcs) * polishPcs * 100) / 100;
  }
  return recalcFromPrice({ ...row, polishPcs, polishCarat });
};

const mapProductToMemoRow = (p, rowKey, { isManual = false } = {}) => {
  const onhandCarat = Number(p.onhand_carat != null ? p.onhand_carat : p.polish_carat) || 0;
  const onhandPcs = Number(p.onhand_pcs != null ? p.onhand_pcs : p.polish_pcs) || 1;
  const carat = onhandCarat > 0 ? onhandCarat : (Number(p.polish_carat) || 0);
  const polishPcs = onhandPcs > 0 ? onhandPcs : (Number(p.polish_pcs) || 1);
  const rapPrice = Number(p.rapnet_price || p.rap_price) || 0;
  const price = Number(p.sell_price || p.price) || 0;
  const basePrice = rapPrice > 0 ? rapPrice : price;
  const disc = rapPrice > 0 ? ((price * 100) / rapPrice - 100) : 0;
  return {
    rowKey,
    id: p.id,
    sku: p.sku,
    company: p.company != null ? Number(p.company) : undefined,
    companyCode: p.company_code || p.companyCode || "",
    companyName: p.company_name || p.companyName || "",
    shape: p.shape || "",
    color: p.color || p.main_color || "",
    clarity: p.clarity || "",
    lab: p.lab || "",
    certificate: p.report_no || p.certificate || "",
    polishCarat: carat,
    polishPcs,
    rapPrice,
    price,
    amount: calcAmount(carat, price),
    carat,
    basePrice,
    disc: +disc.toFixed(2),
    stockPcs: polishPcs,
    stockCarat: carat,
    groupType: p.group_type || "",
    outward: p.outward || "",
    inward: p.inward || "",
    _isManual: isManual,
    _resolved: true,
  };
};

const mapSelectedRowToMemoRow = (row) => {
  const onhandCarat = Number(row.onhandCarat != null ? row.onhandCarat : (row.onhand_carat != null ? row.onhand_carat : row.polishCarat)) || 0;
  const onhandPcs = Number(row.onhandPcs != null ? row.onhandPcs : (row.onhand_pcs != null ? row.onhand_pcs : row.polishPcs)) || 1;
  const carat = onhandCarat > 0 ? onhandCarat : (Number(row.polishCarat) || 0);
  const polishPcs = onhandPcs > 0 ? onhandPcs : (Number(row.polishPcs) || 1);
  const rapPrice = Number(row.rapPrice) || 0;
  const price = Number(row.price) || 0;
  const basePrice = rapPrice > 0 ? rapPrice : price;
  const disc = rapPrice > 0 ? ((price * 100) / rapPrice - 100) : 0;
  return {
    ...row,
    rowKey: `sel-${row.id}`,
    disc: +disc.toFixed(2),
    price,
    amount: calcAmount(carat, price) || Number(row.amount) || 0,
    carat,
    basePrice,
    polishPcs,
    polishCarat: carat,
    stockPcs: polishPcs,
    stockCarat: carat,
    _isManual: false,
    _resolved: true,
  };
};

const createEmptyManualRow = () => ({
  rowKey: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  id: null,
  sku: "",
  company: undefined,
  companyCode: "",
  companyName: "",
  shape: "",
  color: "",
  clarity: "",
  lab: "",
  certificate: "",
  polishCarat: 0,
  polishPcs: 0,
  rapPrice: 0,
  price: 0,
  amount: 0,
  carat: 0,
  basePrice: 0,
  disc: 0,
  stockPcs: 0,
  stockCarat: 0,
  groupType: "",
  _isManual: true,
  _resolved: false,
});

const getSkuValidationError = (product, actionType) => {
  if (!product?.id) {
    return "SKU not found";
  }
  const sku = product.sku || product.id;
  if (Number(product.hold) === 1) {
    return `SKU ${sku} is on hold`;
  }
  const outward = String(product.outward || "").toLowerCase();
  if (actionType === "sell") {
    if (outward && outward !== "memo" && outward !== "consign") {
      return `SKU ${sku} is already on ${product.outward}`;
    }
    const onhandCarat =
      Number(product.onhand_carat != null ? product.onhand_carat : product.polish_carat) || 0;
    const onhandPcs =
      Number(product.onhand_pcs != null ? product.onhand_pcs : product.polish_pcs) || 0;
    if (outward !== "memo" && onhandCarat <= 0.0001 && onhandPcs <= 0) {
      return `SKU ${sku} has no available stock (0 pcs / 0 ct)`;
    }
    return null;
  }
  if (actionType === "export") {
    const inward = String(product.inward || "").toLowerCase();
    if (inward === "memo" || inward === "consign") {
      return `SKU ${sku} is IN Memo. Please purchase first`;
    }
  }
  if (actionType === "memo" || actionType === "consign") {
    const onhandCarat =
      Number(product.onhand_carat != null ? product.onhand_carat : product.polish_carat) || 0;
    const onhandPcs =
      Number(product.onhand_pcs != null ? product.onhand_pcs : product.polish_pcs) || 0;
    if (onhandCarat <= 0.0001 && onhandPcs <= 0) {
      return `SKU ${sku} has no available stock (0 pcs / 0 ct)`;
    }
    return null;
  }
  if (outward) {
    return `SKU ${sku} is already on ${product.outward}`;
  }
  return null;
};

const buildActionConfig = (actionType) => {
  const themeKey =
    actionType === "memo"
      ? "onMemo"
      : actionType === "consign"
        ? "consignment"
        : actionType === "lab"
          ? "lab"
          : actionType === "export"
            ? "toExport"
            : "sell";
  const theme = getActionTheme(themeKey);
  const titles = {
    memo: "On Memo",
    sell: "Sell Diamond",
    consign: "Consignment",
    lab: "Send to Lab",
    export: "Send to Export",
  };
  const submitLabels = {
    memo: "Submit Memo",
    sell: "Submit Sale",
    consign: "Submit Consignment",
    lab: "Save Lab",
    export: "Save Export",
  };
  return {
    title: titles[actionType] || theme.label,
    headerBg: theme.bg,
    headerBorder: theme.border,
    accentColor: theme.accent,
    submitBtn: {
      label: submitLabels[actionType] || `Submit ${theme.label}`,
      bg: theme.btnBg || theme.accent,
      border: theme.btnBorder || theme.accent,
    },
  };
};

const OnMemoModal = ({ open, onClose, selectedRows = [], onSubmit, actionType = "memo" }) => {
  const config = buildActionConfig(actionType);
  const isSaleLike = actionType === "sell" || actionType === "export";
  const isExport = actionType === "export";
  const isLab = actionType === "lab";
  const [memoRows, setMemoRows] = useState([]);
  const [narration, setNarration] = useState("");
  const [lessPercent, setLessPercent] = useState(null);
  const [otherLessPercent, setOtherLessPercent] = useState(null);
  const [extraCharge, setExtraCharge] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lookupRowKey, setLookupRowKey] = useState(null);
  const [form] = Form.useForm();
  const vatPercent = Form.useWatch("vat_percent", form);
  const selectedOperatingCompany = Form.useWatch("operating_company_id", form);

  const sourceCompanyId = useMemo(() => {
    const raw = selectedRows?.[0]?.company;
    return raw != null ? Number(raw) : undefined;
  }, [selectedRows]);

  const isInterCompanySell = useMemo(() => {
    return (
      actionType === "sell" &&
      Boolean(
        sourceCompanyId &&
        selectedOperatingCompany &&
        Number(selectedOperatingCompany) !== sourceCompanyId
      )
    );
  }, [actionType, sourceCompanyId, selectedOperatingCompany]);

  const { data: companyData } = useFetchApi(
    "GetCompany",
    ENDPOINTS.company.options,
    {},
    "GET",
    { enabled: open },
  );
  const {
    options: branchCompanyOptions,
    isLoading: isBranchCompanyLoading,
  } = useBranchCompanies();
  const { data: incrementData } = useFetchApi(
    "getIncrement",
    ENDPOINTS.common.increment,
    {},
    "GET",
    { enabled: open },
  );
  const { data: shippingData } = useFetchApi(
    "GetShipping",
    ENDPOINTS.shipping.list,
    { limit: 200 },
    "GET",
    { enabled: open && isExport },
  );
  const { data: originData } = useFetchApi(
    "GetOrigin",
    ENDPOINTS.origin.list,
    { limit: 200 },
    "GET",
    { enabled: open && isExport },
  );

  const companyOptions = useMemo(() => {
    const d = companyData?.Data || companyData?.data;
    return Array.isArray(d) ? d.map((item) => ({ label: item.name, value: item.id })) : [];
  }, [companyData]);

  const shippingOptions = useMemo(() => {
    const d = shippingData?.Data || shippingData?.data;
    return Array.isArray(d)
      ? d.map((item) => ({ label: item.name, value: item.name }))
      : [];
  }, [shippingData]);

  const originOptions = useMemo(() => {
    const d = originData?.Data || originData?.data;
    return Array.isArray(d)
      ? d.map((item) => ({ label: item.name, value: item.name }))
      : [];
  }, [originData]);

  useEffect(() => {
    if (!open) return;
    const rows = selectedRows.map(mapSelectedRowToMemoRow);
    setMemoRows(rows);
    setNarration("");
    setLessPercent(null);
    setOtherLessPercent(null);
    setExtraCharge(null);
    setLookupRowKey(null);
    const inc = incrementData?.Data;
    // Default Company = stone's stock company (branch siblings share inventory list)
    const productCompany =
      Number(selectedRows?.[0]?.company) ||
      Number(branchCompanyOptions?.[0]?.value) ||
      undefined;
    form.setFieldsValue({
      date: dayjs(),
      invoiceType: "Invoice From",
      vat_percent: "0",
      operating_company_id: productCompany,
      ...(inc
        ? {
          entryno: inc.outward,
          invoiceno: inc.invoice != null ? String(inc.invoice) : undefined,
        }
        : {}),
    });
  }, [open, selectedRows, form, incrementData, branchCompanyOptions]);

  const handleFormValuesChange = (changedValues) => {
    if (!isSaleLike) return;
    const { date, terms } = changedValues;
    if (date !== undefined || terms !== undefined) {
      const currentDate = form.getFieldValue("date");
      const currentTerms = form.getFieldValue("terms");
      if (currentDate && currentTerms) {
        form.setFieldsValue({ duedate: currentDate.add(Number(currentTerms), "day") });
      }
    }
  };

  const handleDiscChange = useCallback((rowKey, value) => {
    setMemoRows((prev) =>
      prev.map((row) => (row.rowKey === rowKey ? recalcFromDisc({ ...row, disc: value }) : row))
    );
  }, []);

  const handleAmountChange = useCallback((rowKey, value) => {
    setMemoRows((prev) =>
      prev.map((row) => (row.rowKey === rowKey ? recalcFromAmount({ ...row, amount: value }) : row))
    );
  }, []);

  const handlePriceChange = useCallback((rowKey, value) => {
    setMemoRows((prev) =>
      prev.map((row) => (row.rowKey === rowKey ? recalcFromPrice({ ...row, price: value }) : row))
    );
  }, []);

  const handleCaratChange = useCallback((rowKey, value) => {
    setMemoRows((prev) =>
      prev.map((row) => {
        if (row.rowKey !== rowKey || !canEditPcsCarat(row)) return row;
        return recalcFromCarat(row, value);
      })
    );
  }, []);

  const handlePcsChange = useCallback((rowKey, value) => {
    setMemoRows((prev) =>
      prev.map((row) => {
        if (row.rowKey !== rowKey || !canEditPcsCarat(row)) return row;
        return recalcFromPcs(row, value);
      })
    );
  }, []);

  const handleRemoveRow = useCallback((rowKey) => {
    setMemoRows((prev) => prev.filter((row) => row.rowKey !== rowKey));
  }, []);

  const handleAddManualRow = useCallback(() => {
    setMemoRows((prev) => [...prev, createEmptyManualRow()]);
  }, []);

  const handleManualSkuChange = useCallback((rowKey, value) => {
    setMemoRows((prev) =>
      prev.map((row) => (row.rowKey === rowKey ? { ...row, sku: value, _resolved: false, id: null } : row))
    );
  }, []);

  const lookupSkuForRow = useCallback(async (rowKey, rawSku) => {
    const trimmed = String(rawSku || "").trim();
    if (!trimmed) return;

    setLookupRowKey(rowKey);
    try {
      const data = await fetchProductDetail({ id: trimmed, by: "p.sku" });
      const product = data?.Data;
      const validationError = getSkuValidationError(product, actionType);
      if (validationError) {
        toastWarning(validationError);
        return;
      }

      setMemoRows((prev) => {
        const duplicate = prev.some((row) => row.id === product.id && row.rowKey !== rowKey);
        if (duplicate && actionType !== "memo" && actionType !== "consign") {
          toastWarning(`SKU ${product.sku} is already in the list`);
          return prev;
        }
        return prev.map((row) => (
          row.rowKey === rowKey
            ? mapProductToMemoRow(product, rowKey, { isManual: true })
            : row
        ));
      });
    } catch (err) {
      if (err?.response?.status === 404) {
        toastWarning(`SKU "${trimmed}" not found for your company`);
        return;
      }
      toastApiError(err);
    } finally {
      setLookupRowKey(null);
    }
  }, [actionType]);

  const footerStats = useMemo(() => {
    const rows = memoRows.filter((row) => row.id && row._resolved !== false);
    return rows.reduce(
      (acc, row) => {
        acc.pcs += Number(row.polishPcs) || 0;
        acc.carats += Number(row.polishCarat) || 0;
        acc.price += (Number(row.price) || 0) * (Number(row.polishCarat) || 0);
        acc.amount += Number(row.amount) || 0;
        return acc;
      },
      { pcs: 0, carats: 0, price: 0, amount: 0 }
    );
  }, [memoRows]);

  const avgPrice = footerStats.carats > 0 ? (footerStats.price / footerStats.carats).toFixed(2) : "0.00";

  const discountCalc = useMemo(() => {
    const totalAmount = footerStats.amount;
    const lp = Number(lessPercent) || 0;
    const olp = Number(otherLessPercent) || 0;
    const ec = Number(extraCharge) || 0;

    const lessDiscountAmt = totalAmount * lp / 100;
    const afterLess = totalAmount - lessDiscountAmt;

    const otherLessDiscountAmt = afterLess * olp / 100;
    const afterOtherLess = afterLess - otherLessDiscountAmt;

    const finalAmount = afterOtherLess + ec;

    return {
      lessDiscountAmt: +lessDiscountAmt.toFixed(2),
      afterLess: +afterLess.toFixed(2),
      otherLessDiscountAmt: +otherLessDiscountAmt.toFixed(2),
      afterOtherLess: +afterOtherLess.toFixed(2),
      finalAmount: +finalAmount.toFixed(2),
    };
  }, [footerStats.amount, lessPercent, otherLessPercent, extraCharge]);

  const vatAmount = useMemo(() => {
    const pct = Number(vatPercent) || 0;
    if (!isExport || pct <= 0) return 0;
    return +(discountCalc.finalAmount * pct / 100).toFixed(2);
  }, [isExport, vatPercent, discountCalc.finalAmount]);

  const exportFinalAmount = +(discountCalc.finalAmount + vatAmount).toFixed(2);

  const handleSubmit = async () => {
    const resolvedRows = memoRows.filter((row) => row.id && row._resolved !== false);
    if (!resolvedRows.length) {
      toastWarning("Please add at least one diamond with a valid SKU");
      return;
    }
    const pendingManual = memoRows.some((row) => row._isManual && !row._resolved && String(row.sku || "").trim());
    if (pendingManual) {
      toastWarning("Resolve all SKU entries before submitting");
      return;
    }
    try {
      const values = await form.validateFields();
      const vatPct = Number(values.vat_percent) || 0;
      const payloadVatAmount = isExport && vatPct > 0
        ? +(discountCalc.finalAmount * vatPct / 100).toFixed(2)
        : 0;
      const payload = {
        ...values,
        type: resolveOutwardType(actionType),
        status: `on_${resolveOutwardType(actionType)}`,
        date: values.date?.format("YYYY-MM-DD"),
        duedate: values.duedate?.format?.("YYYY-MM-DD") || values.duedate,
        narration: narration,
        lessPercent: Number(lessPercent) || 0,
        lessAmount: discountCalc.lessDiscountAmt,
        otherLessPercent: Number(otherLessPercent) || 0,
        otherLessAmount: discountCalc.otherLessDiscountAmt,
        extraCharge: Number(extraCharge) || 0,
        vat_percent: vatPct,
        vat_amount: payloadVatAmount,
        finalAmount: +(discountCalc.finalAmount + payloadVatAmount).toFixed(2),
        _submittedRows: resolvedRows,
        _partyLabel: companyOptions.find((c) => String(c.value) === String(values.company))?.label || "",
        _operatingCompanyLabel: branchCompanyOptions.find((c) => String(c.value) === String(values.operating_company_id))?.label || "",
        products: resolvedRows.map((r) => ({
          id: r.id,
          sku: r.sku,
          polishCarat: r.polishCarat,
          polishPcs: r.polishPcs,
          groupType: r.groupType,
          rapPrice: r.rapPrice,
          disc: r.disc,
          price: r.price,
          amount: r.amount,
        })),
      };
      setSubmitting(true);
      await onSubmit?.(payload);
    } catch (err) {
      if (err?.errorFields && err.errorFields.length > 0) {
        const firstMsg = err.errorFields[0]?.errors?.[0];
        toast.error(firstMsg || "Please fill all required fields.");
      } else if (err?.message && err.message !== "validation failed") {
        toastError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedRowCount = memoRows.filter((row) => row.id && row._resolved !== false).length;

  const companyCodeMap = useMemo(() => {
    const map = new Map();
    for (const opt of branchCompanyOptions || []) {
      map.set(Number(opt.value), opt.code || opt.name || "");
    }
    return map;
  }, [branchCompanyOptions]);

  const columns = [
    { title: "No", width: 50, align: "center", render: (_, __, idx) => idx + 1 },
    {
      title: "Company",
      dataIndex: "company",
      width: 90,
      align: "center",
      ellipsis: true,
      render: (_, record) => {
        const code =
          record.companyCode ||
          record.company_code ||
          companyCodeMap.get(Number(record.company)) ||
          record.companyName ||
          record.company_name ||
          "—";
        return code || "—";
      },
    },
    {
      title: "SKU",
      dataIndex: "sku",
      width: 130,
      align: "center",
      render: (text, record) => {
        if (record._isManual && !record._resolved) {
          return (
            <Input
              value={text}
              placeholder="Enter SKU"
              disabled={lookupRowKey === record.rowKey}
              onChange={(e) => handleManualSkuChange(record.rowKey, e.target.value)}
              onPressEnter={(e) => lookupSkuForRow(record.rowKey, e.target.value)}
              onBlur={(e) => lookupSkuForRow(record.rowKey, e.target.value)}
              className="memo-editable-cell"
              style={{ width: 120 }}
            />
          );
        }
        return <SkuLink sku={text} record={record} />;
      },
    },
    { title: "Shape", dataIndex: "shape", width: 90, align: "center" },
    { title: "Color", dataIndex: "color", width: 70, align: "center" },
    { title: "Clarity", dataIndex: "clarity", width: 80, align: "center" },
    { title: "Lab", dataIndex: "lab", width: 60, align: "center" },
    { title: "Cert #", dataIndex: "certificate", width: 120, align: "center" },
    {
      title: "Pcs",
      dataIndex: "polishPcs",
      width: 80,
      align: "center",
      render: (value, record) => (
        <InputNumber
          value={value}
          min={0}
          step={1}
          precision={0}
          disabled={!canEditPcsCarat(record)}
          readOnly={!canEditPcsCarat(record)}
          className="memo-editable-cell"
          onChange={(val) => {
            if (!canEditPcsCarat(record)) return;
            handlePcsChange(record.rowKey, val);
          }}
        />
      ),
    },
    {
      title: "Carat",
      dataIndex: "polishCarat",
      width: 80,
      align: "center",
      render: (value, record) => (
        <InputNumber
          value={value}
          min={0}
          step={0.01}
          disabled={!canEditPcsCarat(record)}
          readOnly={!canEditPcsCarat(record)}
          className="memo-editable-cell"
          onChange={(val) => {
            if (!canEditPcsCarat(record)) return;
            handleCaratChange(record.rowKey, val);
          }}
        />
      ),
    },
    { title: "Rap Price", dataIndex: "rapPrice", width: 100, align: "center", render: (v) => `$${Number(v || 0).toLocaleString()}` },
    {
      title: "Disc %",
      dataIndex: "disc",
      width: 120,
      align: "center",
      render: (value, record) => (
        <InputNumber
          value={value}
          step={0.01}
          disabled={!record._resolved}
          className="memo-editable-cell"
          onChange={(val) => handleDiscChange(record.rowKey, val)}
        />
      ),
    },
    {
      title: "Price/Ct",
      dataIndex: "price",
      width: 120,
      align: "center",
      render: (value, record) => (
        <InputNumber
          value={value}
          step={0.01}
          disabled={!record._resolved}
          className="memo-editable-cell"
          onChange={(val) => handlePriceChange(record.rowKey, val)}
        />
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      width: 130,
      align: "center",
      render: (value, record) => (
        <InputNumber
          value={value}
          min={0}
          step={0.01}
          disabled={!record._resolved}
          className="memo-editable-cell"
          onChange={(val) => handleAmountChange(record.rowKey, val)}
        />
      ),
    },
    {
      title: "Action",
      width: 60,
      align: "center",
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveRow(record.rowKey)}
        />
      ),
    },
  ];

  const outwardField = (
    <Form.Item label="Outward" name="entryno">
      <Input placeholder="Outward-###" readOnly />
    </Form.Item>
  );

  const invoiceField = (
    <Form.Item label="Invoice" name="invoiceno">
      <Input placeholder="Invoice No" />
    </Form.Item>
  );

  const referenceField = (
    <Form.Item label="Reference" name="reference">
      <Input placeholder="#Ref" />
    </Form.Item>
  );

  const dateField = (
    <Form.Item label="Date" name="date" rules={[{ required: true, message: "Date required" }]}>
      <DatePicker format="DD-MM-YYYY" />
    </Form.Item>
  );

  const termsField = (
    <Form.Item label="Terms" name="terms">
      <InputNumber placeholder="Days" min={0} />
    </Form.Item>
  );

  const dueDateField = (
    <Form.Item label="Due Date" name="duedate">
      <DatePicker format="DD-MM-YYYY" />
    </Form.Item>
  );

  const companyField = (
    <Form.Item
      label="Company"
      name="operating_company_id"
      rules={[{ required: true, message: "Please select Company" }]}
    >
      <Select
        options={branchCompanyOptions}
        placeholder="Select Company (e.g. ShreeHK / KG)"
        showSearch
        optionFilterProp="label"
        loading={isBranchCompanyLoading}
        allowClear={false}
        virtual
      />
    </Form.Item>
  );

  const partyField = (
    <Form.Item label="Party" name="company" rules={[{ required: true, message: "Party required" }]}>
      <Select options={companyOptions} placeholder="Select Party" allowClear showSearch optionFilterProp="label" virtual />
    </Form.Item>
  );

  const otherPartyField = (
    <Form.Item label="Other Party" name="other_party">
      <Select options={companyOptions} placeholder="Select other Party" allowClear showSearch optionFilterProp="label" virtual />
    </Form.Item>
  );

  const labField = (
    <Form.Item
      label="Select lab"
      name="lab"
      rules={[{ required: true, message: "Please select lab type" }]}
    >
      <Select options={PHP_LAB_OPTIONS} placeholder="Select lab" allowClear />
    </Form.Item>
  );

  const shippingField = (
    <Form.Item label="Shipping" name="shipping_name">
      <Select options={shippingOptions} placeholder="Select Shipping" allowClear showSearch optionFilterProp="label" />
    </Form.Item>
  );

  const originField = (
    <Form.Item label="Origin" name="origin_of">
      <Select options={originOptions} placeholder="Select Origin" allowClear showSearch optionFilterProp="label" />
    </Form.Item>
  );

  const chargeField = (
    <Form.Item label="Charge" name="shipping_charge">
      <InputNumber placeholder="0" min={0} />
    </Form.Item>
  );

  const cifField = (
    <Form.Item label="C.I.F" name="cif">
      <Input placeholder="C.I.F" />
    </Form.Item>
  );

  const vatField = (
    <Form.Item label="VAT" name="vat_percent">
      <Select options={VAT_OPTIONS} />
    </Form.Item>
  );

  const vatAmtField = (
    <Form.Item label="VAT Amt">
      <InputNumber value={vatAmount || null} readOnly />
    </Form.Item>
  );

  const renderBankCheckboxes = () => (
    <div className="memo-form-item memo-form-item--banks">
      <Form.Item name="boc" valuePropName="checked"><Checkbox>BOC</Checkbox></Form.Item>
      <Form.Item name="citi" valuePropName="checked"><Checkbox>Citi</Checkbox></Form.Item>
      <Form.Item name="dbs" valuePropName="checked"><Checkbox>DBS</Checkbox></Form.Item>
      <Form.Item name="sc" valuePropName="checked"><Checkbox>SC</Checkbox></Form.Item>
    </div>
  );

  return (
    <Modal
      className={`on-memo-modal ${isSaleLike ? "on-memo-modal--sell" : ""}`}
      open={open}
      onCancel={onClose}
      width="92vw"
      centered
      closable={false}
      styles={{
        header: {
          background: config.headerBg,
          borderTop: `3px solid ${config.accentColor}`,
        },
      }}
      destroyOnClose
      maskClosable={false}
      mask={{ closable: false }}
      title={
        <div className="memo-modal-title">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <span className="memo-title-text">{config.title}</span>
              <span className="memo-title-count">
                {resolvedRowCount} diamond(s) — use Add Stone to include more by SKU
              </span>
            </div>
            {isInterCompanySell && (
              <AntTag color="purple" style={{ margin: 0, fontWeight: 600, flexShrink: 0 }}>
                Inter-Company Transfer
              </AntTag>
            )}
          </div>
        </div>
      }
      footer={null}
    >
      <div className="memo-modal-scroll">
      <div className="memo-modal-header">
        <Form form={form} layout="inline" className="memo-header-form" onValuesChange={handleFormValuesChange}>
          {actionType === "export" ? (
            <>
              <div className="memo-grid-row memo-grid-row--cols-8 memo-grid-row--export-row1">
                {outwardField}
                {invoiceField}
                {referenceField}
                {dateField}
                {termsField}
                {dueDateField}
                {companyField}
                {partyField}
              </div>
              <div className="memo-grid-row memo-grid-row--cols-8 memo-grid-row--export-row2">
                {otherPartyField}
                {shippingField}
                {originField}
                {chargeField}
                {cifField}
                {vatField}
                {vatAmtField}
                {renderBankCheckboxes()}
              </div>
            </>
          ) : actionType === "sell" ? (
            <>
              <div className="memo-grid-row memo-grid-row--cols-6">
                {outwardField}
                {invoiceField}
                {referenceField}
                {dateField}
                {termsField}
                {dueDateField}
              </div>
              <div className="memo-grid-row memo-grid-row--cols-4">
                {companyField}
                {partyField}
                {otherPartyField}
                {renderBankCheckboxes()}
              </div>
            </>
          ) : actionType === "lab" ? (
            <>
              <div className="memo-grid-row memo-grid-row--cols-4">
                {outwardField}
                {invoiceField}
                {referenceField}
                {dateField}
              </div>
              <div className="memo-grid-row memo-grid-row--cols-5">
                {companyField}
                {partyField}
                {otherPartyField}
                {labField}
                {renderBankCheckboxes()}
              </div>
            </>
          ) : (
            <>
              <div className="memo-grid-row memo-grid-row--cols-4">
                {outwardField}
                {invoiceField}
                {referenceField}
                {dateField}
              </div>
              <div className="memo-grid-row memo-grid-row--cols-4">
                {companyField}
                {partyField}
                {otherPartyField}
                {renderBankCheckboxes()}
              </div>
            </>
          )}
        </Form>
      </div>

      <div className="memo-modal-table">
        <div className="memo-table-toolbar">
          <span className="memo-add-row-hint">Enter SKU in the new row, then press Enter</span>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddManualRow}
            className="memo-add-row-btn memo-add-row-btn--table"
            style={{
              background: config.submitBtn.bg,
              borderColor: config.submitBtn.border,
            }}
          >
            Add Stone
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={memoRows}
          rowKey="rowKey"
          pagination={false}
          bordered
          scroll={{ x: "max-content", y: isSaleLike ? 252 : 396 }}
        />
      </div>

      {isSaleLike && (
        <div className="memo-sell-extra-fields">
          <div className="memo-sell-row">
            <div className="memo-sell-group">
              <span className="memo-sell-label-top">Less %</span>
              <div className="memo-sell-inputs">
                <InputNumber
                  placeholder="Disc %"
                  value={lessPercent}
                  onChange={setLessPercent}
                  step={0.01}
                  style={{ width: 90 }}
                />
                <InputNumber
                  placeholder="Disc Amt"
                  value={lessPercent ? discountCalc.lessDiscountAmt : null}
                  readOnly
                  style={{ width: 110 }}
                />
                <InputNumber
                  placeholder="After Less"
                  value={lessPercent ? discountCalc.afterLess : null}
                  readOnly
                  style={{ width: 120 }}
                />
              </div>
            </div>
            <div className="memo-sell-group">
              <span className="memo-sell-label-top">Other Less %</span>
              <div className="memo-sell-inputs">
                <InputNumber
                  placeholder="Disc %"
                  value={otherLessPercent}
                  onChange={setOtherLessPercent}
                  step={0.01}
                  style={{ width: 90 }}
                />
                <InputNumber
                  placeholder="Disc Amt"
                  value={otherLessPercent ? discountCalc.otherLessDiscountAmt : null}
                  readOnly
                  style={{ width: 110 }}
                />
                <InputNumber
                  placeholder="After Less"
                  value={otherLessPercent ? discountCalc.afterOtherLess : null}
                  readOnly
                  style={{ width: 120 }}
                />
              </div>
            </div>
            <div className="memo-sell-group">
              <span className="memo-sell-label-top">Extra Charge</span>
              <div className="memo-sell-inputs">
                <InputNumber
                  placeholder="0"
                  value={extraCharge}
                  onChange={setExtraCharge}
                  step={0.01}
                  style={{ width: 110 }}
                />
              </div>
            </div>
          </div>
          <div className="memo-sell-row">
            <Checkbox style={{ alignSelf: "flex-end", marginBottom: 4 }}>On Payment</Checkbox>
            <div className="memo-sell-group">
              <span className="memo-sell-label-top">Select Book</span>
              <Select placeholder="Book" options={[{ label: "Book", value: "book" }]} style={{ width: 120 }} />
            </div>
            <div className="memo-sell-group">
              <span className="memo-sell-label-top">Date</span>
              <DatePicker format="DD-MM-YYYY" style={{ width: 130 }} />
            </div>
            <div className="memo-sell-group">
              <span className="memo-sell-label-top">Amount</span>
              <InputNumber placeholder="0" style={{ width: 100 }} />
            </div>
            <div className="memo-sell-group">
              <span className="memo-sell-label-top">Cheque</span>
              <Input placeholder="" style={{ width: 100 }} />
            </div>
          </div>
        </div>
      )}
      </div>

      <div className="memo-modal-footer">
        <div className="memo-footer-bar">
          <div className="memo-footer-left">
            <div className="memo-footer-stats">
              <span className="memo-stat-badge memo-stat-badge--pcs">
                <BarChart3 size={14} className="memo-stat-badge-icon" />
                Pcs: <b>{footerStats.pcs}</b>
              </span>
              <span className="memo-stat-badge memo-stat-badge--carats">
                <Diamond size={14} className="memo-stat-badge-icon" />
                Carats: <b>{footerStats.carats.toFixed(2)}</b>
              </span>
              <span className="memo-stat-badge memo-stat-badge--price">
                <DollarSign size={14} className="memo-stat-badge-icon" />
                Avg Price: <b>${avgPrice}</b>
              </span>
              <span className="memo-stat-badge memo-stat-badge--amount">
                <Tag size={14} className="memo-stat-badge-icon" />
                Total Amount: <b>${footerStats.amount.toFixed(2)}</b>
              </span>
              {isSaleLike && (lessPercent || otherLessPercent || extraCharge || vatAmount) ? (
                <span className="memo-stat-badge memo-stat-badge--final">
                  <DollarSign size={14} className="memo-stat-badge-icon" />
                  Final Amount: <b>${(isExport ? exportFinalAmount : discountCalc.finalAmount).toFixed(2)}</b>
                </span>
              ) : null}
            </div>

            <div className="memo-footer-narration">
              <label className="memo-narration-label">Narration</label>
              <Input
                placeholder="Enter Narration"
                value={narration}
                maxLength={200}
                onChange={(e) => setNarration(e.target.value)}
              />
            </div>
          </div>

          <div className="memo-footer-actions">
            <Button onClick={onClose} danger size="middle">Cancel</Button>
            <Button
              type="primary"
              size="middle"
              className={styles.btnSave}
              loading={submitting}
              disabled={submitting || !resolvedRowCount}
              onClick={handleSubmit}
              icon={<SendOutlined />}
            >
              {isInterCompanySell ? "Transfer & Sell" : config.submitBtn.label}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OnMemoModal;
