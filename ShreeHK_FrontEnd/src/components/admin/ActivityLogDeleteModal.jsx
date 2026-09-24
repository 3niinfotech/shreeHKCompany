import React, { useState, useEffect } from "react";
import { Modal, Button, Typography, Input, Checkbox, Alert, Form, Space } from "antd";
import {
  LockOutlined,
  WarningOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

const { Text, Title, Paragraph } = Typography;

const ActivityLogDeleteModal = ({
  open,
  title = "Delete Activity History",
  entityName,
  loading = false,
  width = 560,
  onCancel,
  onConfirm,
}) => {
  const [form] = Form.useForm();
  const [agreed, setAgreed] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      setAgreed(false);
      setPassword("");
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!agreed) return;
      onConfirm(values.password);
    } catch {
      // validation error
    }
  };

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#fff1f0",
              border: "1px solid #ffa39e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#cf1322",
              fontSize: 16,
            }}
          >
            <SafetyCertificateOutlined />
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#1f1f1f" }}>
            {title}
          </span>
        </div>
      }
      onCancel={() => !loading && onCancel()}
      centered
      width={width}
      maskClosable={false}
      footer={[
        <Button key="cancel" disabled={loading} onClick={onCancel}>
          Cancel
        </Button>,
        <Button
          key="delete"
          type="primary"
          danger
          loading={loading}
          disabled={!agreed || !password.trim()}
          icon={<DeleteOutlined />}
          onClick={handleSubmit}
        >
          Confirm & Delete Logs
        </Button>,
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 6 }}>
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined style={{ fontSize: 18 }} />}
          message="High-Sensitivity Security Action"
          description={
            <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
              Activity History contains sensitive, legal, and operational audit trails of user actions.
              Once deleted, these records cannot be recovered.
            </div>
          }
        />

        {entityName ? (
          <div
            style={{
              background: "#fafafa",
              border: "1px solid #f0f0f0",
              borderRadius: 6,
              padding: "10px 14px",
            }}
          >
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>
              Target scope for deletion:
            </Text>
            <Text strong style={{ fontSize: 14, color: "#262626" }}>
              {entityName}
            </Text>
          </div>
        ) : null}

        {/* Double confirmation step 1: Checkbox */}
        <div
          style={{
            background: "#fffbe6",
            border: "1px solid #ffe58f",
            borderRadius: 6,
            padding: "10px 12px",
          }}
        >
          <style>{`
            .confirm-delete-checkbox .ant-checkbox-inner {
              width: 22px !important;
              height: 18px !important;
              border-radius: 4px;
            }
            .confirm-delete-checkbox .ant-checkbox {
              width: 22px !important;
              height: 18px !important;
              top: 0;
            }
            .confirm-delete-checkbox .ant-checkbox-inner::after {
              top: 45% !important;
              left: 28% !important;
            }
          `}</style>
          <Checkbox
            className="confirm-delete-checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, color: "#ad6800" }}>
              I understand that this action is permanent and will permanently erase audit history records.
            </span>
          </Checkbox>
        </div>

        {/* Double confirmation step 2: Admin Password */}
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 4 }}>
          <Form.Item
            name="password"
            label={
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <LockOutlined style={{ marginRight: 6, color: "#1890ff" }} />
                Admin Password Verification
              </span>
            }
            rules={[
              { required: true, message: "Please enter your password to authorize this deletion" },
            ]}
            style={{ marginBottom: 4 }}
          >
            <Input.Password
              placeholder="Enter your login password to confirm"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              size="large"
            />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Your password is required to verify administrator authorization before deleting audit trails.
          </Text>
        </Form>
      </div>
    </Modal>
  );
};

export default ActivityLogDeleteModal;
