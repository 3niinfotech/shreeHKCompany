import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Card, Typography, Space, Button, Tag, Checkbox, Badge, Form, Input } from 'antd';
import { EditOutlined, PrinterOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import useFiltersFormFields from "../../hooks/useFiltersFormFields";
import { BaseModal } from "../../components/common/modals";
import DynamicForm from '../../hooks/DynamicFormField';
import { ConfirmDeleteModal } from "../../components/common/modals";
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import PageHeroHeader from '../../components/common/PageHeroHeader';
import { FileTextOutlined } from '@ant-design/icons';
import styles from "../../assets/scss/pages/outward.module.scss";
import useTableBodyScrollHeight from "../../hooks/useTableBodyScrollHeight";
import { cssVar } from '../../theme';

const { Title, Text } = Typography;

const ExpandedRowContent = ({ rowId }) => {
    const { data: productData, isLoading } = useFetchApi(
        ['RowProducts', rowId],
        ENDPOINTS.outward.getProducts,
        { id: rowId },
        'POST'
    );

    const innerColumns = [
        { title: 'Type', dataIndex: 'group_type', key: 'group_type', width: 120, render: (v) => v?.toUpperCase() || '-' },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
        { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 70, align: 'center' },
        { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 90, align: 'center' },
        { title: 'Price', dataIndex: 'sell_price', key: 'sell_price', width: 110, align: 'right', render: (v) => `$${v || 0}` },
        { title: 'Amount', dataIndex: 'sell_amount', key: 'sell_amount', width: 120, align: 'right', render: (v) => <Text strong>${v || 0}</Text> },
        { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 100, align: 'center' },
        { title: 'Report No.', dataIndex: 'report_no', key: 'report_no', width: 140 },
        { title: 'Shape', dataIndex: 'shape', key: 'shape', width: 170, ellipsis: true },
        { title: 'Clarity', dataIndex: 'clarity', key: 'clarity', width: 100, align: 'center' },
        { title: 'Intensity', dataIndex: 'intensity', key: 'intensity', width: 120, align: 'center' },
        { title: 'Color', dataIndex: 'color', key: 'color', width: 100, align: 'center' },
    ];

    const innerData = useMemo(() => {
        const d = productData?.products || productData?.Data || productData?.data;
        return Array.isArray(d) ? d : [];
    }, [productData]);

    return (
        <div className={styles.innerTableWrap}>
            <Table
                columns={innerColumns}
                dataSource={innerData}
                pagination={false}
                size="small"
                rowKey="id"
                loading={isLoading}
                className={styles.innerTable}
                tableLayout="fixed"
                scroll={{ x: 1300, y: 280 }}
            />
        </div>
    );
};

const OutWord = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [partyOptions, setPartyOptions] = useState([]);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [fetchedProducts, setFetchedProducts] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ open: false, record: null });
    const [editForm] = Form.useForm();

    const [payload, setPayload] = useState({
        party: "", invoiceno: "", type: "", page: 1, from: "", to: ""
    });

    const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: updateTransaction } = usePostApiRequest(ENDPOINTS.outward.getProducts, 'OutwardList', { showToast: false });

    const { mutate: deleteOutward, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.outward.delete, 'OutwardList');

    const isFilterSelected = useMemo(() => !!(payload.party || payload.invoiceno || payload.type || payload.from || payload.to), [payload]);

    const { data: outwardData, isLoading: outwardLoading, refetch } = useFetchApi(
        ['OutwardList', payload],
        ENDPOINTS.outward.list,
        payload,
        'POST',
        { enabled: isFilterSelected }
    );

    const { data: editDetailData, isLoading: isProductLoading } = useFetchApi(
        ['EditDetails', editId],
        `${ENDPOINTS.outward.getById}/?id=${editId}`,
        null,
        'GET',
        { enabled: !!editId }
    );

    useEffect(() => {
        const d = companyData?.Data || companyData?.data;
        if (Array.isArray(d)) {
            setPartyOptions(d.map(item => ({ label: item.name, value: item.id })));
        }
    }, [companyData]);

    useEffect(() => {
        const details = editDetailData?.Data || editDetailData?.data;
        if (details) {
            editForm.setFieldsValue({
                ...details,
                date: details.date ? dayjs(details.date) : null,
                invoicedate: details.invoicedate ? dayjs(details.invoicedate) : null,
                duedate: details.duedate ? dayjs(details.duedate) : null,
                boc: details.boc === 1,
                citi: details.citi === 1,
                dbs: details.dbs === 1,
                sc: details.sc === 1,
            });
            const products = editDetailData?.products || [];
            setFetchedProducts(products);
        }
    }, [editDetailData, editForm]);

    const { form, renderFilters, handleClear } = useFiltersFormFields(['type', 'invoice', 'date', 'party'], {
        typeOptions: [
            { label: 'Sale', value: 'sale' },
            { label: 'Memo', value: 'memo' },
            { label: 'Export', value: 'export' },
            { label: 'Consignment', value: 'consign' }
        ],
        partyOptions: partyOptions,
        isPartyLoading: isCompanyLoading,
        showLabels: true,
    });

    useEffect(() => {
        const invoiceno = searchParams.get('invoiceno');
        const type = searchParams.get('type') || 'memo';
        if (!invoiceno) return;

        form.setFieldsValue({
            invoiceNo: invoiceno || undefined,
            type: type || undefined,
        });
        setPayload({
            party: "",
            invoiceno: invoiceno || "",
            type: type || "",
            page: 1,
            from: "",
            to: "",
        });
        setSearchParams({}, { replace: true });
    }, [searchParams, form, setSearchParams]);

    const stats = useMemo(() => {
        const rawData = outwardData?.Data || outwardData?.data;
        const safeData = Array.isArray(rawData) ? rawData : [];
        return safeData.reduce((acc, curr) => ({
            pcs: acc.pcs + (Number(curr.totalPcs) || 0),
            carats: acc.carats + (Number(curr.totalCarat) || 0),
            amount: acc.amount + (Number(curr.finalAmount) || 0)
        }), { pcs: 0, carats: 0, amount: 0 });
    }, [outwardData]);

    const avgPrice = stats.carats > 0 ? stats.amount / stats.carats : 0;

    const editFields = [
        { name: 'entryno', label: 'Entry', type: 'text', required: true, span: 6 },
        { name: 'type', label: '@ Sale', type: 'text', required: true, span: 6 },
        { name: 'date', label: 'Date', type: 'date', required: true, span: 6 },
        { name: 'reference', label: 'Reference', type: 'text', required: true, span: 6 },
        { name: 'invoiceno', label: 'Invoice No', type: 'text', required: true, span: 6 },
        { name: 'invoicedate', label: 'Invoice Date', type: 'date', required: true, span: 6 },
        { name: 'terms', label: 'Terms', type: 'text', required: true, span: 6 },
        { name: 'duedate', label: 'Due Date', type: 'date', required: true, span: 6 },
        { name: 'party', label: 'Party Name', type: 'select', options: partyOptions, required: true, span: 6 },
        { name: 'other_party', label: 'Other Party', type: 'select', options: partyOptions, required: true, span: 6 },
        { name: 'paid_amount', label: 'Paid Amount', type: 'number', required: true, span: 6 },
        { name: 'due_amount', label: 'Due Amount', type: 'number', required: true, span: 6 },
        { name: 'boc', label: 'BOC', type: 'checkbox', span: 6 },
        { name: 'citi', label: 'CITI', type: 'checkbox', span: 6 },
        { name: 'dbs', label: 'DBS', type: 'checkbox', span: 6 },
        { name: 'sc', label: 'SC', type: 'checkbox', span: 6 },
        { name: 'narretion', label: 'Narration', type: 'textarea', span: 24 }
    ];

    const handleProductFieldChange = (index, field, value) => {
        setFetchedProducts(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleEditClick = (record) => {
        setEditingRecord(record);
        setEditId(record.id);
        setIsEditModalOpen(true);
        setFetchedProducts([]);
    };

    const handleSaveEdit = async () => {
        try {
            const values = await editForm.validateFields();
            const payload = {
                id: editingRecord.id,
                ...values,
                boc: values.boc ? 1 : 0,
                citi: values.citi ? 1 : 0,
                dbs: values.dbs ? 1 : 0,
                sc: values.sc ? 1 : 0,
                date: values.date?.toISOString(),
                invoicedate: values.invoicedate?.toISOString(),
                duedate: values.duedate?.toISOString(),
                products: fetchedProducts,
                update: {
                    ...values,
                    date: values.date?.toISOString(),
                    invoicedate: values.invoicedate?.toISOString(),
                    duedate: values.duedate?.toISOString()
                }
            };

            updateTransaction(payload, {
                onSuccess: () => {
                    setIsEditModalOpen(false);
                    setEditId(null);
                    setFetchedProducts([]);
                    refetch();
                }
            });
        } catch (error) {
            console.error(error);
        }
    };

    // ✅ Delete Functions
    const openDelete = (record) => {
        setDeleteModal({ open: true, record });
    };

    const closeDelete = () => {
        setDeleteModal({ open: false, record: null });
    };

    const handleDelete = () => {
        if (deleteModal.record?.id) {
            deleteOutward(deleteModal.record.id, {
                onSuccess: () => {
                    refetch();
                    closeDelete();
                },
            });
        }
    };

    const handleDirectPrint = (record) => {
        setPrintData(record);

        setTimeout(() => {
            window.print();
        }, 500);
    };

    const columns = [
        { title: 'Entry No', dataIndex: 'entryno', key: 'entryno', width: 140 },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
                const colors = { sale: 'success', memo: 'warning', export: 'processing', consign: 'magenta' };
                return <Tag color={colors[type]} style={{ textTransform: 'uppercase', fontWeight: 600 }}>{type}</Tag>;
            }
        },
        { title: 'Invoice', dataIndex: 'invoiceno', key: 'invoiceno' },
        { title: 'Party', dataIndex: 'party', key: 'party', ellipsis: true },
        { title: 'Date', dataIndex: 'date', key: 'date', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        {
            title: 'Amount',
            dataIndex: 'finalAmount',
            key: 'finalAmount',
            align: 'right',
            render: (val) => <Text strong>${Number(val || 0).toLocaleString()}</Text>
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <div className={styles.actionIcons}>
                    <EditOutlined className={styles.edit} onClick={() => handleEditClick(record)} />
                    <PrinterOutlined className={styles.print} onClick={() => handleDirectPrint(record)} />
                    <DeleteOutlined className={styles.delete} onClick={() => openDelete(record)} />
                </div>
            )
        }
    ];

    const mainTableData = useMemo(() => {
        const d = outwardData?.Data || outwardData?.data;
        return Array.isArray(d) ? d : [];
    }, [outwardData]);

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [mainTableData.length, outwardLoading]);

    return (
        <div className={styles.outwardContainer}>
            <PageHeroHeader
                breadcrumb="TRANSACTION / OUTWARD"
                title="Memo Transactions"
                icon={<FileTextOutlined />}
                actions={(
                    <Button type="primary" icon={<ReloadOutlined />} onClick={() => { isFilterSelected && refetch(); }}>
                        Refresh Data
                    </Button>
                )}
            />

            <AdvancedFilterPanel
                title="Filter Memo Transactions"
                subtitle="Filter by type, party, invoice, and date range."
                activeCount={isFilterSelected ? [payload.party, payload.invoiceno, payload.type, payload.from, payload.to].filter(Boolean).length : 0}
                showSearch={false}
                showClear={false}
                extraActions={(
                    <Button
                        danger
                        onClick={() => {
                            handleClear();
                            setPayload({ party: "", invoiceno: "", type: "", page: 1, from: "", to: "" });
                        }}
                    >
                        Clear Filters
                    </Button>
                )}
            >
                <div className={filterPanelStyles.filterInlineRow}>
                    <Form
                        form={form}
                        onValuesChange={(_, all) => setPayload(p => ({
                            ...p,
                            type: all.type || "",
                            invoiceno: all.invoiceNo || "",
                            party: all.party || "",
                            from: all.date ? all.date[0].format('YYYY-MM-DD') : "",
                            to: all.date ? all.date[1].format('YYYY-MM-DD') : "",
                            page: 1
                        }))}
                    >
                        {renderFilters()}
                    </Form>
                </div>
            </AdvancedFilterPanel>

            <div className={styles.statsBar}>
                <div className={styles.legendGroup}>
                    <Text strong>Total Record: {outwardData?.total || mainTableData.length || 0}</Text>
                    {/* <Space size="small" style={{ marginLeft: '15px' }}>
                        <Badge color="#52c41a" text="GIA Certified" />
                        <Badge color="#faad14" text="On Memo" />
                        <Badge color="#f5222d" text="Send To Lab" />
                    </Space> */}
                    <Space size="small" style={{ marginLeft: '15px' }}>
                        <Tag color="green">GIA Certified</Tag>
                        <Tag color="orange">On Memo</Tag>
                        <Tag color="red">Send To Lab</Tag>
                    </Space>
                    <Checkbox style={{ marginLeft: '15px' }}>Non-GIA Only</Checkbox>
                </div>

                <div className={styles.totalsGroup}>
                    <div className={styles.statItem}><label>Total Pcs</label><span>{stats.pcs}</span></div>
                    <div className={styles.statItem}><label>Total Carats</label><span>{stats.carats.toFixed(2)}</span></div>

                    {/* --- Avg. Price calculation added back --- */}
                    <div className={styles.statItem}>
                        <label>Avg. Price</label>
                        <span>${avgPrice.toFixed(2)}</span>
                    </div>

                    <div className={styles.statItem}>
                        <label>Total Amount</label>
                        <span style={{ color: cssVar('color-error') }}>${stats.amount.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <Card variant="none" className={styles.cardContainer}>
                <div ref={tableRef} className="erp-table-container">
                <Table
                    columns={columns}
                    dataSource={mainTableData}
                    loading={outwardLoading}
                    rowKey="id"
                    className={styles.tableWrapper}
                    scroll={{ x: "max-content", y: tableHeight }}
                    expandable={{
                        expandedRowRender: (record) => <ExpandedRowContent rowId={record.id} />,
                        expandedRowClassName: () => styles.expandedRow,
                    }}
                    pagination={{
                        total: outwardData?.total || mainTableData.length || 0,
                        pageSize: 10,
                        onChange: (page) => setPayload(prev => ({ ...prev, page }))
                    }}
                    rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
                />
                </div>
            </Card>

            <BaseModal
                title={`Edit Transaction: ${editingRecord?.invoiceno || ''}`}
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditId(null); setFetchedProducts([]); }}
                onSave={handleSaveEdit}
                content={(
                    <Form form={editForm} layout="vertical">
                        <DynamicForm fields={editFields} />
                        <Title level={5} style={{ marginTop: '20px' }}>Products</Title>
                        <Table
                            loading={isProductLoading}
                            columns={[
                                { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (val, record, idx) => <Input value={val} onChange={e => handleProductFieldChange(idx, 'sku', e.target.value)} /> },
                                { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', render: (val, record, idx) => <Input type="number" value={val} onChange={e => handleProductFieldChange(idx, 'polish_pcs', e.target.value)} /> },
                                { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', render: (val, record, idx) => <Input type="number" value={val} onChange={e => handleProductFieldChange(idx, 'polish_carat', e.target.value)} /> },
                                { title: 'Price', dataIndex: 'sell_price', key: 'sell_price', render: (val, record, idx) => <Input type="number" value={val} onChange={e => handleProductFieldChange(idx, 'sell_price', e.target.value)} /> },
                            ]}
                            dataSource={fetchedProducts}
                            rowKey="id"
                            pagination={false}
                            size="small"
                        />
                    </Form>
                )}
                saveBtnText="Update"
                width={1200}
            />

            <ConfirmDeleteModal
                open={deleteModal.open}
                title="Delete Transaction"
                entityName={`Invoice: ${deleteModal.record?.invoiceno}`}
                loading={isDeleting}
                onCancel={closeDelete}
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default OutWord;