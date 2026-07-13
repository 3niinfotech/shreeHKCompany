import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDeleteApiRequest, useFetchApi, usePostApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../constants/endpoints';
import AccountingMasterTemplate from '../../../hooks/AccountingMasterTemplate';
import dayjs from 'dayjs';
import { ConfirmDeleteModal } from "../../../components/common/modals";

const AdvanceTableData = () => {
    const [allData, setAllData] = useState([]);
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

    const { mutate: saveExpanse } = usePostApiRequest(ENDPOINTS.advance.payment, 'advanceSave');

    // Delete API Hook - Make sure the endpoint matches your backend
    // AdvanceTableData.js ke andar mutation setup
    const { mutate: deleteExpanse, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.advance.delete, 'advanceDataDelete');

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
                date: record.date ? dayjs(record.date) : null
            });
        } else {
            setSelectedRecord(null);
        }
    }, []);

    const handleSave = (values) => {
        const payload = {
            ...values,
            id: selectedRecord?.id || null,
            date: values.date ? values.date.format('YYYY-MM-DD') : null
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

    const columns = [
        { title: 'No.', key: 'index', width: 70, render: (_, __, i) => i + 1 },
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d) => d?.split('T')[0] },
        { title: 'Party', dataIndex: 'party', key: 'party' },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' },
        { title: 'Book Type', dataIndex: 'type', key: 'type' },
        { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    ];

    const expanseFields = [
        { name: 'date', label: 'Date', type: 'date', required: true, span: 12 },
        { name: 'party', label: 'Party', type: 'select', options: [{ label: 'Cash', value: 'cash' }], required: true, span: 12 },
        { name: 'amount', label: 'Amount', type: 'number', required: true, span: 12 },
        { name: 'type', label: 'Type', type: 'select', options: [{ label: "DR", value: "dr" }, { label: "CR", value: "cr" }], required: true, span: 12 },
        { name: 'description', label: 'Description', type: 'textarea', span: 24 },
    ];

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