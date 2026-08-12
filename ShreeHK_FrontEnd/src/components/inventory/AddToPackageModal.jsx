import React from "react";
import { Modal, Input, Form, Button, Typography } from "antd";
import { toast } from "sonner";
import { usePostApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import { getActionTheme } from "./inventoryActionConfig";
import styles from "../../assets/scss/components/inventoryBulkActionModal.module.scss";

const AddToPackageModal = ({ open, onClose, productIds, onSuccess }) => {
  const [form] = Form.useForm();
  const { mutate, isLoading } = usePostApiRequest(ENDPOINTS.product.packageAssign, "GetProductData");
  const theme = getActionTheme("addPackage");
  const selectedCount = productIds?.length || 0;

  const handleOk = () => {
    form.validateFields().then((values) => {
      mutate(
        { packageName: values.packageName, productIds },
        {
          onSuccess: () => {
            form.resetFields();
            onSuccess?.();
            onClose();
          },
        }
      );
    }).catch((err) => {
      if (err?.errorFields && err.errorFields.length > 0) {
        const firstMsg = err.errorFields[0]?.errors?.[0];
        toast.error(firstMsg || "Please enter package name");
      }
    });
  };

  return (
    <Modal
      className={styles.modal}
      open={open}
      onCancel={onClose}
      width={420}
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
              ? `${selectedCount} stone(s) selected — fill details below`
              : "Fill details below"}
          </Typography.Text>
        </div>
      }
      footer={[
        <Button key="cancel" onClick={onClose} danger>Cancel</Button>,
        <Button
          key="ok"
          type="primary"
          className={styles.okBtn}
          loading={isLoading}
          onClick={handleOk}
          style={{ background: theme.btnBg || theme.accent, borderColor: theme.btnBorder || theme.accent, color: "#fff" }}
        >
          Submit {theme.label}
        </Button>,
      ]}
    >
      <div className={styles.body}>
        <Form form={form} layout="vertical">
          <Form.Item
            className={styles.formItem}
            name="packageName"
            label="Package Name"
            rules={[{ required: true, message: "Enter package name" }]}
          >
            <Input placeholder="PKG-NAME" style={{ textTransform: "uppercase" }} />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default AddToPackageModal;
