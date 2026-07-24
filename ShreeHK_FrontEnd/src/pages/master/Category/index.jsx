import React, { useEffect, useMemo, useState } from "react";
import { Form } from "antd";
import { toast } from "sonner";
import { ConfirmDeleteModal } from "../../../components/common/modals";
import { MasterListTable } from "../../../components/common/table";
import MasterFormAddModal from "../../../components/common/masterCommon/MasterFormAddModal";
import MasterFormEditModal from "../../../components/common/masterCommon/MasterFormEditModal";
import { getCategoryColumns, mapApiToForm, mapFormToApi } from "../../../components/pages/Category";
import { fetchCategories, saveCategory, deleteCategory } from "../../../api/services/categoryService";
import { QUERY_KEYS } from "../../../api/endpoints";
import useEntityList from "../../../hooks/api/useEntityList";
import { useEntityPostMutation, useEntityDeleteMutation } from "../../../hooks/api/useEntityMutation";
import useModal from "../../../hooks/common/useModal";

const PAGE_LIMIT = 100;

const CategoryPage = () => {
    const [form] = Form.useForm();
    const [dataSource, setDataSource] = useState([]);
    const [editRecord, setEditRecord] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingRecordName, setEditingRecordName] = useState("");

    const addModal = useModal();
    const editModal = useModal();
    const deleteModal = useModal();
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, isLoading } = useEntityList(QUERY_KEYS.categories, fetchCategories, { limit: PAGE_LIMIT });

    const { mutate: saveCategoryMutation } = useEntityPostMutation(saveCategory, QUERY_KEYS.categories);
    const { mutate: deleteCategoryMutation, isPending: isDeleting } = useEntityDeleteMutation(
        deleteCategory,
        QUERY_KEYS.categories
    );

    const columns = getCategoryColumns();

    const categoryFormFields = useMemo(() => {
        const editingId = editRecord?.id;
        const parentOptions = [
            { label: "None", value: 0 },
            ...dataSource
                .filter((row) => row.id !== editingId)
                .map((row) => ({ label: row.name, value: row.id })),
        ];
        return [
            { type: "input", label: "Name", name: "name", required: true, span: 24 },
            { type: "select", label: "Parent", name: "parent", required: false, span: 24, options: parentOptions },
        ];
    }, [dataSource, editRecord?.id]);

    const openDelete = (record) => {
        setDeleteTarget(record);
        deleteModal.openModal();
    };

    const closeDelete = () => {
        deleteModal.closeModal();
        setDeleteTarget(null);
    };

    const handleDelete = () => {
        deleteCategoryMutation(deleteTarget?.id, { onSuccess: () => closeDelete() });
    };

    const handleAddClick = () => {
        setEditRecord(null);
        addModal.openModal();
    };

    const handleEditClick = (record) => {
        setEditRecord(mapApiToForm(record));
        setEditingRecordName(record?.name || "");
        editModal.openModal();
    };

    const handleSave = async (mode) => {
        try {
            const values = await form.validateFields();
            setModalLoading(true);
            const payload = { id: editRecord?.id || 0, ...mapFormToApi(values) };
            saveCategoryMutation(payload, {
                onSuccess: () => {
                    setEditRecord(null);
                    if (mode === "add") addModal.closeModal();
                    else editModal.closeModal();
                },
                onSettled: () => setModalLoading(false),
            });
        } catch (error) {
            console.error("Save Failed:", error);
            setModalLoading(false);
        }
    };

    useEffect(() => {
        if (data?.Data) {
            setDataSource(data.Data);
        }
    }, [data]);

    return (
        <>
            <MasterListTable
                title="Category Management"
                columns={columns}
                dataSource={dataSource}
                loading={isLoading}
                onAdd={handleAddClick}
                onEdit={handleEditClick}
                onDelete={openDelete}
            />

            <MasterFormAddModal
                isOpen={addModal.open}
                onClose={addModal.closeModal}
                onSave={() => handleSave("add")}
                loading={modalLoading}
                form={form}
                formFields={categoryFormFields}
                title="Add Category Management Details"
                width={450}
            />

            <MasterFormEditModal
                isOpen={editModal.open}
                onClose={editModal.closeModal}
                onSave={() => handleSave("edit")}
                loading={modalLoading}
                form={form}
                formFields={categoryFormFields}
                initialValues={editRecord}
                title={`Edit Category Management: ${editingRecordName}`}
                width={450}
            />

            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Delete Category"
                entityName={deleteTarget?.name}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />
        </>
    );
};

export default CategoryPage;
