import React, { useEffect, useState, useMemo } from "react";
import { Button, Form } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { accSubgroupFields } from "../master/Data";
import { ConfirmDeleteModal } from "../../components/common/modals";
import { MasterListTable } from "../../components/common/table";
import MasterFormAddModal from "../../components/common/masterCommon/MasterFormAddModal";
import MasterFormEditModal from "../../components/common/masterCommon/MasterFormEditModal";
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import useModal from "../../hooks/common/useModal";

const columns = [
  { title: "Sub Group", dataIndex: "name", key: "name" },
  { title: "Group Id", dataIndex: "group_id", key: "group_id", width: 100 },
];

const AccSubgroup = () => {
  const [form] = Form.useForm();
  const [dataSource, setDataSource] = useState([]);
  const [search, setSearch] = useState("");
  const [editRecord, setEditRecord] = useState(null);
  const addModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, isFetching, refetch } = useFetchApi("accSubgroups", ENDPOINTS.accountingSubgroup.list);
  const { mutate: saveRow, isPending: saving } = usePostApiRequest(ENDPOINTS.accountingSubgroup.save, "accSubgroups");
  const { mutate: deleteRow, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.accountingSubgroup.delete, "accSubgroups");

  useEffect(() => {
    if (Array.isArray(data?.Data)) {
      setDataSource(data.Data.filter((row) => row && row.id != null));
    }
  }, [data]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return dataSource;
    const term = search.toLowerCase().trim();
    return dataSource.filter(
      (row) =>
        row?.name?.toLowerCase().includes(term) ||
        String(row?.group_id || "").toLowerCase().includes(term)
    );
  }, [dataSource, search]);

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
      <MasterListTable
        title="Accounting Sub Group"
        columns={columns}
        dataSource={filteredData}
        loading={isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        onAdd={() => { setEditRecord(null); addModal.openModal(); }}
        onEdit={(r) => { setEditRecord(r); editModal.openModal(); }}
        onDelete={openDelete}
        extraHeaderActions={
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />
      <MasterFormAddModal isOpen={addModal.open} onClose={addModal.closeModal} onSave={() => handleSave("add")} loading={saving} form={form} formFields={accSubgroupFields} title="Add Sub Group" width={400} />
      <MasterFormEditModal isOpen={editModal.open} onClose={editModal.closeModal} onSave={() => handleSave("edit")} loading={saving} form={form} formFields={accSubgroupFields} initialValues={editRecord} title={`Edit Sub Group: ${editRecord?.name || ""}`} width={400} />
      <ConfirmDeleteModal open={deleteModal.open} title="Delete Sub Group" entityName={deleteTarget?.name} loading={isDeleting} onCancel={closeDelete} onConfirm={handleDelete} />
    </>
  );
};

export default AccSubgroup;
