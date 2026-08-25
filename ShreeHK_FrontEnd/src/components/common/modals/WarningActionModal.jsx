import React from "react";
import { Modal, Button, Popconfirm } from "antd";
import { AlertTriangle, Save, ShieldCheck, X } from "lucide-react";

/**
 * Inward validation warning modal styled as per design specification.
 */
const WarningActionModal = ({
    isVisible,
    onClose,
    onSave,
    saveLoading = false,
    hasDuplicates = false,
    children,
}) => {
    return (
        <Modal
            open={isVisible}
            onCancel={onClose}
            closeIcon={<X size={18} style={{ color: "#94A3B8" }} />}
            width={640}
            centered
            footer={null}
            styles={{
                content: {
                    borderRadius: "16px",
                    padding: "24px",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                },
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                <div
                    style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        backgroundColor: "#FFF5EA",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <AlertTriangle size={24} style={{ color: "#F59E0B" }} />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#1E293B" }}>
                        Warning
                    </h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "#64748B", marginTop: "2px" }}>
                        Please review the information below
                    </p>
                </div>
            </div>

            {/* Body Content */}
            <div>{children}</div>

            {/* Footer */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "24px",
                    paddingTop: "16px",
                    borderTop: "1px solid #F1F5F9",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8", fontSize: "13px" }}>
                    <ShieldCheck size={18} style={{ color: "#94A3B8" }} />
                    <span>
                        {hasDuplicates ? "Duplicate products found in system" : "No duplicate products found in system"}
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Button
                        onClick={onClose}
                        style={{
                            height: "40px",
                            padding: "0 20px",
                            borderRadius: "8px",
                            borderColor: "#E2E8F0",
                            color: "#475569",
                            fontWeight: 600,
                            fontSize: "14px",
                        }}
                    >
                        Close
                    </Button>
                    {hasDuplicates ? (
                        <Popconfirm
                            title="Some products already exist"
                            description="Some SKUs already exist in stock. Duplicate SKUs will get a suffix. Are you sure you want to save?"
                            onConfirm={onSave}
                            okText="Yes, Save"
                            cancelText="Cancel"
                            okButtonProps={{
                                style: {
                                    backgroundColor: "#5B4DFB",
                                    borderColor: "#5B4DFB",
                                },
                            }}
                            placement="topRight"
                        >
                            <Button
                                type="primary"
                                loading={saveLoading}
                                icon={<Save size={16} />}
                                style={{
                                    height: "40px",
                                    padding: "0 22px",
                                    borderRadius: "8px",
                                    backgroundColor: "#5B4DFB",
                                    borderColor: "#5B4DFB",
                                    fontWeight: 600,
                                    fontSize: "14px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                Save
                            </Button>
                        </Popconfirm>
                    ) : (
                        <Button
                            type="primary"
                            onClick={onSave}
                            loading={saveLoading}
                            icon={<Save size={16} />}
                            style={{
                                height: "40px",
                                padding: "0 22px",
                                borderRadius: "8px",
                                backgroundColor: "#5B4DFB",
                                borderColor: "#5B4DFB",
                                fontWeight: 600,
                                fontSize: "14px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                            }}
                        >
                            Save
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default WarningActionModal;
