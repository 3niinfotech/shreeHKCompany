import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Modal, Table, Input, InputNumber, Select, DatePicker, Button, Form, Checkbox, message } from "antd";
import { toast } from "sonner";
import { DeleteOutlined, SendOutlined } from "@ant-design/icons";
import { BarChart3, Diamond, DollarSign, Tag } from "lucide-react";
import dayjs from "dayjs";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import { getActionTheme } from "./inventoryActionConfig";
import { SkuLink } from "../../hooks/useSkuModalAction";
import "../../assets/scss/pages/inventory/onMemoModal.scss";

/** Same formula as OutwardEntryForm / InwardEntryForm: amount = carat × price */
const calcAmount = (carat, price) =>
  Math.round((Number(carat) || 0) * (Number(price) || 0) * 100) / 100;

const isBoxOrParcel = (groupType) =>
  groupType === "box" || groupType === "parcel";

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

const buildActionConfig = (actionType) => {
  const themeKey = actionType === "memo" ? "onMemo" : actionType === "consign" ? "consignment" : "sell";
  const theme = getActionTheme(themeKey);
  const titles = {
    memo: "On Memo",
    sell: "Sell Diamond",
    consign: "Consignment",
  };
  const submitLabels = {
    memo: "Submit Memo",
    sell: "Submit Sale",
    consign: "Submit Consignment",
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
  const [memoRows, setMemoRows] = useState([]);
  const [narration, setNarration] = useState("");
  const [lessPercent, setLessPercent] = useState(null);
  const [otherLessPercent, setOtherLessPercent] = useState(null);
  const [extraCharge, setExtraCharge] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const { data: companyData } = useFetchApi("GetCompany", ENDPOINTS.company.options);
  const { data: incrementData } = useFetchApi(
    "getIncrement",
    ENDPOINTS.common.increment,
    {},
    "GET",
    { enabled: open },
  );

  const companyOptions = useMemo(() => {
    const d = companyData?.Data || companyData?.data;
    return Array.isArray(d) ? d.map((item) => ({ label: item.name, value: item.id })) : [];
  }, [companyData]);

  useEffect(() => {
    if (open && selectedRows.length > 0) {
      const rows = selectedRows.map((row) => {
        const carat = Number(row.polishCarat) || 0;
        const rapPrice = Number(row.rapPrice) || 0;
        const price = Number(row.price) || 0;
        const polishPcs = Number(row.polishPcs) || 1;
        const amount = Number(row.amount) || calcAmount(carat, price);
        const basePrice = rapPrice > 0 ? rapPrice : price;
        const disc = rapPrice > 0 ? ((price * 100) / rapPrice - 100) : 0;
        return {
          ...row,
          disc: +disc.toFixed(2),
          price,
          amount: calcAmount(carat, price) || amount,
          carat,
          basePrice,
          polishPcs,
          stockPcs: polishPcs,
          stockCarat: carat,
        };
      });
      setMemoRows(rows);
      setNarration("");
      setLessPercent(null);
      setOtherLessPercent(null);
      setExtraCharge(null);
      const inc = incrementData?.Data;
      form.setFieldsValue({
        date: dayjs(),
        invoiceType: "Invoice From",
        ...(inc
          ? {
            entryno: inc.outward,
            invoiceno: inc.invoice != null ? String(inc.invoice) : undefined,
          }
          : {}),
      });
    }
  }, [open, selectedRows, form, actionType, incrementData]);

  const handleFormValuesChange = (changedValues) => {
    if (actionType !== "sell") return;
    const { date, terms } = changedValues;
    if (date !== undefined || terms !== undefined) {
      const currentDate = form.getFieldValue("date");
      const currentTerms = form.getFieldValue("terms");
      if (currentDate && currentTerms) {
        form.setFieldsValue({ duedate: currentDate.add(Number(currentTerms), "day") });
      }
    }
  };

  const handleDiscChange = useCallback((id, value) => {
    setMemoRows((prev) =>
      prev.map((row) => (row.id === id ? recalcFromDisc({ ...row, disc: value }) : row))
    );
  }, []);

  const handleAmountChange = useCallback((id, value) => {
    setMemoRows((prev) =>
      prev.map((row) => (row.id === id ? recalcFromAmount({ ...row, amount: value }) : row))
    );
  }, []);

  const handlePriceChange = useCallback((id, value) => {
    setMemoRows((prev) =>
      prev.map((row) => (row.id === id ? recalcFromPrice({ ...row, price: value }) : row))
    );
  }, []);

  const handleCaratChange = useCallback((id, value) => {
    setMemoRows((prev) =>
      prev.map((row) => (row.id === id ? recalcFromCarat(row, value) : row))
    );
  }, []);

  const handlePcsChange = useCallback((id, value) => {
    setMemoRows((prev) =>
      prev.map((row) => (row.id === id ? recalcFromPcs(row, value) : row))
    );
  }, []);

  const handleRemoveRow = useCallback((id) => {
    setMemoRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const footerStats = useMemo(() => {
    return memoRows.reduce(
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

  const handleSubmit = async () => {
    if (!memoRows.length) {
      message.warning("Please select at least one diamond");
      return;
    }
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        type: actionType === "sell" ? "sale" : actionType === "consign" ? "consign" : "memo",
        date: values.date?.format("YYYY-MM-DD"),
        narration: narration,
        lessPercent: Number(lessPercent) || 0,
        lessAmount: discountCalc.lessDiscountAmt,
        otherLessPercent: Number(otherLessPercent) || 0,
        otherLessAmount: discountCalc.otherLessDiscountAmt,
        extraCharge: Number(extraCharge) || 0,
        finalAmount: discountCalc.finalAmount,
        products: memoRows.map((r) => ({
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
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: "No", width: 50, align: "center", render: (_, __, idx) => idx + 1 },
    { title: "SKU", dataIndex: "sku", width: 110, align: "center", render: (text, record) => <SkuLink sku={text} record={record} /> },
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
          className="memo-editable-cell"
          onChange={(val) => handlePcsChange(record.id, val)}
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
          className="memo-editable-cell"
          onChange={(val) => handleCaratChange(record.id, val)}
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
          className="memo-editable-cell"
          onChange={(val) => handleDiscChange(record.id, val)}
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
          className="memo-editable-cell"
          onChange={(val) => handlePriceChange(record.id, val)}
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
          className="memo-editable-cell"
          onChange={(val) => handleAmountChange(record.id, val)}
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
          onClick={() => handleRemoveRow(record.id)}
        />
      ),
    },
  ];

  return (
    <Modal
      className={`on-memo-modal ${actionType === "sell" ? "on-memo-modal--sell" : ""}`}
      open={open}
      onCancel={onClose}
      width="85vw"
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
      title={
        <div className="memo-modal-title">
          <span className="memo-title-text">{config.title}</span>
          <span className="memo-title-count">{memoRows.length} diamond(s) selected — fill details below</span>
        </div>
      }
      footer={null}
    >
      <div className="memo-modal-header">
        <Form form={form} layout="inline" className="memo-header-form" onValuesChange={handleFormValuesChange}>
          <Form.Item label="Outward" name="entryno">
            <Input placeholder="Outward-###" readOnly style={{ width: 110 }} />
          </Form.Item>
          <Form.Item label="Invoice" name="invoiceno">
            <Input placeholder="Invoice No" style={{ width: 100 }} />
          </Form.Item>
          <Form.Item label="Reference" name="reference">
            <Input placeholder="#Ref" style={{ width: 110 }} />
          </Form.Item>
          <Form.Item label="Date" name="date" rules={[{ required: true, message: "Date required" }]}>
            <DatePicker format="YYYY-MM-DD" style={{ width: 130 }} />
          </Form.Item>
          {actionType === "sell" && (
            <>
              <Form.Item label="Terms" name="terms">
                <InputNumber placeholder="Days" min={0} style={{ width: 80 }} />
              </Form.Item>
              <Form.Item label="Due Date" name="duedate">
                <DatePicker format="YYYY-MM-DD" style={{ width: 130 }} />
              </Form.Item>
            </>
          )}
          <Form.Item label="Company" name="company" rules={[{ required: true, message: "Company required" }]}>
            <Select options={companyOptions} placeholder="Select Company" allowClear showSearch optionFilterProp="label" style={{ width: 180 }} />
          </Form.Item>
          {/* <Form.Item name="invoiceType">
            <Select options={[{ label: "Invoice From", value: "Invoice From" }, { label: "Invoice To", value: "Invoice To" }]} style={{ width: 130 }} />
          </Form.Item> */}
          <Form.Item label="Other Party" name="other_party">
            <Select options={companyOptions} placeholder="Select other Party" allowClear showSearch optionFilterProp="label" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="boc" valuePropName="checked"><Checkbox>BOC</Checkbox></Form.Item>
          <Form.Item name="citi" valuePropName="checked"><Checkbox>Citi</Checkbox></Form.Item>
          <Form.Item name="dbs" valuePropName="checked"><Checkbox>DBS</Checkbox></Form.Item>
          <Form.Item name="sc" valuePropName="checked"><Checkbox>SC</Checkbox></Form.Item>
        </Form>
      </div>

      <div className="memo-modal-table">
        <Table
          columns={columns}
          dataSource={memoRows}
          rowKey="id"
          pagination={false}
          bordered
          scroll={{ x: "max-content", y: actionType === "sell" ? "calc(100vh - 520px)" : "calc(100vh - 340px)" }}
        />
      </div>

      {actionType === "sell" && (
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
              <DatePicker format="YYYY-MM-DD" style={{ width: 130 }} />
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

      <div className="memo-modal-footer">
        <div className="memo-footer-stats-row">
          <div className="memo-footer-stats">
            <div className="memo-footer-stats-left">
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
            </div>
            <div className="memo-footer-stats-right">
              {actionType === "sell" && (lessPercent || otherLessPercent || extraCharge) ? (
                <span className="memo-stat-badge memo-stat-badge--final">
                  <DollarSign size={14} className="memo-stat-badge-icon" />
                  Final Amount: <b>${discountCalc.finalAmount.toFixed(2)}</b>
                </span>
              ) : null}
            </div>
          </div>

          <div className="memo-footer-narration">
            <label className="memo-narration-label">Narration <span>(Optional)</span></label>
            <Input.TextArea
              rows={1}
              placeholder="Enter narration..."
              value={narration}
              maxLength={200}
              showCount
              onChange={(e) => setNarration(e.target.value)}
            />
          </div>
        </div>

        <div className="memo-footer-actions">
          <Button onClick={onClose} danger size="middle">Cancel</Button>
          <Button
            type="primary"
            size="middle"
            loading={submitting}
            disabled={submitting || !memoRows.length}
            onClick={handleSubmit}
            icon={<SendOutlined />}
            style={{ background: config.submitBtn.bg, borderColor: config.submitBtn.border }}
          >
            {config.submitBtn.label}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default OnMemoModal;
