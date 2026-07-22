import { Modal, Button, Typography } from "antd";
import "../../../assets/scss/masterDelete.scss";

const { Text } = Typography;

const DeleteConfirmModal = ({
    open,
    title = "Delete",
    entityName,
    loading = false,
    onCancel,
    onConfirm,
}) => {
    return (
        <Modal
            open={open}
            title={title}
            onCancel={onCancel}
            keyboard={false}
            centered
            footer={[
                <Button key="close" onClick={onCancel}>
                    Close
                </Button>,
                <Button
                    key="delete"
                    type="primary"
                    danger
                    loading={loading}
                    onClick={onConfirm}
                >
                    Delete
                </Button>,
            ]}
        >
            <div className="conformation_modal">
                <Text>
                    Are you sure you want to delete{" "}
                    <span className="massage">"{entityName}"</span>
                </Text>
            </div>
        </Modal>
    );
};
export default DeleteConfirmModal;
