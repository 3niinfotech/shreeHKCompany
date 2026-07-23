// import React, { useEffect, useState } from "react";
// import { Button, Form } from "antd";
// import { companyFields } from "../Data";
// import Loader from "../../../components/common/Loader";
// import { ConfirmDeleteModal } from "../../../components/common/modals";
// import { MasterListTable } from "../../../components/common/table";
// import MasterFormAddModal from "../../../components/common/masterCommon/MasterFormAddModal";
// import MasterFormEditModal from "../../../components/common/masterCommon/MasterFormEditModal";
// import {
//     getCompanyColumns,
//     mapApiToForm,
//     mapFormToApi,
//     exportCompanyExcel,
// } from "../../../components/pages/Company";
// import { fetchCompanies, saveCompany, deleteCompany } from "../../../api/services/companyService";
// import { QUERY_KEYS } from "../../../api/endpoints";
// import useEntityList from "../../../hooks/api/useEntityList";
// import { useEntityPostMutation, useEntityDeleteMutation } from "../../../hooks/api/useEntityMutation";
// import useModal from "../../../hooks/common/useModal";
// import AICustomerSuggestModal from "../../../components/ai/AICustomerSuggestModal";
// import { Sparkles } from "lucide-react";

// const PAGE_LIMIT = 100;

// const CompanyPage = () => {
//     const [form] = Form.useForm();
//     const [offset, setOffset] = useState(0);
//     const [combinedData, setCombinedData] = useState([]);
//     const [editRecord, setEditRecord] = useState(null);
//     const [isInitialLoading, setIsInitialLoading] = useState(true);
//     const [modalLoading, setModalLoading] = useState(false);
//     const [selectedRowKeys, setSelectedRowKeys] = useState([]);
//     const [editingRecordName, setEditingRecordName] = useState("");
//     const [aiSuggestTarget, setAiSuggestTarget] = useState(null);

//     const addModal = useModal();
//     const editModal = useModal();
//     const deleteModal = useModal();
//     const [deleteTarget, setDeleteTarget] = useState(null);

//     const { data, isLoading, isFetching } = useEntityList(
//         QUERY_KEYS.companies,
//         fetchCompanies,
//         { limit: PAGE_LIMIT, offset }
//     );

//     const { mutate: saveCompanyMutation } = useEntityPostMutation(saveCompany, QUERY_KEYS.companies);
//     const { mutate: deleteCompanyMutation, isPending: isDeleting } = useEntityDeleteMutation(
//         deleteCompany,
//         QUERY_KEYS.companies
//     );

//     const columns = [
//         ...getCompanyColumns(offset),
//         {
//             title: "AI Suggest",
//             key: "aiSuggest",
//             width: 110,
//             align: "center",
//             render: (_, record) => (
//                 <Button
//                     type="link"
//                     size="small"
//                     icon={<Sparkles size={14} />}
//                     onClick={() => setAiSuggestTarget(record)}
//                 >
//                     AI Suggest
//                 </Button>
//             ),
//         },
//     ];

//     const openDelete = (record) => {
//         setDeleteTarget(record);
//         deleteModal.openModal();
//     };

//     const closeDelete = () => {
//         deleteModal.closeModal();
//         setDeleteTarget(null);
//     };

//     const handleDelete = () => {
//         deleteCompanyMutation(deleteTarget?.id, { onSuccess: () => closeDelete() });
//     };

//     const handleAddClick = () => {
//         setEditRecord(null);
//         addModal.openModal();
//     };

//     const handleEditClick = (record) => {
//         setEditRecord(mapApiToForm(record));
//         setEditingRecordName(record?.name || "");
//         editModal.openModal();
//     };

//     const handleSave = async (mode) => {
//         try {
//             const values = await form.validateFields();
//             setModalLoading(true);
//             const payload = { id: editRecord?.id || 0, ...mapFormToApi(values) };
//             saveCompanyMutation(payload, {
//                 onSuccess: () => {
//                     setEditRecord(null);
//                     setOffset(0);
//                     setCombinedData([]);
//                     if (mode === "add") addModal.closeModal();
//                     else editModal.closeModal();
//                 },
//                 onSettled: () => setModalLoading(false),
//             });
//         } catch (error) {
//             console.error("Save Failed:", error);
//             setModalLoading(false);
//         }
//     };

//     const handleDownloadExcel = () => {
//         const selectedRows = combinedData.filter((row) => selectedRowKeys.includes(row.id));
//         exportCompanyExcel(selectedRows);
//     };

