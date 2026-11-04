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
    saveDisabled = false,
    width = 700,
    loading = false,
    variant,
    className,
    rootClassName,
    footer,
    extraHeaderRight,
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
        <span className="master-edit-modal__title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
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
            {extraHeaderRight ? (
                <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    {extraHeaderRight}
                </span>
            ) : null}
        </span>
    ) : (
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span className={styles.modalTitle}>{title}</span>
            {extraHeaderRight ? (
                <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    {extraHeaderRight}
                </span>
            ) : null}
        </span>
    );

    return (
        <Modal
            title={titleNode}
            open={isOpen}
            onCancel={onClose}
            width={width}
            centered
            destroyOnHidden
            closable={false}
            maskClosable={false}
            mask={{ closable: false }}
            className={modalCls || undefined}
            rootClassName={rootCls || undefined}
            footer={
                footer !== undefined
                    ? footer
                    : [
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
                              disabled={saveDisabled}
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
                      ]
            }
            {...props}
        >
            <div className={isEdit ? "master-edit-modal__body" : styles.modalBody}>
                {contentLoading ? <SkeletonForm fields={contentSkeletonFields} /> : content}
            </div>
        </Modal>
    );
};

export default BaseModal;
