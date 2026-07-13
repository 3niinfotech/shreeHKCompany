import React, { useState, useEffect } from 'react';
import { Input, Space, Spin } from 'antd';
import { Coins, Plus, Save, Check, Pencil, Trash2 } from 'lucide-react';
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../constants/endpoints';
import { getCurrencyFlag } from './currencyFlags';
import styles from '../../../assets/scss/pages/accountings/mybalance.module.scss';

const CurrancyRate = () => {
    const [rows, setRows] = useState([]);

    const { data: apiResponse, isLoading: isFetching } = useFetchApi('fetchCurrancyData', ENDPOINTS.currency.list);
    const { mutate: createCurrncyRate, isLoading: isSubmitting } = usePostApiRequest(ENDPOINTS.currency.save, 'fetchCurrancyData');
    const { mutate: deleteCurrncyRate, isLoading: isDeleting } = useDeleteApiRequest(ENDPOINTS.currency.delete, 'fetchCurrancyData');

    useEffect(() => {
        if (apiResponse?.Data && Array.isArray(apiResponse.Data)) {
            const mappedRows = apiResponse.Data.map(item => ({
                id: item.id,
                col1: item.currency,
                col2: item.USD,
                col3: item.HKD,
                isEditing: false
            }));
            setRows(mappedRows);
        }
    }, [apiResponse]);

    const handleAdd = () => {
        const newRow = { id: Date.now(), isEditing: true, col1: '', col2: '', col3: '' };
        setRows([...rows, newRow]);
    };

    const handleSaveRow = (id) => {
        const targetRow = id
            ? rows.find(r => r.id === id)
            : rows.find(r => r.isEditing);

        if (!targetRow) return;

        const payload = {
            id: targetRow.id > 1000000000000 ? null : targetRow.id,
            currency: targetRow.col1,
            USD: targetRow.col2,
            HKD: targetRow.col3
        };

        createCurrncyRate(payload, {
            onSuccess: () => {
                // React Query invalidation handles currency list refresh.
            },
        });
    };

    const handleEditRow = (id) => {
        setRows(rows.map(row => row.id === id ? { ...row, isEditing: true } : row));
    };

    const handleDeleteRow = (id) => {
        if (!id || id > 1000000000000) {
            setRows(rows.filter(row => row.id !== id));
            return;
        }

        deleteCurrncyRate(id, {
            onSuccess: () => {
                // React Query invalidation handles currency list refresh.
            }
        });
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                    <div className={styles.cardIcon}>
                        <Coins size={20} />
                    </div>
                    <div className={styles.cardTitleGroup}>
                        <span className={styles.cardTitle}>Currency Rate</span>
                        <span className={styles.cardSubtitle}>Manage live currency exchange rates</span>
                    </div>
                </div>
                <div className={styles.cardActions}>
                    <button className={styles.btnAdd} onClick={handleAdd}>
                        <Plus size={14} /> Add New
                    </button>
                    <button className={styles.btnSave} onClick={() => handleSaveRow()} disabled={isSubmitting}>
                        <Save size={14} /> Save Currency
                    </button>
                </div>
            </div>

            <div className={styles.cardBody}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: 50 }}>No.</th>
                            <th>Currency</th>
                            <th style={{ width: 60, textAlign: 'center' }}>Flag</th>
                            <th style={{ textAlign: 'right' }}>USD</th>
                            <th style={{ textAlign: 'right' }}>HKD</th>
                            <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isFetching ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>
                                    <Spin />
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, i) => (
                                <tr key={row.id}>
                                    <td>{i + 1}</td>
                                    {row.isEditing ? (
                                        <>
                                            <td>
                                                <Input
                                                    size="small"
                                                    value={row.col1}
                                                    onChange={(e) => setRows(rows.map(r => r.id === row.id ? { ...r, col1: e.target.value } : r))}
                                                />
                                            </td>
                                            <td />
                                            <td>
                                                <Input
                                                    size="small"
                                                    value={row.col2}
                                                    onChange={(e) => setRows(rows.map(r => r.id === row.id ? { ...r, col2: e.target.value } : r))}
                                                />
                                            </td>
                                            <td>
                                                <Input
                                                    size="small"
                                                    value={row.col3}
                                                    onChange={(e) => setRows(rows.map(r => r.id === row.id ? { ...r, col3: e.target.value } : r))}
                                                />
                                            </td>
                                            <td>
                                                <Space>
                                                    <button className={styles.editBtn} onClick={() => handleSaveRow(row.id)}>
                                                        <Check size={14} />
                                                    </button>
                                                    <button className={styles.deleteBtn} onClick={() => handleDeleteRow(row.id)} disabled={isDeleting}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </Space>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{row.col1}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={styles.flagEmoji}>{getCurrencyFlag(row.col1)}</span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>{row.col2}</td>
                                            <td style={{ textAlign: 'right' }}>{row.col3}</td>
                                            <td>
                                                <div className={styles.actionBtns}>
                                                    <button className={styles.editBtn} onClick={() => handleEditRow(row.id)}>
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button className={styles.deleteBtn} onClick={() => handleDeleteRow(row.id)} disabled={isDeleting}>
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
    );
};

export default CurrancyRate;