//     useEffect(() => {
//         if (data?.Data) {
//             setCombinedData((prev) => (offset === 0 ? data.Data : [...prev, ...data.Data]));
//             if (isInitialLoading) setIsInitialLoading(false);
//         }
//     }, [data, offset, isInitialLoading]);

//     useEffect(() => {
//         const handleScroll = () => {
//             const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
//             const windowHeight = window.innerHeight;
//             const fullHeight = document.documentElement.scrollHeight;

//             if (fullHeight - (scrollTop + windowHeight) < 200) {
//                 if (!isFetching && combinedData.length < (data?.TotalItems || 0)) {
//                     setOffset((prev) => prev + 1);
//                 }
//             }
//         };

//         // window.addEventListener("scroll", handleScroll);
//         return () => window.removeEventListener("scroll", handleScroll);
//     }, [isFetching, combinedData.length, data?.TotalItems]);

//     useEffect(() => {
//         setSelectedRowKeys((prev) => prev.filter((key) => combinedData.some((row) => row.id === key)));
//     }, [combinedData]);

//     if (isInitialLoading) {
//         return <Loader />;
//     }

//     return (
//         <>
//             <MasterListTable
//                 title="Company Management"
//                 columns={columns}
//                 dataSource={combinedData}
//                 loading={isLoading && offset === 0}
//                 onAdd={handleAddClick}
//                 onEdit={handleEditClick}
//                 onDelete={openDelete}
//                 rowSelection={{
//                     selectedRowKeys,
//                     onChange: (keys) => setSelectedRowKeys(keys),
//                 }}
//                 extraHeaderActions={
//                     <Button onClick={handleDownloadExcel} disabled={selectedRowKeys.length === 0}>
//                         Download Excel
//                     </Button>
//                 }
//             />

//             <MasterFormAddModal
//                 isOpen={addModal.open}
//                 onClose={addModal.closeModal}
//                 onSave={() => handleSave("add")}
//                 loading={modalLoading}
//                 form={form}
//                 formFields={companyFields}
//                 title="Add Company Management"
//                 width={800}
//             />

//             <MasterFormEditModal
//                 isOpen={editModal.open}
//                 onClose={editModal.closeModal}
//                 onSave={() => handleSave("edit")}
//                 loading={modalLoading}
//                 form={form}
//                 formFields={companyFields}
//                 initialValues={editRecord}
//                 title={`Edit Company Management: ${editingRecordName}`}
//                 width={800}
//             />

//             <ConfirmDeleteModal
//                 open={deleteModal.open}
//                 title="Delete Company"
//                 entityName={deleteTarget?.name}
//                 loading={isDeleting}
//                 onCancel={closeDelete}
//                 onConfirm={handleDelete}
//             />

//             <AICustomerSuggestModal
//                 open={!!aiSuggestTarget}
//                 onClose={() => setAiSuggestTarget(null)}
//                 customerId={aiSuggestTarget?.id}
//                 customerName={aiSuggestTarget?.name}
//             />
//         </>
//     );
// };

// export default CompanyPage;


import React, { useEffect, useState } from "react";
import { Button, Form } from "antd";
import { companyFields } from "../Data";
import Loader from "../../../components/common/Loader";
import { ConfirmDeleteModal } from "../../../components/common/modals";
import { MasterListTable } from "../../../components/common/table";
import MasterFormAddModal from "../../../components/common/masterCommon/MasterFormAddModal";
import MasterFormEditModal from "../../../components/common/masterCommon/MasterFormEditModal";
import {
    getCompanyColumns,
    mapApiToForm,
    mapFormToApi,
    exportCompanyExcel,
} from "../../../components/pages/Company";
import { fetchCompanies, saveCompany, deleteCompany } from "../../../api/services/companyService";
import { QUERY_KEYS } from "../../../api/endpoints";
import useEntityList from "../../../hooks/api/useEntityList";
import { useEntityPostMutation, useEntityDeleteMutation } from "../../../hooks/api/useEntityMutation";
import useModal from "../../../hooks/common/useModal";
import AICustomerSuggestModal from "../../../components/ai/AICustomerSuggestModal";
import { Sparkles } from "lucide-react";

const PAGE_LIMIT = 100;

