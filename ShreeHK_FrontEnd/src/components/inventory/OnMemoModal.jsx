import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Modal, Table, Input, InputNumber, Select, DatePicker, Button, Form, Checkbox, Typography, message } from "antd";
import { DeleteOutlined, SendOutlined } from "@ant-design/icons";
import { BarChart3, Diamond, DollarSign, Tag } from "lucide-react";
import dayjs from "dayjs";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import { cssVar } from "../../theme";
import "../../assets/scss/pages/inventory/onMemoModal.scss";

const { Text } = Typography;

const recalcFromDisc = (row) => {
  const carat = Number(row.polishCarat) || 0;
  const rapPrice = Number(row.rapPrice) || 0;
  const disc = Number(row.disc) || 0;
  const price = rapPrice > 0 ? rapPrice * (1 + disc / 100) : 0;
  const amount = price * carat;
  return { ...row, price: +price.toFixed(2), amount: +amount.toFixed(2) };
};

const recalcFromAmount = (row) => {
  const carat = Number(row.polishCarat) || 0;
  const rapPrice = Number(row.rapPrice) || 0;
  const amount = Number(row.amount) || 0;
  const price = carat > 0 ? amount / carat : 0;
  const disc = rapPrice > 0 ? ((price * 100) / rapPrice - 100) : 0;
  return { ...row, price: +price.toFixed(2), disc: +disc.toFixed(2) };
};

const recalcFromPrice = (row) => {
  const carat = Number(row.polishCarat) || 0;
  const rapPrice = Number(row.rapPrice) || 0;
  const price = Number(row.price) || 0;
  const amount = price * carat;
  const disc = rapPrice > 0 ? ((price * 100) / rapPrice - 100) : 0;
  return { ...row, amount: +amount.toFixed(2), disc: +disc.toFixed(2) };
};

const recalcFromCarat = (row, caratValue) => {
  const polishCarat = Number(caratValue) || 0;
  return recalcFromPrice({ ...row, polishCarat });
};

const isBoxOrParcel = (groupType) =>
  groupType === "box" || groupType === "parcel";

const ACTION_CONFIG = {
  memo: {
    title: "On Memo",
    headerBg: cssVar("color-warning-light"),
    headerBorder: cssVar("color-badge-warning-border"),
    accentColor: cssVar("color-warning"),
    submitBtn: { label: "Submit Memo", bg: cssVar("color-success-dark"), border: cssVar("color-success-dark") },
  },
  sell: {
    title: "Sell Diamond",
    headerBg: cssVar("color-success-light"),
    headerBorder: cssVar("color-badge-success-border"),
    accentColor: cssVar("color-success-dark"),
    submitBtn: { label: "Submit Sale", bg: cssVar("color-success-dark"), border: cssVar("color-success-dark") },
  },
  consign: {
    title: "Consignment",
    headerBg: cssVar("color-entity-other-bg"),
    headerBorder: cssVar("color-badge-info-border"),
    accentColor: cssVar("color-entity-other-text"),
    submitBtn: { label: "Submit Consignment", bg: cssVar("color-info"), border: cssVar("color-info") },
  },
};

