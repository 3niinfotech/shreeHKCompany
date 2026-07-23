import React, { useEffect, useState } from "react";
import { Form } from "antd";
import { toast } from "sonner";
import { shippingFields } from "../Data";
import Loader from "../../../components/common/Loader";
import { ConfirmDeleteModal } from "../../../components/common/modals";
import { MasterListTable } from "../../../components/common/table";
import MasterFormAddModal from "../../../components/common/masterCommon/MasterFormAddModal";
import MasterFormEditModal from "../../../components/common/masterCommon/MasterFormEditModal";
import { getShippingColumns, mapApiToForm, mapFormToApi } from "../../../components/pages/Shipping";
import { fetchShipping, saveShipping, deleteShipping } from "../../../api/services/shippingService";
import { QUERY_KEYS } from "../../../api/endpoints";
import useEntityList from "../../../hooks/api/useEntityList";
import { useEntityPostMutation, useEntityDeleteMutation } from "../../../hooks/api/useEntityMutation";
import useModal from "../../../hooks/common/useModal";

const PAGE_LIMIT = 100;

const ShippingPage = () => {
    const [form] = Form.useForm();
    const [dataSource, setDataSource] = useState([]);
    const [editRecord, setEditRecord] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [modalLoading, setModalLoading] = useState(false);
    const [editingRecordName, setEditingRecordName] = useState("");
    const [search, setSearch] = useState("");
    const addModal = useModal();
    const editModal = useModal();
    const deleteModal = useModal();
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, isLoading } = useEntityList(QUERY_KEYS.shipping, fetchShipping, { limit: PAGE_LIMIT, searchInput: search, });

    const { mutate: saveShippingMutation } = useEntityPostMutation(saveShipping, QUERY_KEYS.shipping);
    const { mutate: deleteShippingMutation, isPending: isDeleting } = useEntityDeleteMutation(
        deleteShipping,
        QUERY_KEYS.shipping
    );

    const columns = getShippingColumns();

    const handleSearch = (value) => {
        setSearch(value);
    };

    const openDelete = (record) => {
        setDeleteTarget(record);
        deleteModal.openModal();
    };

    const closeDelete = () => {
        deleteModal.closeModal();
        setDeleteTarget(null);
    };

    const handleDelete = () => {
        deleteShippingMutation(deleteTarget?.id, { onSuccess: () => closeDelete() });
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
            saveShippingMutation(payload, {
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
            if (isInitialLoading) setIsInitialLoading(false);
        }
    }, [data, isInitialLoading]);

    if (isInitialLoading && isLoading) {
        return <Loader />;
    }

    return (
        <>
            <MasterListTable
                title="Shipping"
                columns={columns}
                dataSource={dataSource}
                loading={isLoading}
                onAdd={handleAddClick}
                onEdit={handleEditClick}
                onDelete={openDelete}
                searchValue={search}
                onSearchChange={handleSearch}
            />

            <MasterFormAddModal
                isOpen={addModal.open}
                onClose={addModal.closeModal}
                onSave={() => handleSave("add")}
                loading={modalLoading}
                form={form}
                formFields={shippingFields}
                title="Add Shipping Details"
                width={400}
            />

            <MasterFormEditModal
                isOpen={editModal.open}
                onClose={editModal.closeModal}
                onSave={() => handleSave("edit")}
                loading={modalLoading}
                form={form}
                formFields={shippingFields}
                initialValues={editRecord}
                title={`Edit Shipping: ${editingRecordName}`}
                width={400}
            />

            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Delete Shipping"
                entityName={deleteTarget?.name}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />
        </>
    );
};

export default ShippingPage;
