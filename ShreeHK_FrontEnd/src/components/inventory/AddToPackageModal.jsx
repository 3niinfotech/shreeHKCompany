import React, { useState } from "react";
import { Modal, Input, Form } from "antd";
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
    });
  };

  return (
    <Modal title="Add To Package" open={open} onCancel={onClose} onOk={handleOk} confirmLoading={isLoading} destroyOnClose>
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
