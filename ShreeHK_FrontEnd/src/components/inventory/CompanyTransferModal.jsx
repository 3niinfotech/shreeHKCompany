import React, { useState, useEffect, useMemo } from "react";
import { Form, Select, DatePicker, Input, InputNumber, Table, Typography, Row, Col, Card } from "antd";
import { ArrowLeftRight, Building, Calendar, FileText, User } from "lucide-react";
import dayjs from "dayjs";
import { BaseModal } from "../common/modals";
import useBranchCompanies from "../../hooks/useBranchCompanies";
import useAuthStore from "../../store/Auth.Store";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../api/endpoints";
import { executeCompanyTransfer } from "../../api/services/companyTransferService";
import { toastSuccess, toastError, toastApiError } from "../../utils/toastNotify";
import { SkuLink } from "../../hooks/useSkuModalAction";

const { Text } = Typography;

const CompanyTransferModal = ({
  open,
  onClose,
  selectedStones = [],
  onSuccess,
}) => {
  const currentCompanyId = useAuthStore((s) => s.companyId);
  const currentCompanyName = useAuthStore((s) => s.companyName) || `Company #${currentCompanyId}`;

  const { options: branchCompanies, isLoading: isCompaniesLoading } = useBranchCompanies();

  // Detect stone's actual owning company from selectedStones (avoids cross-tenant selection issue)
  const sourceCompanyId = useMemo(() => {
    const firstStone = selectedStones?.[0];
    const cId = firstStone?.company ?? firstStone?.company_id ?? firstStone?.companyId;
    return cId ? Number(cId) : Number(currentCompanyId);
  }, [selectedStones, currentCompanyId]);

  const sourceCompanyName = useMemo(() => {
    const found = (branchCompanies || []).find((c) => Number(c.value) === Number(sourceCompanyId));
    return found?.label || currentCompanyName;
  }, [branchCompanies, sourceCompanyId, currentCompanyName]);

  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available target companies (exclude source company)
  const targetCompanyOptions = useMemo(() => {
    return (branchCompanies || []).filter(
      (c) => Number(c.value) !== Number(sourceCompanyId)
    );
  }, [branchCompanies, sourceCompanyId]);

  // Sync selected stones into local editable items
  useEffect(() => {
    if (open && selectedStones.length > 0) {
      const initialized = selectedStones.map((s, idx) => {
        const availPcs = Number(s.polishPcs ?? s.polish_pcs ?? 1);
        const availCarat = Number(s.polishCarat ?? s.polish_carat ?? 0);
        const price = Number(s.price ?? 0);
        const amount = Math.round(availCarat * price * 100) / 100;

        return {
          key: s.id || `stone-${idx}`,
          product_id: Number(s.id),
          sku: s.sku,
          shape: s.shape || "—",
          color: s.color || s.mainColor || "—",
          clarity: s.clarity || "—",
          lab: s.lab || "—",
          availPcs,
          availCarat,
          pcs: availPcs,
          carat: availCarat,
          price,
          amount,
        };
      });
      setItems(initialized);
      form.setFieldsValue({
        to_company_id: targetCompanyOptions[0]?.value || undefined,
        transfer_date: dayjs(),
        notes: "",
      });
    }
  }, [open, selectedStones, form, targetCompanyOptions]);

  const handleItemChange = (key, field, val) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const updated = { ...item, [field]: val };
        if (field === "carat") {
          const c = Number(val) || 0;
          const p = Number(item.price) || 0;
          updated.amount = Math.round(c * p * 100) / 100;
        } else if (field === "price") {
          const c = Number(item.carat) || 0;
          const p = Number(val) || 0;
          updated.amount = Math.round(c * p * 100) / 100;
        }
        return updated;
      })
    );
  };

  const totals = useMemo(() => {
    return items.reduce(
      (acc, curr) => ({
        pcs: acc.pcs + (Number(curr.pcs) || 0),
        carat: acc.carat + (Number(curr.carat) || 0),
        amount: acc.amount + (Number(curr.amount) || 0),
      }),
      { pcs: 0, carat: 0, amount: 0 }
    );
  }, [items]);

  const handleTransferSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!values.to_company_id) {
        toastError("Please select the target company.");
        return;
      }
      if (items.length === 0) {
        toastError("No stones selected for transfer.");
        return;
      }

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (!item.pcs || item.pcs <= 0) {
          toastError(`Row ${i + 1} (${item.sku}): Pcs must be greater than 0.`);
          return;
        }
        if (!item.carat || item.carat <= 0) {
          toastError(`Row ${i + 1} (${item.sku}): Carat must be greater than 0.`);
          return;
        }
      }

      setIsSubmitting(true);

      const payload = {
        from_company_id: Number(sourceCompanyId),
        to_company_id: Number(values.to_company_id),
        transfer_date: values.transfer_date ? dayjs(values.transfer_date).format("YYYY-MM-DD") : undefined,
        notes: values.notes || "",
        items: items.map((i) => ({
          product_id: i.product_id,
          sku: i.sku,
          pcs: Number(i.pcs),
          carat: Number(i.carat),
          price: Number(i.price),
          amount: Number(i.amount),
        })),
      };

      const res = await executeCompanyTransfer(payload);

      if (res?.status) {
        const targetCompName =
          targetCompanyOptions.find((c) => Number(c.value) === Number(values.to_company_id))?.label ||
          `Company #${values.to_company_id}`;
        toastSuccess(
          `Transferred to ${targetCompName} successfully! Sale Bill: ${res.data?.source_invoice_no || "Generated"}, Purchase Bill: ${res.data?.target_invoice_no || "Generated"}`
        );
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toastError(res?.message || "Failed to transfer stone.");
      }
    } catch (err) {
      if (err?.errorFields) return;
      toastApiError(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      title: "No",
      width: 45,
      align: "center",
      render: (_, __, i) => i + 1,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      width: 130,
      render: (sku, record) => <SkuLink sku={sku} record={record} />,
    },
    {
      title: "Shape",
      dataIndex: "shape",
      width: 80,
    },
    {
      title: "Color / Clar",
      width: 100,
      render: (_, r) => `${r.color} / ${r.clarity}`,
    },
    {
      title: "On-Hand (Pcs/Ct)",
      width: 120,
      render: (_, r) => `${r.availPcs} pcs / ${Number(r.availCarat).toFixed(2)} ct`,
    },
    {
      title: "Transfer Pcs",
      dataIndex: "pcs",
      width: 110,
      render: (val, r) => (
        <InputNumber
          size="small"
          min={1}
          max={r.availPcs}
          value={val}
          onChange={(v) => handleItemChange(r.key, "pcs", v)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Transfer Carat",
      dataIndex: "carat",
      width: 120,
      render: (val, r) => (
        <InputNumber
          size="small"
          min={0.001}
          max={r.availCarat}
          step={0.01}
          value={val}
          onChange={(v) => handleItemChange(r.key, "carat", v)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Rate ($/ct)",
      dataIndex: "price",
      width: 110,
      render: (val, r) => (
        <InputNumber
          size="small"
          min={0}
          value={val}
          onChange={(v) => handleItemChange(r.key, "price", v)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Amount ($)",
      dataIndex: "amount",
      width: 110,
      align: "right",
      render: (v) => <Text strong>${Number(v || 0).toFixed(2)}</Text>,
    },
    {
      title: "Remaining",
      width: 120,
      align: "center",
      render: (_, r) => {
        const remPcs = Math.max(0, r.availPcs - (Number(r.pcs) || 0));
        const remCarat = Math.max(0, r.availCarat - (Number(r.carat) || 0));
        const isFull = remCarat <= 0.0001;
        return (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: isFull ? "#94a3b8" : "#16a34a",
            }}
          >
            {isFull ? "Full Transfer (0 ct)" : `${remPcs} pcs / ${remCarat.toFixed(2)} ct`}
          </span>
        );
      },
    },
  ];

  const modalContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Form form={form} layout="vertical" style={{ marginBottom: 2 }}>
        <Row gutter={10}>
          <Col span={6}>
            <Form.Item label="Source Company" style={{ marginBottom: 0 }}>
              <Input
                value={sourceCompanyName}
                disabled
                size="middle"
                prefix={<Building size={14} style={{ color: "#64748b" }} />}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name="to_company_id"
              label="Destination Company"
              rules={[{ required: true, message: "Required" }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="Select Destination Company"
                loading={isCompaniesLoading}
                options={targetCompanyOptions}
                size="middle"
              />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item
              name="transfer_date"
              label="Transfer Date"
              rules={[{ required: true, message: "Required" }]}
              style={{ marginBottom: 0 }}
            >
              <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" size="middle" />
            </Form.Item>
          </Col>
          <Col span={7}>
            <Form.Item name="notes" label="Notes / Reference" style={{ marginBottom: 0 }}>
              <Input
                placeholder="Optional transfer note / reference"
                prefix={<FileText size={14} style={{ color: "#64748b" }} />}
                size="middle"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <div>
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text strong>Selected Stones ({items.length})</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Adjust pcs or carats if performing a partial transfer
          </Text>
        </div>
        <style>{`
          .company-transfer-table .ant-table-body {
            height: 320px !important;
            max-height: 320px !important;
            overflow-y: auto !important;
          }
        `}</style>
        <Table
          className="company-transfer-table"
          dataSource={items}
          columns={columns}
          pagination={false}
          size="small"
          bordered
          scroll={{ x: "max-content", y: 320 }}
        />
      </div>

      <Card size="small" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Text type="secondary">Total Transfer Summary:</Text>
          </Col>
          <Col style={{ display: "flex", gap: 24 }}>
            <span>
              <Text type="secondary">Stones: </Text>
              <Text strong>{items.length}</Text>
            </span>
            <span>
              <Text type="secondary">Total Pcs: </Text>
              <Text strong>{totals.pcs}</Text>
            </span>
            <span>
              <Text type="secondary">Total Carat: </Text>
              <Text strong>{totals.carat.toFixed(3)} ct</Text>
            </span>
            <span>
              <Text type="secondary">Total Amount: </Text>
              <Text strong style={{ color: "#0284c7", fontSize: 16 }}>
                ${totals.amount.toFixed(2)}
              </Text>
            </span>
          </Col>
        </Row>
      </Card>
    </div>
  );

  return (
    <BaseModal
      title="Inter-Company Stone Transfer"
      subtitle={`Transfer stock from ${sourceCompanyName}`}
      headerIcon={<ArrowLeftRight size={20} style={{ color: "#0284c7" }} />}
      isOpen={open}
      onClose={onClose}
      onSave={handleTransferSubmit}
      saveBtnText="Confirm & Transfer"
      cancelBtnText="Cancel"
      loading={isSubmitting}
      width={1300}
      content={modalContent}
    />
  );
};

export default CompanyTransferModal;
