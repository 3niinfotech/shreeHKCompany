import { Modal, Button, Typography } from "antd";
import { AlertCircle, Trash2 } from "lucide-react";
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
            title={
                <span className="master-delete-modal__title-row">
                    <span className="master-delete-modal__icon" aria-hidden>
                        <Trash2 size={16} strokeWidth={2} />
                    </span>
                    <span className="master-delete-modal__title">{title}</span>
                </span>
            }
            onCancel={onCancel}
            keyboard={false}
            centered
            width={400}
            className="master-delete-modal"
            rootClassName="master-delete-modal-root"
            footer={[
                <Button key="close" className="master-delete-modal__btn-close" onClick={onCancel}>
                    Close
                </Button>,
                <Button
                    key="delete"
                    type="primary"
                    danger
                    className="master-delete-modal__btn-delete"
                    loading={loading}
                    icon={<Trash2 size={14} strokeWidth={2.25} />}
                    onClick={onConfirm}
                >
                    Delete
                </Button>,
            ]}
        >
            <div className="conformation_modal">
                <span className="master-delete-modal__icon" aria-hidden>
                    <AlertCircle size={16} strokeWidth={2} />
                </span>
                <Text>
                    Are you sure you want to delete{" "}
                    <span className="massage">"{entityName}"</span>?
                </Text>
            </div>
        </Modal>
    );
};
export default DeleteConfirmModal;
