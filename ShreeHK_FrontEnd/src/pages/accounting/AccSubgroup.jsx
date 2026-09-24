import React, { useEffect, useState, useMemo } from "react";
import { Button, Form } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { ConfirmDeleteModal } from "../../components/common/modals";
import { MasterListTable } from "../../components/common/table";
import MasterFormAddModal from "../../components/common/masterCommon/MasterFormAddModal";
import MasterFormEditModal from "../../components/common/masterCommon/MasterFormEditModal";
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../api/endpoints";
import useModal from "../../hooks/common/useModal";

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
  const { data: groupData } = useFetchApi("accGroups", ENDPOINTS.accountingGroup.list);
  const { mutate: saveRow, isPending: saving } = usePostApiRequest(ENDPOINTS.accountingSubgroup.save, "accSubgroups");
  const { mutate: deleteRow, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.accountingSubgroup.delete, "accSubgroups", { queryParam: "deleteId" });

  const groupOptions = useMemo(() => {
    const list = groupData?.Data || [];
    return list.map((g) => ({
      label: g.name,
      value: g.id,
    }));
  }, [groupData]);

  const groupNameById = useMemo(() => {
    const map = new Map();
    (groupData?.Data || []).forEach((g) => {
      map.set(String(g.id), g.name);
      map.set(Number(g.id), g.name);
      map.set(String(g.name), g.name);
    });
    return map;
  }, [groupData]);

  const formFields = useMemo(() => [
    { type: "input", label: "Sub Group Name", name: "name", required: true, span: 24 },
    {
      type: "select",
      label: "Under",
      name: "under",
      required: false,
      options: groupOptions,
      placeholder: "Select Under Group",
      span: 24,
    },
  ], [groupOptions]);

  const columns = useMemo(() => [
    { title: "Sub Group", dataIndex: "name", key: "name" },
    {
      title: "Under",
      dataIndex: "under",
      key: "under",
      render: (val, record) => record.under_name || groupNameById.get(val) || groupNameById.get(String(val)) || val || "-",
    },
  ], [groupNameById]);

  useEffect(() => {
    if (Array.isArray(data?.Data)) {
      setDataSource(data.Data.filter((row) => row && row.id != null));
    }
  }, [data]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return dataSource;
    const term = search.toLowerCase().trim();
    return dataSource.filter((row) => {
      const underName = row?.under_name || groupNameById.get(row?.under) || groupNameById.get(String(row?.under)) || "";
      return (
        row?.name?.toLowerCase().includes(term) ||
        String(underName).toLowerCase().includes(term) ||
        String(row?.under || "").toLowerCase().includes(term)
      );
    });
  }, [dataSource, search, groupNameById]);

  const initialFormValues = useMemo(() => {
    if (!editRecord) return null;
    return {
      ...editRecord,
      under: editRecord.under != null ? (Number(editRecord.under) || editRecord.under) : (editRecord.group_id != null ? (Number(editRecord.group_id) || editRecord.group_id) : undefined),
    };
  }, [editRecord]);

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
    saveRow({
      id: editRecord?.id || 0,
      name: values.name,
      under: values.under ?? null,
    }, {
      onSuccess: () => {
        mode === "add" ? addModal.closeModal() : editModal.closeModal();
        refetch();
      },
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
      <MasterFormAddModal
        isOpen={addModal.open}
        onClose={addModal.closeModal}
        onSave={() => handleSave("add")}
        loading={saving}
        form={form}
        formFields={formFields}
        title="Add Sub Group"
        width={400}
      />
      <MasterFormEditModal
        isOpen={editModal.open}
        onClose={editModal.closeModal}
        onSave={() => handleSave("edit")}
        loading={saving}
        form={form}
        formFields={formFields}
        initialValues={initialFormValues}
        title={`Edit Sub Group: ${editRecord?.name || ""}`}
        width={400}
      />
      <ConfirmDeleteModal
        open={deleteModal.open}
        title="Delete Sub Group"
        entityName={deleteTarget?.name}
        loading={isDeleting}
        onCancel={closeDelete}
        onConfirm={handleDelete}
      />
    </>
  );
};

export default AccSubgroup;
