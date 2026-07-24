import React, { useEffect, useState } from "react";
import { Form } from "antd";
import { toast } from "sonner";
import { labFields } from "../Data";
import { ConfirmDeleteModal } from "../../../components/common/modals";
import { MasterListTable } from "../../../components/common/table";
import MasterFormAddModal from "../../../components/common/masterCommon/MasterFormAddModal";
import MasterFormEditModal from "../../../components/common/masterCommon/MasterFormEditModal";
import { getLabColumns, mapApiToForm, mapFormToApi } from "../../../components/pages/Lab";
import { fetchLabs, saveLab, deleteLab } from "../../../api/services/labService";
import { QUERY_KEYS } from "../../../api/endpoints";
import useEntityList from "../../../hooks/api/useEntityList";
import { useEntityPostMutation, useEntityDeleteMutation } from "../../../hooks/api/useEntityMutation";
import useModal from "../../../hooks/common/useModal";

const PAGE_LIMIT = 100;

const LabPage = () => {
    const [form] = Form.useForm();
    const [dataSource, setDataSource] = useState([]);
    const [editRecord, setEditRecord] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingRecordName, setEditingRecordName] = useState("");

    const addModal = useModal();
    const editModal = useModal();
    const deleteModal = useModal();
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, isLoading } = useEntityList(QUERY_KEYS.labs, fetchLabs, { limit: PAGE_LIMIT });

    const { mutate: saveLabMutation } = useEntityPostMutation(saveLab, QUERY_KEYS.labs);
    const { mutate: deleteLabMutation, isPending: isDeleting } = useEntityDeleteMutation(
        deleteLab,
        QUERY_KEYS.labs
    );

    const columns = getLabColumns();

    const openDelete = (record) => {
        setDeleteTarget(record);
        deleteModal.openModal();
    };

    const closeDelete = () => {
        deleteModal.closeModal();
        setDeleteTarget(null);
    };

    const handleDelete = () => {
        if (deleteTarget?.id) {
            deleteLabMutation(deleteTarget.id, { onSuccess: () => closeDelete() });
        }
    };

    const handleAddClick = () => {
        setEditRecord(null);
        addModal.openModal();
    };

    const handleEditClick = (record) => {
        setEditRecord(mapApiToForm(record));
        setEditingRecordName(record?.lab || "");
        editModal.openModal();
    };

    const handleSave = async (mode) => {
        try {
            const values = await form.validateFields();
            setModalLoading(true);
            const payload = { id: editRecord?.id || 0, ...mapFormToApi(values), date: new Date().toISOString(),  };
            saveLabMutation(payload, {
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
                title="Lab Management"
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
                formFields={labFields}
                title="Add Lab Management Details"
                width={400}
            />

            <MasterFormEditModal
                isOpen={editModal.open}
                onClose={editModal.closeModal}
                onSave={() => handleSave("edit")}
                loading={modalLoading}
                form={form}
                formFields={labFields}
                initialValues={editRecord}
                title={`Edit Lab Management: ${editingRecordName}`}
                width={400}
            />

            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Delete Lab"
                entityName={deleteTarget?.lab}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />
        </>
    );
};

export default LabPage;
