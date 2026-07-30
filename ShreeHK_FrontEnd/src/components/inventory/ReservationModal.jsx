import React, { useState } from "react";
import { Modal, Form, Input, DatePicker, Alert, Space, Button } from "antd";
import dayjs from "dayjs";
import { postProductHold } from "../../api/services/holdService";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import { toast } from "sonner";

/**
 * Reservation / quotation — hold stone for a party with optional expiry (extends hold).
 */
const ReservationModal = ({ open, selectedIds = [], partyHint = "", onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values) => {
    if (!selectedIds.length) return;
    const remarks = [
      values.party ? `Party: ${values.party}` : null,
      values.quoteRef ? `Quote: ${values.quoteRef}` : null,
      values.remarks || null,
    ]
      .filter(Boolean)
      .join(" | ");

    setLoading(true);
    try {
      const payload = {
        ids: selectedIds.map((id) => Number(id)),
        status: 1,
        description: remarks,
      };
      if (values.holdUntil) {
        payload.date = dayjs.isDayjs(values.holdUntil)
          ? values.holdUntil.format("YYYY-MM-DD")
          : values.holdUntil;
      }
      const result = await postProductHold(payload);
      if (result?.status) {
        toastApiSuccess(result);
        form.resetFields();
        onSuccess?.();
        onClose?.();
      } else {
        toastApiError({ response: { data: result } });
      }
    } catch (err) {
      if (err?.errorFields && err.errorFields.length > 0) {
        const firstMsg = err.errorFields[0]?.errors?.[0];
        toast.error(firstMsg || "Please fill all required fields.");
      } else {
        toastApiError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Reservation / Quotation Hold"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} danger>Cancel</Button>,
        <Button key="save" type="primary" loading={loading} onClick={() => form.submit()} style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)", color: "#fff" }}>
          Reserve Stones
        </Button>,
      ]}
      centered
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        message={`${selectedIds.length} stone(s) selected`}
        description="Creates a hold with party and quote reference for reservation tracking."
        style={{ marginBottom: 16 }}
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          party: partyHint,
          holdUntil: dayjs().add(7, "day"),
        }}
      >
        <Form.Item name="party" label="Party / Customer" rules={[{ required: true }]}>
          <Input placeholder="Party name" />
        </Form.Item>
        <Form.Item name="quoteRef" label="Quote reference">
          <Input placeholder="QT-2024-001" />
        </Form.Item>
        <Form.Item name="holdUntil" label="Hold until">
          <DatePicker style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="remarks" label="Notes">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReservationModal;
