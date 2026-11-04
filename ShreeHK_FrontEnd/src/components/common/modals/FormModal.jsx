import { useEffect, useState } from "react";
import { Form } from "antd";
import { toast } from "sonner";
import DynamicFormField from "../../../components/common/ui/DynamicFormField";
import EnableEditButton from "../ui/EnableEditButton";
import BaseModal from "./BaseModal";

/**
 * Shared add/edit form modal shell (BaseModal + Ant Form + DynamicFormField).
 * Page owns form instance, fields config, and save handler.
 */
const FormModal = ({
    isOpen,
    onClose,
    onSave,
    loading = false,
    contentLoading = false,
    contentSkeletonFields = 6,
    form,
    formFields,
    initialValues,
    title,
    subtitle,
    headerIcon,
    saveIcon,
    variant,
    width = 400,
    saveBtnText = "Save",
    cancelBtnText = "Close",
    content,
    formKey,
    className,
    rootClassName,
}) => {
    const [isEditEnabled, setIsEditEnabled] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsEditEnabled(false);
            return;
        }
        setIsEditEnabled(false);

        if (initialValues && Object.keys(initialValues).length > 0) {
            form?.setFieldsValue(initialValues);
        } else {
            form?.resetFields();
        }
    }, [isOpen, initialValues, form]);

    const handleSaveWithToast = async () => {
        if (form) {
            try {
                await form.validateFields();
                if (onSave) await onSave();
            } catch (error) {
                if (error?.errorFields && error.errorFields.length > 0) {
                    const firstMsg = error.errorFields[0]?.errors?.[0];
                    toast.error(firstMsg || "Please fill all required fields.");
                } else if (onSave) {
                    try {
                        await onSave();
                    } catch (err) {
                        if (err?.errorFields && err.errorFields.length > 0) {
                            const firstMsg = err.errorFields[0]?.errors?.[0];
                            toast.error(firstMsg || "Please fill all required fields.");
                        }
                    }
                }
            }
        } else {
            if (onSave) await onSave();
        }
    };

    const resolvedFormKey =
        formKey ?? (initialValues?.id != null ? initialValues.id : initialValues ? "edit" : "add");

    const isEdit = variant === "edit";

    const modalContent =
        content ??
        (Array.isArray(formFields) || formFields ? (
            <Form form={form} layout="vertical" disabled={isEdit && !isEditEnabled} key={resolvedFormKey}>
                <DynamicFormField
                    fields={Array.isArray(formFields) ? formFields.map((f) => ({
                        ...f,
                        disabled: isEdit ? (Boolean(f.disabled) || !isEditEnabled) : Boolean(f.disabled),
                    })) : formFields}
                    forceFullWidth={Array.isArray(formFields) && formFields.length <= 2}
                />
            </Form>
        ) : null);

    return (
        <BaseModal
            title={title}
            subtitle={subtitle}
            headerIcon={headerIcon}
            saveIcon={saveIcon}
            variant={variant}
            isOpen={isOpen}
            onClose={() => {
                setIsEditEnabled(false);
                onClose?.();
            }}
            onSave={handleSaveWithToast}
            loading={loading}
            contentLoading={contentLoading}
            contentSkeletonFields={contentSkeletonFields}
            width={width}
            saveBtnText={saveBtnText}
            cancelBtnText={cancelBtnText}
            extraHeaderRight={isEdit ? (
                <EnableEditButton
                    isEnabled={isEditEnabled}
                    onToggle={() => setIsEditEnabled((prev) => !prev)}
                />
            ) : null}
            content={modalContent}
            className={className}
            rootClassName={rootClassName}
        />
    );
};

export default FormModal;
