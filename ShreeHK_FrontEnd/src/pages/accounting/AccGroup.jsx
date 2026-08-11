import React, { useEffect, useState } from "react";
import { Button, Form } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { accGroupFields } from "../master/Data";
import Loader from "../../components/common/Loader";
import { ConfirmDeleteModal } from "../../components/common/modals";
import { MasterListTable } from "../../components/common/table";
import MasterFormAddModal from "../../components/common/masterCommon/MasterFormAddModal";
import MasterFormEditModal from "../../components/common/masterCommon/MasterFormEditModal";
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import useModal from "../../hooks/common/useModal";

const columns = [{ title: "Group Name", dataIndex: "name", key: "name" }];

const AccGroup = () => {
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState([]);
  const [editRecord, setEditRecord] = useState(null);
  const addModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, isFetching, refetch } = useFetchApi("accGroups", ENDPOINTS.accountingGroup.list);
  const { mutate: saveRow, isPending: saving } = usePostApiRequest(ENDPOINTS.accountingGroup.save, "accGroups");
  const { mutate: deleteRow, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.accountingGroup.delete, "accGroups");

  useEffect(() => {
    if (Array.isArray(data?.Data)) {
      setDataSource(data.Data.filter((row) => row && row.id != null));
    }
  }, [data]);

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
    if (deleteTarget?.id == null) return;
    deleteRow(deleteTarget.id, {
      onSuccess: () => {
        closeDelete();
        refetch();
      },
    });
  };

  const handleSave = async (mode) => {
    const values = await form.validateFields();
    saveRow({ id: editRecord?.id || 0, ...values }, {
      onSuccess: () => { mode === "add" ? addModal.closeModal() : editModal.closeModal(); refetch(); },
    });
  };

  return (
    <>
      {isLoading && !dataSource.length ? <Loader /> : (
        <MasterListTable title="Accounting Group" columns={columns} dataSource={dataSource} loading={isLoading}
          onAdd={() => { setEditRecord(null); addModal.openModal(); }}
          onEdit={(r) => { setEditRecord(r); editModal.openModal(); }}
          onDelete={openDelete}
          extraHeaderActions={
            <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
              Refresh
            </Button>
          }
        />
      )}
      <MasterFormAddModal isOpen={addModal.open} onClose={addModal.closeModal} onSave={() => handleSave("add")} loading={saving} form={form} formFields={accGroupFields} title="Add Group" width={400} />
      <MasterFormEditModal isOpen={editModal.open} onClose={editModal.closeModal} onSave={() => handleSave("edit")} loading={saving} form={form} formFields={accGroupFields} initialValues={editRecord} title={`Edit: ${editRecord?.name || ""}`} width={400} />
      <ConfirmDeleteModal open={deleteModal.open} title="Delete Group" entityName={deleteTarget?.name} loading={isDeleting} onCancel={closeDelete} onConfirm={handleDelete} />
    </>
  );
};

export default AccGroup;
