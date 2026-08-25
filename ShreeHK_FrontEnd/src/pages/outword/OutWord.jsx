import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Card, Typography, Space, Button, Tag, Checkbox, Badge, Form, Input, Row, Col, Spin } from 'antd';
import { EditOutlined, PrinterOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { Pencil, CircleCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import useFiltersFormFields from "../../hooks/useFiltersFormFields";
import { BaseModal } from "../../components/common/modals";
import DynamicForm from '../../hooks/DynamicFormField';
import { ConfirmDeleteModal } from "../../components/common/modals";
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import styles from "../../assets/scss/pages/outward.module.scss";
import useTableBodyScrollHeight from "../../hooks/useTableBodyScrollHeight";
import { cssVar } from '../../theme';
import { SkuLink } from '../../hooks/useSkuModalAction';
import '../../assets/scss/masterEdit.scss';

const { Title, Text } = Typography;
const LIMIT = 100;

const ExpandedRowContent = ({ rowId }) => {
    const { data: productData, isLoading } = useFetchApi(
        ['RowProducts', rowId],
        ENDPOINTS.outward.getProducts,
        { id: rowId },
        'POST'
    );

    const innerColumns = [
        { title: 'Type', dataIndex: 'group_type', key: 'group_type', width: 120, render: (v) => v?.toUpperCase() || '-' },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, render: (text, record) => <SkuLink sku={text} record={record} /> },
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
        if (!productData) return [];
        if (Array.isArray(productData)) return productData;
        const d = productData.products || productData.Data || productData.data;
        return Array.isArray(d) ? d : [];
    }, [productData]);

    return (
        <div className={styles.innerTableWrap}>
            <Table
                columns={innerColumns}
                dataSource={innerData}
                pagination={false}
                size="small"
                rowKey={(row) => row.id ?? row.product_id ?? row.pid}
                loading={isLoading}
                className={styles.innerTable}
                tableLayout="fixed"
                scroll={{ x: 1300 }}
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
        party: "", invoiceno: "", type: "", page: 1, limit: LIMIT, from: "", to: ""
    });
    const [mainTableData, setMainTableData] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: updateTransaction } = usePostApiRequest(ENDPOINTS.outward.update, 'OutwardList', { showToast: true });

    const { mutate: deleteOutward, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.outward.delete, 'OutwardList');

    const isFilterSelected = useMemo(() => !!(payload.party || payload.invoiceno || payload.type || payload.from || payload.to), [payload]);

    const { data: outwardData, isLoading: outwardLoading, isFetching: outwardFetching, refetch } = useFetchApi(
        ['OutwardList', payload.page, payload.party, payload.invoiceno, payload.type, payload.from, payload.to],
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
        showLabels: false,
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
            limit: LIMIT,
            from: "",
            to: "",
        });
        setSearchParams({}, { replace: true });
    }, [searchParams, form, setSearchParams]);

    useEffect(() => {
        if (!outwardData) return;
        const d = outwardData?.Data || outwardData?.data;
        const newRecords = Array.isArray(d) ? d : [];
        const total = outwardData?.total || 0;

        if (payload.page === 1) {
            setMainTableData(newRecords);
            setHasMore(newRecords.length >= LIMIT && (total === 0 || newRecords.length < total));
        } else {
            if (newRecords.length > 0) {
                setMainTableData(prev => {
                    const existingIds = new Set(prev.map(item => item.id));
                    const filtered = newRecords.filter(item => !existingIds.has(item.id));
                    const updated = [...prev, ...filtered];
                    if (updated.length >= total || newRecords.length < LIMIT) {
                        setHasMore(false);
                    }
                    return updated;
                });
            } else {
                setHasMore(false);
            }
        }
        setIsFetchingMore(false);
    }, [outwardData]);

    useEffect(() => {
        const tableBody = tableRef.current?.querySelector('.ant-table-body');
        if (!tableBody) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = tableBody;
            if (
                scrollHeight - scrollTop <= clientHeight + 80 &&
                !outwardLoading &&
                !outwardFetching &&
                !isFetchingMore &&
                hasMore
            ) {
                setIsFetchingMore(true);
                setPayload(prev => ({ ...prev, page: prev.page + 1 }));
            }
        };

        tableBody.addEventListener('scroll', handleScroll);
        return () => tableBody.removeEventListener('scroll', handleScroll);
    }, [outwardLoading, outwardFetching, isFetchingMore, hasMore]);

    const stats = useMemo(() => {
        return mainTableData.reduce((acc, curr) => ({
            pcs: acc.pcs + (Number(curr.totalPcs) || 0),
            carats: acc.carats + (Number(curr.totalCarat) || 0),
            amount: acc.amount + (Number(curr.finalAmount) || 0)
        }), { pcs: 0, carats: 0, amount: 0 });
    }, [mainTableData]);

    const avgPrice = stats.carats > 0 ? stats.amount / stats.carats : 0;

    const editMainFields = [
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
                const colors = { sale: 'success', memo: 'red', export: '#8B5CF6', consign: '#F59E0B' };
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

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [mainTableData.length, outwardLoading]);

    return (
        <div className={`${styles.outwardContainer} ${styles.outwardListPage}`}>
            {/* <PageHeroHeader
                breadcrumb="TRANSACTION / OUTWARD"
                title="Memo Transactions"
                icon={<FileTextOutlined />}
                actions={(
                    <Button type="primary" icon={<ReloadOutlined />} onClick={() => { isFilterSelected && refetch(); }}>
                        Refresh Data
                    </Button>
                )}
            /> */}

            <AdvancedFilterPanel
                title="Memo Transactions"
                // subtitle="Filter by type, party, invoice, and date range."
                activeCount={isFilterSelected ? [payload.party, payload.invoiceno, payload.type, payload.from, payload.to].filter(Boolean).length : 0}
                showSearch={false}
                showClear={false}
                extraActions={(

                    <Space>
                        <Checkbox style={{ marginLeft: '15px' }}>Non-GIA Only</Checkbox>
                        <Button type="primary" icon={<ReloadOutlined />} onClick={() => {
                            if (isFilterSelected) {
                                setHasMore(true);
                                if (payload.page === 1) {
                                    refetch();
                                } else {
                                    setPayload(prev => ({ ...prev, page: 1 }));
                                }
                            }
                        }}>
                            Refresh Data
                        </Button>
                        <Button
                            danger
                            onClick={() => {
                                handleClear();
                                setHasMore(true);
                                setPayload({ party: "", invoiceno: "", type: "", page: 1, limit: LIMIT, from: "", to: "" });
                            }}
                        >
                            Clear Filters
                        </Button>
                    </Space>
                )}
            >
                <div className={filterPanelStyles.filterInlineRow}>
                    <Form
                        form={form}
                        onValuesChange={(_, all) => {
                            setHasMore(true);
                            setPayload(p => ({
                                ...p,
                                type: all.type || "",
                                invoiceno: all.invoiceNo || "",
                                party: all.party || "",
                                from: all.date ? all.date[0].format('YYYY-MM-DD') : "",
                                to: all.date ? all.date[1].format('YYYY-MM-DD') : "",
                                page: 1
                            }));
                        }}
                    >
                        {renderFilters()}
                    </Form>
                </div>
            </AdvancedFilterPanel>

            <Card variant="none" className={styles.cardContainer}>
                <div
                    ref={tableRef}
                    className={`erp-table-container ${styles.fixedHeightTable}`}
                    style={{ ['--table-scroll-y']: `${tableHeight}px` }}
                >
                    <Table
                        columns={columns}
                        dataSource={mainTableData}
                        loading={outwardLoading && payload.page === 1}
                        rowKey="id"
                        className={styles.tableWrapper}
                        scroll={{ x: "max-content", y: tableHeight }}
                        expandable={{
                            expandedRowRender: (record) => <ExpandedRowContent rowId={record.id} />,
                            expandedRowClassName: () => styles.expandedRow,
                        }}
                        pagination={false}
                        rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
                        footer={() => (
                            <div className={styles.statsBarFooter}>
                                <div className={styles.statsBar}>
                                    <div className={styles.legendGroup}>
                                        <Text strong>
                                            Total Record: {outwardData?.total || mainTableData.length || 0}
                                            {mainTableData.length > 0 && ` | showing: ${mainTableData.length}`}
                                        </Text>
                                        <Space size="small" style={{ marginLeft: '15px' }}>
                                            <Tag color="blue">GIA Certified</Tag>
                                            <Tag color="red">On Memo</Tag>
                                            <Tag color="green">Send To Lab</Tag>
                                        </Space>
                                    </div>

                                    <div className={styles.totalsGroup}>
                                        <div className={styles.statItem}><label>Total Pcs</label><span>{stats.pcs}</span></div>
                                        <div className={styles.statItem}><label>Total Carats</label><span>{stats.carats.toFixed(2)}</span></div>
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
                                {(isFetchingMore || outwardFetching) && (
                                    <div style={{ textAlign: 'center', padding: '6px 0', fontSize: '13px', color: '#666' }}>
                                        <Spin size="small" /> <span style={{ marginLeft: '6px' }}>Loading more records...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    />
                </div>
            </Card>

            <BaseModal
                title="Edit"
                subtitle={editingRecord?.invoiceno || ''}
                variant="edit"
                headerIcon={<Pencil size={16} strokeWidth={2} />}
                saveIcon={<CircleCheck size={15} strokeWidth={2.25} />}
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); setEditId(null); setFetchedProducts([]); }}
                onSave={handleSaveEdit}
                className={styles.stockEditModal}
                content={(
                    <>
                        <style>{`
                            .edit-modal-form-readable .ant-input-disabled,
                            .edit-modal-form-readable .ant-input[disabled],
                            .edit-modal-form-readable .ant-input-number-disabled .ant-input-number-input,
                            .edit-modal-form-readable .ant-input-number-disabled input,
                            .edit-modal-form-readable .ant-select-disabled .ant-select-selection-item,
                            .edit-modal-form-readable .ant-picker-disabled input,
                            .edit-modal-form-readable .ant-picker-input > input[disabled],
                            .edit-modal-form-readable textarea.ant-input-disabled {
                              color: #000 !important;
                              -webkit-text-fill-color: #000 !important;
                              opacity: 1 !important;
                            }
                        `}</style>
                        <Form form={editForm} layout="vertical" className={`edit-modal-form-readable ${styles.stockEditForm}`}>
                            <DynamicForm fields={editMainFields} />
                            <Row gutter={[16, 0]} className={styles.stockEditPayRow}>
                                <Col span={18}>
                                    <Form.Item name="narretion" label="Narration">
                                        <Input.TextArea rows={1} placeholder="Enter Narration..." />
                                    </Form.Item>
                                </Col>
                                <Col span={6}>
                                    <Form.Item
                                        label={<span className={styles.stockEditBankLabel}>Due Amount</span>}
                                        colon={false}
                                    >
                                        <div className={styles.stockEditBankSlot}>
                                            <Form.Item name="boc" valuePropName="checked" noStyle>
                                                <Checkbox>BOC</Checkbox>
                                            </Form.Item>
                                            <Form.Item name="citi" valuePropName="checked" noStyle>
                                                <Checkbox>CITI</Checkbox>
                                            </Form.Item>
                                            <Form.Item name="dbs" valuePropName="checked" noStyle>
                                                <Checkbox>DBS</Checkbox>
                                            </Form.Item>
                                            <Form.Item name="sc" valuePropName="checked" noStyle>
                                                <Checkbox>SC</Checkbox>
                                            </Form.Item>
                                        </div>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <div className={styles.stockEditProductsHead}>Products</div>
                            <Table
                                className={styles.stockEditProductTable}
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
                                scroll={{ x: 600, y: 220 }}
                            />
                        </Form>
                    </>
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