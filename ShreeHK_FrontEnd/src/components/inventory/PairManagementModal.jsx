import React, { useState } from "react";
import { Modal, Form, Input, Alert, Table, Button, Space } from "antd";
import { toastWarning } from "../../utils/toastNotify";
import { api } from "../../api/axiosInstance";
import { ENDPOINTS } from "../../constants/endpoints";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import { SkuLink } from "../../hooks/useSkuModalAction";

/**
 * Create or remove stone pairs from inventory (mirrors bulk sku-pair import).
 */
const PairManagementModal = ({ open, selectedRows = [], onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handlePair = async (values) => {
    if (selectedRows.length !== 2) {
      toastWarning("Select exactly two stones to pair");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.product.pairAssign, {
        id1: selectedRows[0].id,
        id2: selectedRows[1].id,
        pairName: values.pairName?.trim() || "pair",
      });
      if (res.data?.status === false) {
        toastApiError({ response: { data: res.data } });
        return;
      }
      toastApiSuccess(res.data);
      form.resetFields();
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpair = async () => {
    if (!selectedRows.length) {
      toastWarning("Select stones to unpair");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.product.pairUnpair, {
        ids: selectedRows.map((r) => r.id),
      });
      if (res.data?.status === false) {
        toastApiError({ response: { data: res.data } });
        return;
      }
      toastApiSuccess(res.data);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toastApiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Pair Management"
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        message={`${selectedRows.length} stone(s) selected`}
        description="Select exactly 2 singles to create a pair, or select paired stones to remove pairing."
        style={{ marginBottom: 16 }}
      />
      {selectedRows.length === 2 ? (
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={selectedRows}
          columns={[
            { title: "SKU", dataIndex: "sku", key: "sku", render: (text, record) => <SkuLink sku={text} record={record} /> },
            { title: "Carat", dataIndex: "polishCarat", key: "carat", render: (v, r) => v ?? r.polish_carat ?? r.carat },
            { title: "Shape", dataIndex: "shape", key: "shape" },
          ]}
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Form form={form} layout="vertical" onFinish={handlePair}>
        <Form.Item name="pairName" label="Pair label (optional)" initialValue="pair">
          <Input placeholder="pair" />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading} disabled={selectedRows.length !== 2} style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)", color: "white" }}>
            Create Pair
          </Button>
          <Button danger loading={loading} disabled={!selectedRows.length} onClick={handleUnpair}>
            Unpair Selected
          </Button>
          <Button onClick={onClose} danger>Close</Button>
        </Space>
      </Form>
    </Modal>
  );
};

export default PairManagementModal;
