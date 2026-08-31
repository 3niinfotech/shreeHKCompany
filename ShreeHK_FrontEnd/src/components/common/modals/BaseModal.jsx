import { Modal, Button } from "antd";
import { SkeletonForm } from "../skeleton";
import styles from "../../../assets/scss/modal.module.scss";

const BaseModal = ({
    title,
    subtitle,
    headerIcon,
    isOpen,
    onClose,
    onSave,
    content,
    contentLoading = false,
    contentSkeletonFields = 6,
    saveBtnText = "Save",
    cancelBtnText = "Close",
    saveIcon,
    width = 700,
    loading = false,
    variant,
    className,
    rootClassName,
    ...props
}) => {
    const isEdit = variant === "edit";
    const rootCls = [isEdit ? "master-edit-modal-root" : null, rootClassName]
        .filter(Boolean)
        .join(" ");
    const modalCls = [isEdit ? "master-edit-modal" : null, className]
        .filter(Boolean)
        .join(" ");

    const titleNode = isEdit ? (
        <span className="master-edit-modal__title-row">
            {headerIcon ? (
                <span className="master-edit-modal__icon" aria-hidden>
                    {headerIcon}
                </span>
            ) : null}
            <span className="master-edit-modal__title-text">
                <span className="master-edit-modal__title">{title}</span>
                {subtitle ? (
                    <span className="master-edit-modal__subtitle">{subtitle}</span>
                ) : null}
            </span>
        </span>
    ) : (
        <span className={styles.modalTitle}>{title}</span>
    );

    return (
        <Modal
            title={titleNode}
            open={isOpen}
            onCancel={onClose}
            width={width}
            centered
            destroyOnClose
            maskClosable={false}
            className={modalCls || undefined}
            rootClassName={rootCls || undefined}
            footer={[
                <Button
                    key="cancel"
                    danger={!isEdit}
                    className={isEdit ? "master-edit-modal__btn-close" : styles.btnCancel}
                    onClick={onClose}
                    style={
                        isEdit
                            ? undefined
                            : {
                                  backgroundColor: "var(--color-danger, #e53e3e)",
                                  borderColor: "var(--color-danger, #e53e3e)",
                                  color: "#fff",
                              }
                    }
                >
                    {cancelBtnText}
                </Button>,
                <Button
                    key="save"
                    type="primary"
                    className={isEdit ? "master-edit-modal__btn-save" : styles.btnSave}
                    loading={loading}
                    icon={isEdit ? saveIcon : undefined}
                    onClick={onSave}
                    style={
                        isEdit
                            ? undefined
                            : {
                                  backgroundColor: "var(--color-success, #38a169)",
                                  borderColor: "var(--color-success, #38a169)",
                                  color: "#fff",
                              }
                    }
                >
                    {saveBtnText}
                </Button>,
            ]}
            {...props}
        >
            <div className={isEdit ? "master-edit-modal__body" : styles.modalBody}>
                {contentLoading ? <SkeletonForm fields={contentSkeletonFields} /> : content}
            </div>
        </Modal>
    );
};

export default BaseModal;
