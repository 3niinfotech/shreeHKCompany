import { Modal, Button, Typography } from "antd";
import { cssVar } from "../../../theme";

const { Text } = Typography;

/**
 * Inward validation warning modal (Close + Save footer, fixed button styles).
 */
const WarningActionModal = ({ isVisible, onClose, onSave, saveLoading = false, children }) => {
    return (
        <Modal
            title="Warning"
            open={isVisible}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose} style={{ backgroundColor: cssVar("color-btn-cancel-bg"), color: cssVar("color-text-inverse") }}>
                    Close
                </Button>,
                <Button
                    key="save"
                    type="primary"
                    onClick={onSave}
                    loading={saveLoading}
                    style={{ backgroundColor: cssVar("color-btn-save-bg"), borderColor: cssVar("color-btn-save-bg") }}
                >
                    Save
                </Button>,
            ]}
            width={600}
        >
            {children ?? (
                <div style={{ marginBottom: "20px" }}>
                    <Text type="success" strong style={{ fontSize: "18px", color: cssVar("color-success") }}>
                        Data does not exist!
                    </Text>
                </div>
            )}
        </Modal>
    );
};

export default WarningActionModal;
