import { useEffect } from "react";
import { Form } from "antd";
import { toast } from "sonner";
import DynamicFormField from "../../../hooks/DynamicFormField";
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
    form,
    formFields,
    initialValues,
    title,
    width = 400,
    saveBtnText = "Save",
    cancelBtnText = "Close",
    content,
    formKey,
}) => {
    useEffect(() => {
        if (!isOpen) return;

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

    const modalContent =
        content ??
        (Array.isArray(formFields) || formFields ? (
            <Form form={form} layout="vertical" key={resolvedFormKey}>
                <DynamicFormField
                    fields={formFields}
                    forceFullWidth={Array.isArray(formFields) && formFields.length <= 2}
                />
            </Form>
        ) : null);

    return (
        <BaseModal
            title={title}
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleSaveWithToast}
            loading={loading}
            width={width}
            saveBtnText={saveBtnText}
            cancelBtnText={cancelBtnText}
            content={modalContent}
        />
    );
};

export default FormModal;

