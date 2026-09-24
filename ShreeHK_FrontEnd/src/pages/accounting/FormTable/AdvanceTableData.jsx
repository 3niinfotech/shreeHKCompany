import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDeleteApiRequest, useFetchApi, usePostApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../api/endpoints';
import AccountingMasterTemplate from '../../../components/common/accounting/AccountingMasterTemplate';
import ExportExcelButton from '../../../components/common/ExportExcelButton';
import { exportAdvanceExcel } from '../../../components/pages/Advance/advanceExcelExport';
import dayjs from 'dayjs';
import { ConfirmDeleteModal } from "../../../components/common/modals";

const AdvanceTableData = () => {
    const [allData, setAllData] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ open: false, record: null });

    const limit = 100;

    const { data, isLoading, isFetching, refetch } = useFetchApi(
        `advanceData_page_${offset}`,
        ENDPOINTS.advance.list,
        { limit, offset }
    );

    const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);

    const partyOptions = useMemo(() => {
        const list = companyData?.Data || [];
        return list.map((item) => ({
            label: item.name,
            value: item.id,
        }));
    }, [companyData]);

    const partyNameById = useMemo(() => {
        const map = new Map();
        (companyData?.Data || []).forEach((item) => {
            map.set(String(item.id), item.name);
            map.set(String(item.name), item.name);
        });
        return map;
    }, [companyData]);

    const resolvePartyName = useCallback((party) => {
        if (party == null || party === '') return '-';
        return partyNameById.get(String(party)) || String(party);
    }, [partyNameById]);

    const { mutate: saveExpanse } = usePostApiRequest(ENDPOINTS.advance.payment, 'advanceSave');

    // Delete API Hook - Make sure the endpoint matches your backend
    // AdvanceTableData.js ke andar mutation setup
    const { mutate: deleteExpanse, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.advance.delete, 'advanceDataDelete', { queryParam: 'deleteId' });

    useEffect(() => {
        if (data && data.Data) {
            const rawRecords = Array.isArray(data.Data) ? data.Data : Object.values(data.Data);
            const newRecords = rawRecords.length > limit
                ? rawRecords.slice(offset, offset + limit)
                : rawRecords;

            if (newRecords.length > 0) {
                setAllData(prev => {
                    if (offset === 0) return newRecords;
                    const existingIds = new Set(prev.map(item => item.id));
                    const uniqueNew = newRecords.filter(item => !existingIds.has(item.id));
                    return [...prev, ...uniqueNew];
                });
                if (newRecords.length < limit) setHasMore(false);
            } else {
                setHasMore(false);
            }
        }
    }, [data, offset]);

    const handleLoadMore = useCallback(() => {
        if (!isLoading && !isFetching && hasMore) {
            setOffset(prev => prev + limit);
        }
    }, [isLoading, isFetching, hasMore]);

    const handleEdit = useCallback((record) => {
        if (record) {
            setSelectedRecord({
                ...record,
                date: record.date ? dayjs(record.date) : null,
                assign_date: record.assign_date ? dayjs(record.assign_date) : null,
            });
        } else {
            setSelectedRecord(null);
        }
    }, []);

    const handleSave = (values) => {
        const payload = {
            ...values,
            id: selectedRecord?.id || null,
            date: values.date ? (values.date.format ? values.date.format('YYYY-MM-DD') : values.date) : null,
            assign_date: values.assign_date ? (values.assign_date.format ? values.assign_date.format('YYYY-MM-DD') : values.assign_date) : null,
        };

        saveExpanse(payload, {
            onSuccess: () => {
                setOffset(0);
                refetch();
            },
        });
    };

    // --- DELETE HANDLERS ---
    const openDelete = (record) => {
        setDeleteModal({ open: true, record });
    };

    const closeDelete = () => {
        setDeleteModal({ open: false, record: null });
    };

    const handleDelete = () => {
        if (!deleteModal.record?.id) return;

        const id = deleteModal.record.id;

        deleteExpanse(id, {
            onSuccess: () => {
                closeDelete();
                setOffset(0);
                refetch();
            },
        });
    };

    const columns = useMemo(() => [
        { title: 'No.', key: 'index', width: 60, render: (_, __, i) => i + 1 },
        { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (d) => (d && dayjs(d).isValid() ? dayjs(d).format('DD-MM-YYYY') : (d?.split('T')[0] || '-')) },
        { title: 'Use Date', dataIndex: 'assign_date', key: 'assign_date', width: 110, render: (d) => (d && dayjs(d).isValid() ? dayjs(d).format('DD-MM-YYYY') : (d?.split('T')[0] || '-')) },
        { title: 'Invoice', dataIndex: 'invoice', key: 'invoice', width: 120, render: (inv, r) => inv || r.invoice_id || '-' },
        { title: 'Party', dataIndex: 'party', key: 'party', width: 220, render: (party, r) => r.party_name || resolvePartyName(party) },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', width: 110, render: (v) => v != null && v !== '' ? Number(v).toFixed(2) : '-' },
        { title: 'Used', dataIndex: 'use_amount', key: 'use_amount', align: 'right', width: 110, render: (v) => v != null && v !== '' ? Number(v).toFixed(2) : '-' },
        { title: 'Balance', dataIndex: 'balance_amount', key: 'balance_amount', align: 'right', width: 110, render: (v, r) => v != null && v !== '' ? Number(v).toFixed(2) : (r.amount ? (Number(r.amount) - Number(r.use_amount || 0)).toFixed(2) : '-') },
        { title: 'Book Type', dataIndex: 'type', key: 'type', width: 100 },
        { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    ], [resolvePartyName]);

    const expanseFields = useMemo(() => [
        { name: 'date', label: 'Date', type: 'date', required: true, span: 12 },
        { name: 'assign_date', label: 'Use Date', type: 'date', required: false, span: 12 },
        { name: 'invoice', label: 'Invoice', type: 'input', required: false, span: 12 },
        { name: 'party', label: 'Party', type: 'select', options: partyOptions, required: true, span: 12 },
        { name: 'amount', label: 'Amount', type: 'number', required: true, span: 8 },
        { name: 'use_amount', label: 'Used Amount', type: 'number', required: false, span: 8 },
        { name: 'balance_amount', label: 'Balance Amount', type: 'number', required: false, span: 8 },
        { name: 'type', label: 'Type', type: 'select', options: [{ label: "DR", value: "dr" }, { label: "CR", value: "cr" }], required: true, span: 12 },
        { name: 'description', label: 'Description', type: 'textarea', span: 24 },
    ], [partyOptions]);

    const handleExportExcel = async () => {
        setIsExporting(true);
        await exportAdvanceExcel(allData, resolvePartyName);
        setIsExporting(false);
    };

    return (
        <>
            <AccountingMasterTemplate
                title="Advance"
                columns={columns}
                dataSource={allData}
                loading={isLoading || isFetching}
                formFields={expanseFields}
                initialValues={selectedRecord}
                onEdit={handleEdit}
                onLoadMore={handleLoadMore}
                hasMore={hasMore}
                onSave={handleSave}
                onDelete={openDelete}
                addPagePath="/accounting/advance"
                extraActions={
                    <ExportExcelButton
                        onClick={handleExportExcel}
                        loading={isExporting}
                        disabled={!allData || allData.length === 0}
                    />
                }
                onRefresh={async () => {
                    setHasMore(true);
                    if (offset !== 0) {
                        setOffset(0);
                        setAllData([]);
                        return;
                    }
                    const result = await refetch();
                    if (result?.data?.Data) {
                        const rawRecords = Array.isArray(result.data.Data)
                            ? result.data.Data
                            : Object.values(result.data.Data);
                        setAllData(rawRecords.length > limit ? rawRecords.slice(0, limit) : rawRecords);
                    }
                }}
                refreshLoading={isLoading || isFetching}
            />

            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Delete Expense Record"
                entityName={`Date: ${deleteModal.record?.date?.split('T')[0]}, Amount: ${deleteModal.record?.amount}`}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />
        </>
    );
};

export default AdvanceTableData;