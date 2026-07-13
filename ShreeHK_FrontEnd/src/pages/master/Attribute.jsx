import React, { useEffect, useState } from "react";
import { Form } from "antd";
import { attributeFields } from "./Data";
import Loader from "../../components/common/Loader";
import { ConfirmDeleteModal } from "../../components/common/modals";
import { MasterListTable } from "../../components/common/table";
import MasterFormAddModal from "../../components/common/masterCommon/MasterFormAddModal";
import MasterFormEditModal from "../../components/common/masterCommon/MasterFormEditModal";
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import useModal from "../../hooks/common/useModal";

const columns = [
  { title: "Name", dataIndex: "name", key: "name" },
  { title: "Code", dataIndex: "code", key: "code" },
  { title: "Value", dataIndex: "value", key: "value" },
  { title: "Sort", dataIndex: "short_order", key: "short_order", width: 80 },
];

const Attribute = () => {
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const [editingRecordName, setEditingRecordName] = useState("");
  const addModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, refetch } = useFetchApi("attributes", ENDPOINTS.attribute.list);
  const { mutate: saveRow, isPending: saving } = usePostApiRequest(ENDPOINTS.attribute.save, "attributes");
  const { mutate: deleteRow, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.attribute.delete, "attributes");

  useEffect(() => {
    if (data?.Data) {
      const rows = Array.isArray(data.Data) ? data.Data : [];
      setDataSource(rows.filter((row) => row != null));
    }
  }, [data]);

  const closeAdd = () => {
    addModal.closeModal();
    form.resetFields();
  };

  const closeEdit = () => {
    editModal.closeModal();
    setEditRecord(null);
    setEditingRecordName("");
    form.resetFields();
  };

  const openDelete = (record) => {
    if (!record?.id) return;
    setDeleteTarget(record);
    deleteModal.openModal();
  };

  const closeDelete = () => {
    deleteModal.closeModal();
    setDeleteTarget(null);
  };

  const handleDelete = () => {
    if (!deleteTarget?.id) return;
    deleteRow(deleteTarget.id, {
      onSuccess: () => {
        closeDelete();
        refetch();
      },
    });
  };

  const handleAddClick = () => {
    setEditRecord(null);
    setEditingRecordName("");
    form.resetFields();
    addModal.openModal();
  };

  const handleEditClick = (record) => {
    if (!record) return;
    setEditRecord(record);
    setEditingRecordName(record.name || "");
    form.setFieldsValue(record);
    editModal.openModal();
  };

  const handleSave = async (mode) => {
    try {
      const values = await form.validateFields();
      saveRow({ id: editRecord?.id || 0, ...values }, {
        onSuccess: () => {
          if (mode === "add") closeAdd();
          else closeEdit();
          refetch();
        },
      });
    } catch {
      // validation errors shown by ant form
    }
  };

  return (
    <>
      {isLoading && !dataSource.length ? <Loader /> : (
        <MasterListTable
          title="Attribute Management"
          columns={columns}
          dataSource={dataSource}
          loading={isLoading}
          onAdd={handleAddClick}
          onEdit={handleEditClick}
          onDelete={openDelete}
        />
      )}
      <MasterFormAddModal
        isOpen={addModal.open}
        onClose={closeAdd}
        onSave={() => handleSave("add")}
        loading={saving}
        form={form}
        formFields={attributeFields}
        title="Add Attribute"
        width={480}
      />
      <MasterFormEditModal
        isOpen={editModal.open}
        onClose={closeEdit}
        onSave={() => handleSave("edit")}
        loading={saving}
        form={form}
        formFields={attributeFields}
        initialValues={editRecord}
        title={`Edit: ${editingRecordName}`}
        width={480}
      />
      <ConfirmDeleteModal
        open={deleteModal.open}
        title="Delete Attribute"
        entityName={deleteTarget?.name}
        loading={isDeleting}
        onCancel={closeDelete}
        onConfirm={handleDelete}
      />
    </>
  );
};

export default Attribute;
