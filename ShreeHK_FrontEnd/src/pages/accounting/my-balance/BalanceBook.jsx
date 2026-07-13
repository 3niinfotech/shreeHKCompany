import React, { useState, useEffect } from 'react';
import { Input, Space, Spin } from 'antd';
import { BookOpen, Plus, Save, Check, Pencil, Trash2 } from 'lucide-react';
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../constants/endpoints';
import { ConfirmDeleteModal } from '../../../components/common/modals';
import { getCurrencyFlag } from './currencyFlags';
import styles from '../../../assets/scss/pages/accountings/mybalance.module.scss';

const BalanceBook = () => {
    const [rows, setRows] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });

    const { data, isLoading: isFetching, refetch } = useFetchApi('GetBalance', ENDPOINTS.balance.list);
    const { mutate: createbalanceBook, isLoading: isSubmitting } = usePostApiRequest(ENDPOINTS.balance.book, 'CeateBalance');
    const { mutate: deleteBalance, isLoading: isDeleting } = useDeleteApiRequest(ENDPOINTS.balance.delete, 'deleteBalanceBook');

    useEffect(() => {
        if (data?.Data) {
            const mappedRows = data.Data.map(item => ({
                id: item.id,
                bank: item.bank || '',
                currency: item.currency || '',
                cash: item.cash ?? 0,
                isEditing: false
            }));
            setRows(mappedRows);
        }
    }, [data]);

    const handleAdd = () => {
        const newRow = { _key: Date.now(), id: 0, isEditing: true, bank: '', currency: '', cash: '' };
        setRows([...rows, newRow]);
    };

    const handleSaveRow = (localKey) => {
        const targetRow = rows.find(r => (r._key || r.id) === localKey);
        if (!targetRow) return;

        const payload = {
            id: targetRow.id || 0,
            bank: String(targetRow.bank || ''),
            currency: String(targetRow.currency || ''),
            cash: Number(targetRow.cash) || 0,
            credit: 0,
        };

        createbalanceBook(payload, {
            onSuccess: () => {
                refetch();
            },
        });
    };

    const getRowKey = (row) => row._key || row.id;

    const handleSaveAll = () => {
        const editingRows = rows.filter(r => r.isEditing);
        if (editingRows.length === 0) return;
        editingRows.forEach(row => handleSaveRow(getRowKey(row)));
    };

    const handleEditRow = (key) => {
        setRows(rows.map(row => getRowKey(row) === key ? { ...row, isEditing: true } : row));
    };

    const updateRow = (key, field, value) => {
        setRows(rows.map(r => getRowKey(r) === key ? { ...r, [field]: value } : r));
    };

    const showDeleteModal = (record) => {
        setDeleteModal({ open: true, id: record.id, _key: record._key, name: `Bank: ${record.bank || 'New Entry'}` });
    };

    const closeDelete = () => {
        setDeleteModal({ open: false, id: null, name: '' });
    };

    const handleDelete = () => {
        if (!deleteModal.id) return;
        deleteBalance(deleteModal.id, {
            onSuccess: () => {
                setRows(rows.filter(row => row.id !== deleteModal.id));
                closeDelete();
            }
        });
    };

    return (
        <>
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div className={styles.cardHeaderLeft}>
                        <div className={styles.cardIcon}>
                            <BookOpen size={20} />
                        </div>
                        <div className={styles.cardTitleGroup}>
                            <span className={styles.cardTitle}>Balance Book</span>
                            <span className={styles.cardSubtitle}>Manage your bank balance books</span>
                        </div>
                    </div>
                    <div className={styles.cardActions}>
                        <button className={styles.btnAdd} onClick={handleAdd}>
                            <Plus size={14} /> Add New
                        </button>
                        <button className={styles.btnSave} onClick={handleSaveAll} disabled={isSubmitting}>
                            <Save size={14} /> Save Book
                        </button>
                    </div>
                </div>

                <div className={styles.cardBody}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: 50 }}>No.</th>
                                <th>Book</th>
                                <th>Currency</th>
                                <th style={{ textAlign: 'right' }}>Balance</th>
                                <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isFetching ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>
                                        <Spin />
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, i) => (
                                    <tr key={getRowKey(row)}>
                                        <td>{i + 1}</td>
                                        {row.isEditing ? (
                                            <>
                                                <td>
                                                    <Input
                                                        size="small"
                                                        value={row.bank}
                                                        placeholder="Bank name"
                                                        onChange={(e) => updateRow(getRowKey(row), 'bank', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <Input
                                                        size="small"
                                                        value={row.currency}
                                                        placeholder="e.g. INR"
                                                        onChange={(e) => updateRow(getRowKey(row), 'currency', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <Input
                                                        size="small"
                                                        value={row.cash}
                                                        placeholder="0.00"
                                                        onChange={(e) => updateRow(getRowKey(row), 'cash', e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <Space>
                                                        <button className={styles.editBtn} onClick={() => handleSaveRow(getRowKey(row))}>
                                                            <Check size={14} />
                                                        </button>
                                                        <button className={styles.deleteBtn} onClick={() => showDeleteModal(row)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </Space>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{row.bank}</td>
                                                <td>
                                                    <div className={styles.currencyCell}>
                                                        <span className={styles.flagEmoji}>
                                                            {getCurrencyFlag(row.currency)}
                                                        </span>
                                                        {row.currency}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                    {Number(row.cash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td>
                                                    <div className={styles.actionBtns}>
                                                        <button className={styles.editBtn} onClick={() => handleEditRow(getRowKey(row))}>
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button className={styles.deleteBtn} onClick={() => showDeleteModal(row)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={styles.tableFooter}>
                    Showing 1 to {rows.length} of {rows.length} entries
                </div>
            </div>

            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Delete Balance Entry"
                entityName={deleteModal.name}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />
        </>
    );
};

export default BalanceBook;