const OnMemoModal = ({ open, onClose, selectedRows = [], onSubmit, actionType = "memo" }) => {
  const config = ACTION_CONFIG[actionType] || ACTION_CONFIG.memo;
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
        const amount = Number(row.amount) || 0;
        const disc = rapPrice > 0 ? ((price * 100) / rapPrice - 100) : 0;
        return { ...row, disc: +disc.toFixed(2), price, amount, carat };
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

  const handleRemoveRow = useCallback((id) => {
    setMemoRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const footerStats = useMemo(() => {
    return memoRows.reduce(
      (acc, row) => {
        acc.pcs += 1;
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
      if (err?.message && err.message !== "validation failed") {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: "No", width: 50, align: "center", render: (_, __, idx) => idx + 1 },
    { title: "SKU", dataIndex: "sku", width: 110 },
    { title: "Shape", dataIndex: "shape", width: 90 },
    {
      title: "Carat",
      dataIndex: "polishCarat",
      width: 80,
      align: "right",
      render: (value, record) =>
        isBoxOrParcel(record.groupType) ? (
          <InputNumber
            value={value}
            min={0}
            step={0.01}
            className="memo-editable-cell"
            onChange={(val) => handleCaratChange(record.id, val)}
          />
        ) : (
          Number(value || 0).toFixed(2)
        ),
    },
    { title: "Color", dataIndex: "color", width: 70 },
    { title: "Clarity", dataIndex: "clarity", width: 80 },
    { title: "Lab", dataIndex: "lab", width: 60 },
    { title: "Cert #", dataIndex: "certificate", width: 120 },
    { title: "Rap Price", dataIndex: "rapPrice", width: 100, render: (v) => `$${Number(v || 0).toLocaleString()}` },
    {
      title: "Disc %",
      dataIndex: "disc",
      width: 120,
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
      render: (v) => <Text strong>${Number(v || 0).toFixed(2)}</Text>,
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
      style={{ top: 120 }}
      destroyOnClose
      maskClosable={false}
      title={
        <div className="memo-modal-title" style={{ background: config.headerBg, borderTop: `4px solid ${config.accentColor}` }}>
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
          <Form.Item label={<span>Date <span style={{ color: "red" }}>*</span></span>} name="date" rules={[{ required: true, message: "Date required" }]}>
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
          <Form.Item label={<span>Company <span style={{ color: "red" }}>*</span></span>} name="company" rules={[{ required: true, message: "Company required" }]}>
            <Select options={companyOptions} placeholder="Select Company" allowClear showSearch optionFilterProp="label" style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="invoiceType">
            <Select options={[{ label: "Invoice From", value: "Invoice From" }, { label: "Invoice To", value: "Invoice To" }]} style={{ width: 130 }} />
          </Form.Item>
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
          scroll={{ x: "max-content", y: actionType === "sell" ? "calc(100vh - 580px)" : "calc(100vh - 380px)" }}
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
        <div className="memo-footer-stats">
          <div className="memo-stat-card">
            <div className="memo-stat-icon memo-stat-icon--pcs"><BarChart3 size={20} /></div>
            <div className="memo-stat-info">
              <span className="memo-stat-label">Pcs</span>
              <span className="memo-stat-value">{footerStats.pcs}</span>
            </div>
          </div>
          <div className="memo-stat-card">
            <div className="memo-stat-icon memo-stat-icon--carats"><Diamond size={20} /></div>
            <div className="memo-stat-info">
              <span className="memo-stat-label">Carats</span>
              <span className="memo-stat-value">{footerStats.carats.toFixed(2)}</span>
            </div>
          </div>
          <div className="memo-stat-card">
            <div className="memo-stat-icon memo-stat-icon--price"><DollarSign size={20} /></div>
            <div className="memo-stat-info">
              <span className="memo-stat-label">Avg Price</span>
              <span className="memo-stat-value">${avgPrice}</span>
            </div>
          </div>
          <div className="memo-stat-card">
            <div className="memo-stat-icon memo-stat-icon--amount"><Tag size={20} /></div>
            <div className="memo-stat-info">
              <span className="memo-stat-label">Total Amount</span>
              <span className="memo-stat-value">${footerStats.amount.toFixed(2)}</span>
            </div>
          </div>
          {actionType === "sell" && (lessPercent || otherLessPercent || extraCharge) ? (
            <div className="memo-stat-card">
              <div className="memo-stat-icon memo-stat-icon--final"><DollarSign size={20} /></div>
              <div className="memo-stat-info">
                <span className="memo-stat-label">Final Amount</span>
                <span className="memo-stat-value memo-stat-value--amount">${discountCalc.finalAmount.toFixed(2)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="memo-footer-narration">
          <label className="memo-narration-label">Narration <span>(Optional)</span></label>
          <Input.TextArea
            rows={3}
            placeholder="Enter narration..."
            value={narration}
            maxLength={200}
            showCount
            onChange={(e) => setNarration(e.target.value)}
          />
        </div>

        <div className="memo-footer-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
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
