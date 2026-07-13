import { Modal, Button } from "antd";
import styles from "../../../assets/scss/modal.module.scss";

const BaseModal = ({
    title,
    isOpen,
    onClose,
    onSave,
    content,
    saveBtnText = "Save",
    cancelBtnText = "Close",
    width = 700,
    loading = false,
    ...props
}) => {
    return (
        <Modal
            title={<span className={styles.modalTitle}>{title}</span>}
            open={isOpen}
            onCancel={onClose}
            width={width}
            centered
            destroyOnClose
            maskClosable={false}
            footer={[
                <Button key="cancel" className={styles.btnCancel} onClick={onClose}>
                    {cancelBtnText}
                </Button>,
                <Button
                    key="save"
                    type="primary"
                    className={styles.btnSave}
                    loading={loading}
                    onClick={onSave}
                >
                    {saveBtnText}
                </Button>,
            ]}
            {...props}
        >
            <div className={styles.modalBody}>{content}</div>
        </Modal>
    );
};

export default BaseModal;
