import React, { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, DatePicker, Row, Col, Button, Typography } from "antd";
import dayjs from "dayjs";
import { toast } from "sonner";
import { getActionTheme, getActionFields } from "./inventoryActionConfig";
import styles from "../../assets/scss/components/inventoryBulkActionModal.module.scss";

const { TextArea } = Input;

const InventoryBulkActionModal = ({
  open,
  actionKey,
  selectedCount = 0,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const theme = getActionTheme(actionKey);
  const fields = getActionFields(actionKey);

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, actionKey, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const normalized = { ...values };
      Object.keys(normalized).forEach((key) => {
        if (dayjs.isDayjs(normalized[key])) {
          normalized[key] = normalized[key].format("YYYY-MM-DD");
        }
      });
      await onSubmit?.(normalized, actionKey);
    } catch (err) {
      if (err?.errorFields && err.errorFields.length > 0) {
        const firstMsg = err.errorFields[0]?.errors?.[0];
        toast.error(firstMsg || "Please fill all required fields.");
      }
    }
  };

  const renderField = (field) => {
    const common = { placeholder: `Enter ${field.label}` };

    switch (field.type) {
      case "textarea":
        return <TextArea rows={field.rows || 3} {...common} />;
      case "number":
        return <InputNumber className="w-100" style={{ width: "100%" }} {...common} />;
      case "select":
        return <Select options={field.options} allowClear placeholder={`Select ${field.label}`} />;
      case "date":
        return <DatePicker className="w-100" style={{ width: "100%" }} format="DD-MM-YYYY" />;
      default:
        return <Input type={field.inputType || "text"} {...common} />;
    }
  };

  const buildFieldRules = (field) => {
    const rules = [...(field.rules || [])];
    if (field.required) {
      rules.unshift({ required: true, message: `${field.label} is required` });
    }
    return rules.length ? rules : undefined;
  };

  if (!actionKey) return null;

  const submitLabel = `Submit ${theme.label}`;

  return (
    <Modal
      className={styles.modal}
      open={open}
      onCancel={onClose}
      width={520}
      centered
      closable={false}
      destroyOnClose
      maskClosable={false}
      styles={{
        header: {
          background: theme.bg,
          borderTop: `3px solid ${theme.accent}`,
        },
      }}
      title={
        <div className={styles.header}>
          <Typography.Title level={4} className={styles.title}>
            {theme.label}
          </Typography.Title>
          <Typography.Text className={styles.subtitle}>
            {selectedCount > 0
              ? `${selectedCount} diamond(s) selected — fill details below`
              : "Fill details below"}
          </Typography.Text>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} danger>
          Cancel
        </Button>,
        <Button
          key="ok"
          type="primary"
          className={styles.btnSave}
          loading={loading}
          onClick={handleOk}
        >
          {submitLabel}
        </Button>,
      ]}
    >
      <div className={styles.body}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Row gutter={[16, 0]}>
            {fields.map((field) => (
              <Col key={field.name} span={field.span || 24}>
                <Form.Item
                  className={styles.formItem}
                  name={field.name}
                  label={field.label}
                  rules={buildFieldRules(field)}
                >
                  {renderField(field)}
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Form>
      </div>
    </Modal>
  );
};

export default InventoryBulkActionModal;
