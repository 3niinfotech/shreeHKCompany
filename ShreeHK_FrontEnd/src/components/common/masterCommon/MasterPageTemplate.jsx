import React, { useEffect, useState } from 'react';
import DynamicFormField from "../../../hooks/DynamicFormField";
import { Form } from 'antd';
import { BaseModal } from "../modals";
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
}) => {
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', mode: 'add' });

    const handleAddClick = () => {
        if (onEdit) onEdit(null);
        setModalConfig({ title: `Add ${title} Details`, mode: 'add' });
        setIsModalOpen(true);
    };

    const handleEditClick = (record) => {
        setModalConfig({
            title: `Edit ${title}: ${record.name || ''}`,
            mode: 'edit'
        });

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
            />

            <BaseModal
                title={modalConfig.title}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleInternalSave}
                loading={modalLoading}
                width={modalWidth}
                saveBtnText={modalConfig.mode === 'add' ? "Save" : "Update"}
                cancelBtnText="Close"
                content={
                    <Form
                        form={form}
                        layout="vertical"
                        key={initialValues ? initialValues.id : 'add'}
                    >
                        {Array.isArray(formFields) ? (
                            <DynamicFormField
                                fields={formFields}
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
