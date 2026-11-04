import React, { useEffect, useState } from 'react';
import DynamicFormField from "../../../components/common/ui/DynamicFormField";
import { Form } from 'antd';
import { BaseModal } from "../modals";
import EnableEditButton from "../ui/EnableEditButton";
import { MasterListTable } from '../table';

const MasterTemplate = ({
    title,
    columns,
    dataSource,
    formFields,
    onSave,
    rowKey = "id",
    modalWidth = 800,
    onDelete,
    searchPlaceholder = "Search diamonds...",
    initialValues,
    onEdit,
    rowSelection,
    extraHeaderActions,
    loading = false,
    onTableScroll,
    totalItems,
    searchValue,
    onSearchChange,
    hideCrudActions = false,
    onRow,
    rowClassName,
}) => {
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', mode: 'add' });
    const [isEditEnabled, setIsEditEnabled] = useState(false);

    const handleAddClick = () => {
        if (onEdit) onEdit(null);
        setModalConfig({ title: `Add ${title} Details`, mode: 'add' });
        setIsEditEnabled(false);
        setIsModalOpen(true);
    };

    const handleEditClick = (record) => {
        setModalConfig({
            title: `Edit ${title}: ${record.name || ''}`,
            mode: 'edit'
        });
        setIsEditEnabled(false);

        onEdit?.(record);

        setTimeout(() => {
            setIsModalOpen(true);
        }, 0);
    };

    const handleInternalSave = async () => {
        try {
            const values = await form.validateFields();
            setModalLoading(true);
            await onSave(values, modalConfig.mode);
            setModalLoading(false);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Save Failed:", error);
            setModalLoading(false);
        }
    };

    useEffect(() => {
        if (!isModalOpen) return;

        if (initialValues && Object.keys(initialValues).length > 0) {
            form.setFieldsValue(initialValues);
        } else {
            form.resetFields();
        }
    }, [isModalOpen, initialValues, form]);

    return (
        <>
            <MasterListTable
                title={title}
                columns={columns}
                dataSource={dataSource}
                rowKey={rowKey}
                rowSelection={rowSelection}
                extraHeaderActions={extraHeaderActions}
                searchPlaceholder={searchPlaceholder}
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                onAdd={handleAddClick}
                onEdit={handleEditClick}
                onDelete={onDelete}
                onTableScroll={onTableScroll}
                totalItems={totalItems}
                loading={loading}
                hideCrudActions={hideCrudActions}
                onRow={onRow}
                rowClassName={rowClassName}
            />

            <BaseModal
                title={modalConfig.title}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setIsEditEnabled(false);
                }}
                onSave={handleInternalSave}
                loading={modalLoading}
                width={modalWidth}
                saveBtnText={modalConfig.mode === 'add' ? "Save" : "Update"}
                cancelBtnText="Close"
                extraHeaderRight={modalConfig.mode === 'edit' ? (
                    <EnableEditButton
                        isEnabled={isEditEnabled}
                        onToggle={() => setIsEditEnabled((prev) => !prev)}
                    />
                ) : null}
                content={
                    <Form
                        form={form}
                        layout="vertical"
                        disabled={modalConfig.mode === 'edit' && !isEditEnabled}
                        key={initialValues ? initialValues.id : 'add'}
                    >
                        {Array.isArray(formFields) ? (
                            <DynamicFormField
                                fields={formFields.map((f) => ({
                                    ...f,
                                    disabled: modalConfig.mode === 'edit' ? (Boolean(f.disabled) || !isEditEnabled) : Boolean(f.disabled),
                                }))}
                                forceFullWidth={formFields.length <= 2}
                            />
                        ) : (
                            formFields
                        )}
                    </Form>
                }
            />
        </>
    );
};

export default MasterTemplate;
