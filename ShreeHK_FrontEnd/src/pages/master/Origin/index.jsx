import React, { useEffect, useState } from "react";
import { Form } from "antd";
import { toast } from "sonner";
import { originFields } from "../Data";
import { ConfirmDeleteModal } from "../../../components/common/modals";
import { MasterListTable } from "../../../components/common/table";
import MasterFormAddModal from "../../../components/common/masterCommon/MasterFormAddModal";
import MasterFormEditModal from "../../../components/common/masterCommon/MasterFormEditModal";
import { getOriginColumns, mapApiToForm, mapFormToApi } from "../../../components/pages/Origin";
import { fetchOrigins, saveOrigin, deleteOrigin } from "../../../api/services/originService";
import { QUERY_KEYS } from "../../../api/endpoints";
import useEntityList from "../../../hooks/api/useEntityList";
import { useEntityPostMutation, useEntityDeleteMutation } from "../../../hooks/api/useEntityMutation";
import useModal from "../../../hooks/common/useModal";

const PAGE_LIMIT = 100;

const OriginPage = () => {
    const [form] = Form.useForm();
    const [dataSource, setDataSource] = useState([]);
    const [editRecord, setEditRecord] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingRecordName, setEditingRecordName] = useState("");

    const addModal = useModal();
    const editModal = useModal();
    const deleteModal = useModal();
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, isLoading } = useEntityList(QUERY_KEYS.origins, fetchOrigins, { limit: PAGE_LIMIT });

    const { mutate: saveOriginMutation } = useEntityPostMutation(saveOrigin, QUERY_KEYS.origins);
    const { mutate: deleteOriginMutation, isPending: isDeleting } = useEntityDeleteMutation(
        deleteOrigin,
        QUERY_KEYS.origins
    );

    const columns = getOriginColumns();

    const openDelete = (record) => {
        setDeleteTarget(record);
        deleteModal.openModal();
    };

    const closeDelete = () => {
        deleteModal.closeModal();
        setDeleteTarget(null);
    };

    const handleDelete = () => {
        deleteOriginMutation(deleteTarget?.id, { onSuccess: () => closeDelete() });
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
            saveOriginMutation(payload, {
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
                title="Origin Management"
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
                formFields={originFields}
                title="Add Origin Management Details"
                width={400}
            />

            <MasterFormEditModal
                isOpen={editModal.open}
                onClose={editModal.closeModal}
                onSave={() => handleSave("edit")}
                loading={modalLoading}
                form={form}
                formFields={originFields}
                initialValues={editRecord}
                title={`Edit Origin Management: ${editingRecordName}`}
                width={400}
            />

            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Delete Origin"
                entityName={deleteTarget?.name}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />
        </>
    );
};

export default OriginPage;
