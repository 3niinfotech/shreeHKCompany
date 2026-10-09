import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { CheckOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { BaseModal } from "../../common/modals";
import { useFetchApi } from "../../../api/ApiFunction";
import { ENDPOINTS, QUERY_KEYS } from "../../../api/endpoints";
import { toastWarning } from "../../../utils/toastNotify";
import styles from "../../../assets/scss/pages/outward.module.scss";

const { Text } = Typography;
const { TextArea } = Input;

const ATTR_COLS = [
  { title: "Report No.", dataIndex: "report_no", width: 110 },
  { title: "Shape", dataIndex: "shape", width: 110 },
  { title: "Clarity", dataIndex: "clarity", width: 80 },
  { title: "Intensity", dataIndex: "intensity", width: 90 },
  { title: "Overtone", dataIndex: "overtone", width: 90 },
  { title: "Color", dataIndex: "color", width: 80 },
  { title: "Size", dataIndex: "size", width: 70 },
  { title: "Polish", dataIndex: "polish", width: 70 },
  { title: "Symm", dataIndex: "symmentry", width: 70 },
  { title: "Cut", dataIndex: "cut", width: 70 },
  { title: "Flo. Intensity", dataIndex: "f_intensity", width: 110 },
  { title: "Measurements", dataIndex: "mesurment", width: 120 },
  { title: "Table%", dataIndex: "table_pc", width: 70 },
  { title: "Depth%", dataIndex: "depth_pc", width: 70 },
  { title: "Gridle", dataIndex: "gridle", width: 80 },
  { title: "BGM", dataIndex: "bgm", width: 60 },
  { title: "Eyeclean", dataIndex: "eyeclean", width: 80 },
  { title: "Remark", dataIndex: "remark", width: 120 },
  { title: "Lab", dataIndex: "lab", width: 70 },
];

/**
 * Out-Memo → Sale / Return popup (Venya Memo-to-Sale layout).
 * Sale: header + wide attr grid + less%/payment + Save Sale
 * Return: pcs/carat edit + Return Memo
 */
const MemoConvertModal = ({
  open,
  mode = "sale",
  record,
  productIds = [],
  products = [],
  loading = false,
  onClose,
  onConfirm,
}) => {
  const [rows, setRows] = useState([]);
  const [narration, setNarration] = useState("");
  const [header, setHeader] = useState({
    invoice: "",
    reference: "",
    date: null,
    terms: 0,
    duedate: null,
    party: undefined,
    shipping_name: undefined,
    origin_of: undefined,
    shipping_charge: 0,
  });
  const [lessPercent, setLessPercent] = useState(null);
  const [otherLessPercent, setOtherLessPercent] = useState(null);
  const [extraCharge, setExtraCharge] = useState(null);
  const [onPayment, setOnPayment] = useState(false);
  const [payment, setPayment] = useState({
    book: undefined,
    bdate: null,
    paid_amount: null,
    cheque: "",
  });

  const isSale = mode === "sale";
  const title = isSale ? "Memo to Sale" : "Memo Return";

  const { data: companyData } = useFetchApi(
    "GetCompany",
    ENDPOINTS.company.options,
    {},
    "GET",
    { enabled: open && isSale }
  );
  const { data: shippingData } = useFetchApi(
    [QUERY_KEYS.shipping, "memo-sale"],
    ENDPOINTS.shipping.list,
    { limit: 500 },
    "GET",
    { enabled: open && isSale }
  );
  const { data: originData } = useFetchApi(
    [QUERY_KEYS.origins, "memo-sale"],
    ENDPOINTS.origin.list,
    { limit: 500 },
    "GET",
    { enabled: open && isSale }
  );
  const { data: bookData } = useFetchApi(
    ["memo-sale-books"],
    ENDPOINTS.accountingTxn.books,
    {},
    "GET",
    { enabled: open && isSale }
  );

  const partyOptions = useMemo(() => {
    const d = companyData?.Data || companyData?.data;
    return Array.isArray(d)
      ? d.map((item) => ({ label: item.name, value: String(item.id) }))
      : [];
  }, [companyData]);

  const shippingOptions = useMemo(() => {
    const d = shippingData?.Data || shippingData?.data || shippingData;
    const list = Array.isArray(d) ? d : [];
    return list.map((item) => ({
      label: item.name || item.shipping_name || String(item.id),
      value: String(item.id),
    }));
  }, [shippingData]);

  const originOptions = useMemo(() => {
    const d = originData?.Data || originData?.data || originData;
    const list = Array.isArray(d) ? d : [];
    return list.map((item) => ({
      label: item.name || item.origin_name || String(item.id),
      value: String(item.id),
    }));
  }, [originData]);

  const bookOptions = useMemo(() => {
    const list = bookData?.Data || bookData?.data || [];
    if (!Array.isArray(list)) return [];
    return list.map((b) => {
      if (b && typeof b === "object" && b.value != null) {
        return { value: String(b.value), label: String(b.label ?? b.value) };
      }
      const name = b?.name ?? String(b);
      return { value: name, label: name };
    });
  }, [bookData]);

  const pickAttr = (p) => ({
    mfg_code: p.mfg_code || "",
    diamond_no: p.diamond_no || p.d_no || "",
    sku: p.sku || "-",
    group_type: p.group_type || "",
    location: p.location || p.loc || "",
    remark: p.remark || "",
    lab: p.lab || "",
    report_no: p.report_no || "",
    shape: p.shape || "",
    clarity: p.clarity || "",
    intensity: p.intensity || "",
    overtone: p.overtone || "",
    color: p.color || p.main_color || "",
    size: p.size || "",
    polish: p.polish || "",
    symmentry: p.symmentry || p.symmetry || "",
    cut: p.cut || "",
    f_intensity: p.f_intensity || p.fluorescence || "",
    mesurment: p.mesurment || p.measurement || "",
    table_pc: p.table_pc || "",
    depth_pc: p.depth_pc || "",
    gridle: p.gridle || p.girdle || "",
    bgm: p.bgm || "",
    eyeclean: p.eyeclean || p.eyeClean || "",
  });

  const buildRows = () => {
    if (!productIds?.length) return [];
    return productIds.map((id) => {
      const p = products.find((row) => String(row.id) === String(id)) || {};
      const pcs = Number(p.polish_pcs) || 0;
      const carat = Number(p.polish_carat) || 0;
      const price = Number(p.sell_price ?? p.price) || 0;
      const cost = Number(p.cost) || 0;
      return {
        id: p.id || id,
        ...pickAttr(p),
        cost,
        maxPcs: pcs,
        maxCarat: carat,
        polish_pcs: pcs,
        polish_carat: carat,
        price,
        amount: Math.round(carat * price * 100) / 100,
      };
    });
  };

  const resetHeaderFromRecord = () => {
    const today = dayjs();
    const terms = Number(record?.terms) || 0;
    setHeader({
      invoice: record?.invoiceno || "",
      reference: record?.reference || "",
      date: record?.date ? dayjs(record.date) : today,
      terms,
      duedate: record?.duedate
        ? dayjs(record.duedate)
        : today.add(terms, "day"),
      party: record?.party != null ? String(record.party) : undefined,
      shipping_name: record?.shipping_name != null && record.shipping_name !== ""
        ? String(record.shipping_name)
        : undefined,
      origin_of: record?.origin_of != null && record.origin_of !== ""
        ? String(record.origin_of)
        : undefined,
      shipping_charge: Number(record?.shipping_charge) || 0,
    });
    setLessPercent(null);
    setOtherLessPercent(null);
    setExtraCharge(null);
    setOnPayment(false);
    setPayment({
      book: undefined,
      bdate: today,
      paid_amount: null,
      cheque: "",
    });
  };

  useEffect(() => {
    if (!open || !productIds?.length) {
      setRows([]);
      setNarration("");
      return;
    }
    setRows(buildRows());
    setNarration("");
    if (isSale) resetHeaderFromRecord();
  }, [open, productIds, products, isSale, record]);

  useEffect(() => {
    if (!isSale || !open) return;
    const base = header.date ? dayjs(header.date) : null;
    if (!base?.isValid()) return;
    const days = Number(header.terms) || 0;
    const nextDue = base.add(days, "day");
    setHeader((prev) => {
      if (prev.duedate && dayjs(prev.duedate).isSame(nextDue, "day")) return prev;
      return { ...prev, duedate: nextDue };
    });
  }, [header.date, header.terms, isSale, open]);

  const handleReset = () => {
    setRows(buildRows());
    setNarration("");
    if (isSale) resetHeaderFromRecord();
  };

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (String(row.id) !== String(id)) return row;
        const next = { ...row, [field]: value };
        const carat = Number(next.polish_carat) || 0;
        const price = Number(next.price) || 0;
        next.amount = Math.round(carat * price * 100) / 100;
        return next;
      })
    );
  };

  const totals = useMemo(() => {
    let pcs = 0;
    let carat = 0;
    let amount = 0;
    rows.forEach((r) => {
      pcs += Number(r.polish_pcs) || 0;
      carat += Number(r.polish_carat) || 0;
      amount += Number(r.amount) || 0;
    });
    return {
      pcs,
      carat,
      amount,
      price: carat > 0 ? amount / carat : 0,
    };
  }, [rows]);

  const discountCalc = useMemo(() => {
    const base = totals.amount + (Number(header.shipping_charge) || 0);
    const lp = Number(lessPercent) || 0;
    const lessDiscountAmt = (base * lp) / 100;
    const afterLess = base - lessDiscountAmt;
    const olp = Number(otherLessPercent) || 0;
    const otherLessDiscountAmt = (afterLess * olp) / 100;
    const afterOtherLess = afterLess - otherLessDiscountAmt;
    const finalAmount = afterOtherLess + (Number(extraCharge) || 0);
    return {
      lessDiscountAmt,
      afterLess,
      otherLessDiscountAmt,
      afterOtherLess,
      finalAmount,
    };
  }, [totals.amount, header.shipping_charge, lessPercent, otherLessPercent, extraCharge]);

  useEffect(() => {
    if (!isSale || !onPayment) return;
    setPayment((prev) => ({
      ...prev,
      paid_amount: Number(discountCalc.finalAmount.toFixed(2)),
    }));
  }, [discountCalc.finalAmount, onPayment, isSale]);

  const handleOk = () => {
    for (const row of rows) {
      if (Number(row.polish_pcs) > Number(row.maxPcs)) {
        toastWarning(`Pcs exceed stock for SKU ${row.sku}`);
        return;
      }
      if (Number(row.polish_carat) > Number(row.maxCarat)) {
        toastWarning(`Carat exceed stock for SKU ${row.sku}`);
        return;
      }
      if (Number(row.polish_carat) <= 0) {
        toastWarning(`Enter carat for SKU ${row.sku}`);
        return;
      }
      if (isSale && (row.price === "" || row.price == null || Number.isNaN(Number(row.price)))) {
        toastWarning(`Enter price for SKU ${row.sku}`);
        return;
      }
    }

    if (isSale && !header.party) {
      toastWarning("Select Company / Party");
      return;
    }

    const payloadRecord = {};
    const productsOut = [];
    rows.forEach((row) => {
      productsOut.push(row.id);
      payloadRecord[row.id] = {
        id: row.id,
        polish_pcs: Number(row.polish_pcs) || 0,
        polish_carat: Number(row.polish_carat) || 0,
        price: Number(row.price) || 0,
        amount: Number(row.amount) || 0,
        group_type: row.group_type,
        cost: Number(row.cost) || 0,
        location: row.location,
        remark: row.remark,
        lab: row.lab,
      };
    });

    const payload = {
      id: record?.id,
      memo_id: record?.id,
      products: productsOut,
      record: payloadRecord,
      type: isSale ? "sale" : "return",
      party: isSale ? header.party : record?.party,
      narretion: narration,
    };

    if (isSale) {
      Object.assign(payload, {
        invoiceno: header.invoice,
        reference: header.reference,
        date: header.date?.format?.("YYYY-MM-DD") ?? header.date,
        invoicedate: header.date?.format?.("YYYY-MM-DD") ?? header.date,
        terms: header.terms,
        duedate: header.duedate?.format?.("YYYY-MM-DD") ?? header.duedate,
        shipping_name: header.shipping_name,
        origin_of: header.origin_of,
        shipping_charge: Number(header.shipping_charge) || 0,
        less_percent: Number(lessPercent) || 0,
        less_amount: discountCalc.lessDiscountAmt,
        other_less_percent: Number(otherLessPercent) || 0,
        other_less_amount: discountCalc.otherLessDiscountAmt,
        charge: Number(extraCharge) || 0,
        final_amount: discountCalc.finalAmount,
        due_amount: onPayment
          ? Math.max(0, discountCalc.finalAmount - (Number(payment.paid_amount) || 0))
          : discountCalc.finalAmount,
        paid_amount: onPayment ? Number(payment.paid_amount) || 0 : 0,
        ...(onPayment
          ? {
              on_payment: 1,
              book: payment.book,
              bdate: payment.bdate?.format?.("YYYY-MM-DD") ?? payment.bdate,
              cheque: payment.cheque,
            }
          : {}),
      });
    }

    onConfirm?.(payload);
  };

  const columns = useMemo(() => {
    const cols = [
      {
        title: "No",
        key: "no",
        width: 48,
        fixed: "left",
        align: "center",
        render: (_v, _r, idx) => idx + 1,
      },
      { title: "Mfg. code", dataIndex: "mfg_code", key: "mfg_code", width: 100, fixed: "left" },
      { title: "D. No.", dataIndex: "diamond_no", key: "diamond_no", width: 90, fixed: "left" },
      { title: "SKU", dataIndex: "sku", key: "sku", width: 160, fixed: "left" },
      {
        title: "Pcs",
        dataIndex: "polish_pcs",
        key: "polish_pcs",
        width: 80,
        render: (v, row) => (
          <InputNumber
            min={0}
            max={row.maxPcs}
            value={v}
            size="small"
            style={{ width: "100%" }}
            onChange={(val) => updateRow(row.id, "polish_pcs", val ?? 0)}
          />
        ),
      },
      {
        title: "Carat",
        dataIndex: "polish_carat",
        key: "polish_carat",
        width: 90,
        render: (v, row) => (
          <InputNumber
            min={0}
            max={row.maxCarat}
            step={0.001}
            value={v}
            size="small"
            style={{ width: "100%" }}
            onChange={(val) => updateRow(row.id, "polish_carat", val ?? 0)}
          />
        ),
      },
      {
        title: "Cost",
        dataIndex: "cost",
        key: "cost",
        width: 90,
        render: (v, row) =>
          isSale ? (
            <InputNumber
              min={0}
              step={0.01}
              value={v}
              size="small"
              style={{ width: "100%" }}
              onChange={(val) => updateRow(row.id, "cost", val ?? 0)}
            />
          ) : (
            Number(v || 0).toFixed(2)
          ),
      },
      {
        title: "Price",
        dataIndex: "price",
        key: "price",
        width: 90,
        render: (v, row) =>
          isSale ? (
            <InputNumber
              min={0}
              step={0.01}
              value={v}
              size="small"
              style={{ width: "100%" }}
              onChange={(val) => updateRow(row.id, "price", val ?? 0)}
            />
          ) : (
            Number(v || 0).toFixed(2)
          ),
      },
      {
        title: "Amount",
        dataIndex: "amount",
        key: "amount",
        width: 100,
        align: "right",
        render: (v) => <Text strong>{Number(v || 0).toFixed(2)}</Text>,
      },
      { title: "LOC", dataIndex: "location", key: "location", width: 90, ellipsis: true },
      ...ATTR_COLS.map((c) => ({
        title: c.title,
        dataIndex: c.dataIndex,
        key: c.dataIndex,
        width: c.width,
        ellipsis: true,
        render: (v) => v || "",
      })),
    ];
    return cols;
  }, [isSale]);

  const scrollX = 48 + 100 + 90 + 120 + 80 + 90 + 90 + 90 + 100 + 90
    + ATTR_COLS.reduce((s, c) => s + c.width, 0);

  const titleNode = (
    <span className={styles.memoConvertTitle}>
      <span className={styles.memoConvertTitleText}>{title}</span>
      {record?.id ? (
        <span className={styles.memoConvertBadge}>Outward-{record.id}</span>
      ) : null}
    </span>
  );

  return (
    <BaseModal
      isOpen={open}
      onClose={onClose}
      title={titleNode}
      width={isSale ? 1480 : 1280}
      className={styles.memoConvertModal}
      footer={(
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Reset
          </Button>
          <Button type="primary" icon={<CheckOutlined />} loading={loading} onClick={handleOk}>
            {isSale ? "Save Sale" : "Return Memo"}
          </Button>
          <Button danger onClick={onClose}>
            Close
          </Button>
        </Space>
      )}
      content={(
        <div className={styles.memoConvertBody}>
          {isSale ? (
            <div className={styles.memoConvertHeader}>
              <div className={styles.memoConvertHeaderRow}>
                <div className={styles.memoConvertField}>
                  <label className={styles.memoConvertLbl}>Invoice</label>
                  <Input
                    value={header.invoice}
                    onChange={(e) => setHeader((h) => ({ ...h, invoice: e.target.value }))}
                  />
                </div>
                <div className={styles.memoConvertField}>
                  <label className={styles.memoConvertLbl}>Reference</label>
                  <Input
                    value={header.reference}
                    onChange={(e) => setHeader((h) => ({ ...h, reference: e.target.value }))}
                  />
                </div>
                <div className={`${styles.memoConvertField} ${styles.memoConvertFieldMd}`}>
                  <label className={styles.memoConvertLbl}>Date</label>
                  <DatePicker
                    style={{ width: "100%" }}
                    format="DD-MM-YYYY"
                    value={header.date}
                    onChange={(v) => setHeader((h) => ({ ...h, date: v }))}
                  />
                </div>
                <div className={styles.memoConvertField}>
                  <label className={styles.memoConvertLbl}>Terms</label>
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    value={header.terms}
                    onChange={(v) => setHeader((h) => ({ ...h, terms: v ?? 0 }))}
                  />
                </div>
                <div className={`${styles.memoConvertField} ${styles.memoConvertFieldMd}`}>
                  <label className={styles.memoConvertLbl}>Due Date</label>
                  <DatePicker
                    style={{ width: "100%" }}
                    format="DD-MM-YYYY"
                    value={header.duedate}
                    onChange={(v) => setHeader((h) => ({ ...h, duedate: v }))}
                  />
                </div>
              </div>
              <div className={styles.memoConvertHeaderRow}>
                <div className={`${styles.memoConvertField} ${styles.memoConvertFieldWide}`}>
                  <label className={styles.memoConvertLbl}>Company</label>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    options={partyOptions}
                    value={header.party}
                    onChange={(v) => setHeader((h) => ({ ...h, party: v }))}
                    placeholder="Select Company"
                  />
                </div>
                <div className={`${styles.memoConvertField} ${styles.memoConvertFieldMd}`}>
                  <label className={styles.memoConvertLbl}>Shipping</label>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    options={shippingOptions}
                    value={header.shipping_name}
                    onChange={(v) => setHeader((h) => ({ ...h, shipping_name: v }))}
                    placeholder="Select Shipping"
                  />
                </div>
                <div className={`${styles.memoConvertField} ${styles.memoConvertFieldMd}`}>
                  <label className={styles.memoConvertLbl}>Origin</label>
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    style={{ width: "100%" }}
                    options={originOptions}
                    value={header.origin_of}
                    onChange={(v) => setHeader((h) => ({ ...h, origin_of: v }))}
                    placeholder="Select Origin"
                  />
                </div>
                <div className={styles.memoConvertField}>
                  <label className={styles.memoConvertLbl}>Charge</label>
                  <InputNumber
                    min={0}
                    style={{ width: "100%" }}
                    value={header.shipping_charge}
                    onChange={(v) => setHeader((h) => ({ ...h, shipping_charge: v ?? 0 }))}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className={styles.stockEditProductWrap}>
            <Table
              className={styles.stockEditProductTable}
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={rows}
              columns={columns}
              scroll={{ x: scrollX, y: isSale ? 240 : 280 }}
            />
            <div className={styles.stockEditTotalsBar}>
              <div className={styles.stockEditTotalsMetrics}>
                <span>
                  Pcs : <b>{totals.pcs}</b>
                </span>
                <span>
                  Carats : <b>{totals.carat.toFixed(3)}</b>
                </span>
                <span>
                  Price : <b>{totals.price.toFixed(2)}</b>
                </span>
                <span>
                  Amount : <b>{totals.amount.toFixed(2)}</b>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.memoConvertNarration}>
            <label>Narration</label>
            <TextArea
              rows={2}
              value={narration}
              placeholder="Narration..."
              onChange={(e) => setNarration(e.target.value)}
            />
          </div>

          {isSale ? (
            <div className={styles.memoConvertExtras}>
              <div className={styles.memoConvertExtrasRow}>
                <div className={styles.memoConvertExtraGroup}>
                  <label className={styles.memoConvertLbl}>Less %</label>
                  <div className={styles.memoConvertExtraInputs}>
                    <InputNumber
                      placeholder="Enter Less %"
                      value={lessPercent}
                      onChange={setLessPercent}
                      step={0.01}
                    />
                    <InputNumber
                      readOnly
                      placeholder="Disc Amt"
                      value={lessPercent ? Number(discountCalc.lessDiscountAmt.toFixed(2)) : null}
                    />
                    <InputNumber
                      readOnly
                      placeholder="After Less"
                      value={lessPercent ? Number(discountCalc.afterLess.toFixed(2)) : null}
                    />
                  </div>
                </div>
                <div className={styles.memoConvertExtraGroup}>
                  <label className={styles.memoConvertLbl}>Other Less %</label>
                  <div className={styles.memoConvertExtraInputs}>
                    <InputNumber
                      placeholder="Enter Less %"
                      value={otherLessPercent}
                      onChange={setOtherLessPercent}
                      step={0.01}
                    />
                    <InputNumber
                      readOnly
                      placeholder="Disc Amt"
                      value={otherLessPercent ? Number(discountCalc.otherLessDiscountAmt.toFixed(2)) : null}
                    />
                    <InputNumber
                      readOnly
                      placeholder="After Less"
                      value={otherLessPercent ? Number(discountCalc.afterOtherLess.toFixed(2)) : null}
                    />
                  </div>
                </div>
                <div className={`${styles.memoConvertExtraGroup} ${styles.memoConvertExtraGroupSm}`}>
                  <label className={styles.memoConvertLbl}>Extra Charge</label>
                  <div className={styles.memoConvertExtraInputs}>
                    <InputNumber
                      placeholder="0.00"
                      value={extraCharge}
                      onChange={setExtraCharge}
                      step={0.01}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.memoConvertPayRow}>
                <div className={styles.memoConvertPayCheck}>
                  <Checkbox checked={onPayment} onChange={(e) => setOnPayment(e.target.checked)}>
                    On Payment
                  </Checkbox>
                </div>
                <div className={styles.memoConvertExtraGroup}>
                  <label className={styles.memoConvertLbl}>Select Book</label>
                  <Select
                    style={{ width: "100%" }}
                    options={bookOptions}
                    value={payment.book}
                    onChange={(v) => setPayment((p) => ({ ...p, book: v }))}
                    placeholder="Book"
                    disabled={!onPayment}
                  />
                </div>
                <div className={styles.memoConvertExtraGroup}>
                  <label className={styles.memoConvertLbl}>Date</label>
                  <DatePicker
                    style={{ width: "100%" }}
                    format="DD-MM-YYYY"
                    value={payment.bdate}
                    onChange={(v) => setPayment((p) => ({ ...p, bdate: v }))}
                    disabled={!onPayment}
                  />
                </div>
                <div className={styles.memoConvertExtraGroup}>
                  <label className={styles.memoConvertLbl}>Amount</label>
                  <InputNumber
                    style={{ width: "100%" }}
                    value={payment.paid_amount}
                    onChange={(v) => setPayment((p) => ({ ...p, paid_amount: v }))}
                    disabled={!onPayment}
                  />
                </div>
                <div className={styles.memoConvertExtraGroup}>
                  <label className={styles.memoConvertLbl}>Cheque</label>
                  <Input
                    value={payment.cheque}
                    onChange={(e) => setPayment((p) => ({ ...p, cheque: e.target.value }))}
                    disabled={!onPayment}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    />
  );
};

export default MemoConvertModal;
