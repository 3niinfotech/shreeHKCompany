import React from "react";
import { Modal, Input, Form, Button, Space } from "antd";
import { toast } from "sonner";
import { usePostApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";

const AddToPackageModal = ({ open, onClose, productIds, onSuccess }) => {
  const [form] = Form.useForm();
  const { mutate, isLoading } = usePostApiRequest(ENDPOINTS.product.packageAssign, "GetProductData");

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
      title="Add To Package"
      open={open}
      onCancel={onClose}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose} danger>Cancel</Button>,
        <Button key="ok" type="primary" loading={isLoading} onClick={handleOk} style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)" }}>OK</Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="packageName" label="Package Name" rules={[{ required: true, message: "Enter package name" }]}>
          <Input placeholder="PKG-NAME" style={{ textTransform: "uppercase" }} />
        </Form.Item>
        <p>{productIds?.length || 0} stone(s) selected</p>
      </Form>
    </Modal>
  );
};

export default AddToPackageModal;
