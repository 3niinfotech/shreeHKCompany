import React, { useState } from "react";
import { Modal, Form, Input, DatePicker, Button, Typography, Row, Col } from "antd";
import dayjs from "dayjs";
import { postProductHold } from "../../api/services/holdService";
import { toastApiSuccess, toastApiError } from "../../utils/apiToast";
import { toast } from "sonner";
import { getActionTheme } from "./inventoryActionConfig";
import styles from "../../assets/scss/components/inventoryBulkActionModal.module.scss";

/**
 * Reservation / quotation — hold stone for a party with optional expiry (extends hold).
 */
const ReservationModal = ({ open, selectedIds = [], partyHint = "", onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const theme = getActionTheme("reservation");
  const selectedCount = selectedIds.length;

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
      className={styles.modal}
      open={open}
      onCancel={onClose}
      centered
      closable={false}
      destroyOnClose
      maskClosable={false}
      width={520}
      styles={{
        header: {
          background: theme.bg,
          borderTop: `3px solid ${theme.accent}`,
        },
      }}
      title={
        <div className={styles.header}>
          <Typography.Title level={4} className={styles.title}>
            Reservation / Quotation Hold
          </Typography.Title>
          <Typography.Text className={styles.subtitle}>
            {selectedCount > 0
              ? `${selectedCount} stone(s) selected — creates a hold with party and quote reference`
              : "Fill details below"}
          </Typography.Text>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} danger>Cancel</Button>,
        <Button
          key="save"
          type="primary"
          className={styles.okBtn}
          loading={loading}
          onClick={() => form.submit()}
          style={{ background: theme.btnBg || theme.accent, borderColor: theme.btnBorder || theme.accent, color: "#fff" }}
        >
          Submit {theme.label}
        </Button>,
      ]}
    >
      <div className={styles.body}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            party: partyHint,
            holdUntil: dayjs().add(7, "day"),
          }}
        >
          <Row gutter={[16, 0]}>
            <Col span={12}>
              <Form.Item className={styles.formItem} name="party" label="Party / Customer" rules={[{ required: true }]}>
                <Input placeholder="Party name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item className={styles.formItem} name="quoteRef" label="Quote reference">
                <Input placeholder="QT-2024-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item className={styles.formItem} name="holdUntil" label="Hold until">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item className={styles.formItem} name="remarks" label="Notes">
                <Input.TextArea rows={1} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>
    </Modal>
  );
};

export default ReservationModal;