const CompanyPage = () => {
    const [form] = Form.useForm();
    const [offset, setOffset] = useState(0);
    const [combinedData, setCombinedData] = useState([]);
    const [editRecord, setEditRecord] = useState(null);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [modalLoading, setModalLoading] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [editingRecordName, setEditingRecordName] = useState("");
    const [aiSuggestTarget, setAiSuggestTarget] = useState(null);
    const [search, setSearch] = useState("");
    const addModal = useModal();
    const editModal = useModal();
    const deleteModal = useModal();
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, isLoading, isFetching } = useEntityList(
        QUERY_KEYS.companies,
        fetchCompanies,
        {
            limit: PAGE_LIMIT,
            offset,
            searchInput: search,
        }
        // { limit: PAGE_LIMIT, offset }
    );

    const { mutate: saveCompanyMutation } = useEntityPostMutation(saveCompany, QUERY_KEYS.companies);
    const { mutate: deleteCompanyMutation, isPending: isDeleting } = useEntityDeleteMutation(
        deleteCompany,
        QUERY_KEYS.companies
    );

    const columns = [
        ...getCompanyColumns(offset),
        // {
        //     title: "AI Suggest",
        //     key: "aiSuggest",
        //     width: 110,
        //     align: "center",
        //     render: (_, record) => (
        //         <Button
        //             type="link"
        //             size="small"
        //             icon={<Sparkles size={14} />}
        //             onClick={() => setAiSuggestTarget(record)}
        //         >
        //             AI Suggest
        //         </Button>
        //     ),
        // },
    ];

    const handleSearchChange = (value) => {
        setSearch(value);
        setOffset(0);
        setCombinedData([]);
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
        deleteCompanyMutation(deleteTarget?.id, { onSuccess: () => closeDelete() });
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
            saveCompanyMutation(payload, {
                onSuccess: () => {
                    setEditRecord(null);
                    setOffset(0);
                    setCombinedData([]);
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

    const handleDownloadExcel = () => {
        const selectedRows = combinedData.filter((row) => selectedRowKeys.includes(row.id));
        exportCompanyExcel(selectedRows);
    };

    useEffect(() => {
        if (data?.Data) {
            setCombinedData((prev) => (offset === 0 ? data.Data : [...prev, ...data.Data]));
            if (isInitialLoading) setIsInitialLoading(false);
        }
    }, [data, offset, isInitialLoading]);

    // FIXED: listener is now actually attached (was commented out before)
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const fullHeight = document.documentElement.scrollHeight;

            if (fullHeight - (scrollTop + windowHeight) < 200) {
                if (!isFetching && combinedData.length < (data?.TotalItems || 0)) {
                    setOffset((prev) => prev + 1);
                }
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isFetching, combinedData.length, data?.TotalItems]);

    useEffect(() => {
        setSelectedRowKeys((prev) => prev.filter((key) => combinedData.some((row) => row.id === key)));
    }, [combinedData]);

    if (isInitialLoading) {
        return <Loader />;
    }

    return (
        <>
            <MasterListTable
                title="Company Management"
                columns={columns}
                dataSource={combinedData}
                loading={isLoading && offset === 0}
                onAdd={handleAddClick}
                onEdit={handleEditClick}
                onDelete={openDelete}
                searchValue={search}
                onSearchChange={handleSearchChange}
                rowSelection={{
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                }}
                extraHeaderActions={
                    <Button onClick={handleDownloadExcel} disabled={selectedRowKeys.length === 0}>
                        Download Excel
                    </Button>
                }
            />

            {isFetching && offset > 0 && (
                <div style={{ textAlign: "center", padding: 12 }}>
                    <Loader />
                </div>
            )}

            <MasterFormAddModal
                isOpen={addModal.open}
                onClose={addModal.closeModal}
                onSave={() => handleSave("add")}
                loading={modalLoading}
                form={form}
                formFields={companyFields}
                title="Add Company Management"
                width={800}
            />

            <MasterFormEditModal
                isOpen={editModal.open}
                onClose={editModal.closeModal}
                onSave={() => handleSave("edit")}
                loading={modalLoading}
                form={form}
                formFields={companyFields}
                initialValues={editRecord}
                title={`Edit Company Management: ${editingRecordName}`}
                width={800}
            />

            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Delete Company"
                entityName={deleteTarget?.name}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />

            <AICustomerSuggestModal
                open={!!aiSuggestTarget}
                onClose={() => setAiSuggestTarget(null)}
                customerId={aiSuggestTarget?.id}
                customerName={aiSuggestTarget?.name}
            />
        </>
    );
};

export default CompanyPage; 