import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Card, Typography, Space, Button, Tag, Checkbox, Badge, Form, Input, Row, Col, Spin } from 'antd';
import { EditOutlined, PrinterOutlined, DeleteOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Pencil, CircleCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../api/endpoints';
import useFiltersFormFields from "../../components/common/filters/FilterFormFields";
import { BaseModal } from "../../components/common/modals";
import DynamicForm from '../../components/common/ui/DynamicFormField';
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
        'RowProducts',
        ENDPOINTS.outward.getProducts,
        { id: rowId },
        'POST',
        { staleTime: 0, refetchOnMount: 'always' }
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
    const [printData, setPrintData] = useState(null);
    const [editForm] = Form.useForm();

    const [payload, setPayload] = useState({
        party: "", invoiceno: "", type: "", page: 1, limit: LIMIT, from: "", to: ""
    });
    const [mainTableData, setMainTableData] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const queryClient = useQueryClient();
    const { data: companyData, isLoading: isCompanyLoading, refetch: refetchCompanyOptions } = useFetchApi(
        'GetCompany',
        ENDPOINTS.company.options,
        {},
        'GET',
        { staleTime: 0, refetchOnMount: 'always' }
    );
    const { mutate: updateTransaction } = usePostApiRequest(ENDPOINTS.outward.update, 'OutwardList', { showToast: true });

    const { mutate: deleteOutward, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.outward.delete, 'OutwardList', { queryParam: 'deleteId' });

    const isFilterSelected = useMemo(() => !!(payload.party || payload.invoiceno || payload.type || payload.from || payload.to), [payload]);

    const { data: outwardData, isLoading: outwardLoading, isFetching: outwardFetching } = useFetchApi(
        'OutwardList',
        ENDPOINTS.outward.list,
        payload,
        'POST',
        { enabled: isFilterSelected }
    );

    const { data: editDetailData, isLoading: isProductLoading } = useFetchApi(
        'EditDetails',
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
        onPartyDropdownVisibleChange: (open) => {
            if (open) refetchCompanyOptions();
        },
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
                    const incomingMap = new Map(newRecords.map(item => [item.id, item]));
                    const updatedPrev = prev.map(item => incomingMap.get(item.id) || item);
                    const prevIds = new Set(prev.map(item => item.id));
                    const brandNew = newRecords.filter(item => !prevIds.has(item.id));
                    const updated = [...updatedPrev, ...brandNew];
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
    }, [outwardData, payload.page]);

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

    const editProductTotals = useMemo(() => {
        let pcs = 0;
        let carat = 0;
        let amount = 0;
        let priceSum = 0;
        let priceCount = 0;
        fetchedProducts.forEach((p) => {
            pcs += Number(p.polish_pcs) || 0;
            carat += Number(p.polish_carat) || 0;
            amount += Number(p.sell_amount ?? p.amount) || 0;
            const price = Number(p.sell_price ?? p.price);
            if (!Number.isNaN(price) && price !== 0) {
                priceSum += price;
                priceCount += 1;
            }
        });
        return {
            pcs,
            carat,
            amount,
            price: priceCount ? priceSum / priceCount : (carat > 0 ? amount / carat : 0),
        };
    }, [fetchedProducts]);

    const handleAddProductRow = () => {
        setFetchedProducts((prev) => [
            ...prev,
            {
                _tempId: `new-${Date.now()}-${prev.length}`,
                mfg_code: "",
                diamond_no: "",
                sku: "",
                polish_pcs: "",
                polish_carat: "",
                cost: "",
                sell_price: "",
                sell_amount: "",
                location: "",
                remark: "",
                lab: "",
                group_type: "",
                report_no: "",
                shape: "",
                clarity: "",
                intensity: "",
                overtone: "",
                color: "",
            },
        ]);
    };

    const handleRemoveProductRow = (index) => {
        setFetchedProducts((prev) => prev.filter((_, i) => i !== index));
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
            const formattedDate = values.date?.format ? values.date.format('YYYY-MM-DD') : (values.date ? dayjs(values.date).format('YYYY-MM-DD') : null);
            const formattedInvoiceDate = values.invoicedate?.format ? values.invoicedate.format('YYYY-MM-DD') : (values.invoicedate ? dayjs(values.invoicedate).format('YYYY-MM-DD') : null);
            const formattedDueDate = values.duedate?.format ? values.duedate.format('YYYY-MM-DD') : (values.duedate ? dayjs(values.duedate).format('YYYY-MM-DD') : null);

            const payload = {
                id: editingRecord.id,
                ...values,
                type: values.type || editingRecord?.type,
                boc: values.boc ? 1 : 0,
                citi: values.citi ? 1 : 0,
                dbs: values.dbs ? 1 : 0,
                sc: values.sc ? 1 : 0,
                date: formattedDate,
                invoicedate: formattedInvoiceDate,
                duedate: formattedDueDate,
                products: fetchedProducts,
                update: {
                    ...values,
                    type: values.type || editingRecord?.type,
                    date: formattedDate,
                    invoicedate: formattedInvoiceDate,
                    duedate: formattedDueDate,
                }
            };

            updateTransaction(payload, {
                onSuccess: (res) => {
                    if (res?.status === false) return;
                    setIsEditModalOpen(false);
                    setEditId(null);
                    setFetchedProducts([]);
                    queryClient.invalidateQueries({ queryKey: ['RowProducts'] });
                    queryClient.invalidateQueries({ queryKey: ['EditDetails'] });
                    queryClient.invalidateQueries({ queryKey: ['GetProductData'] });
                    queryClient.invalidateQueries({ queryKey: ['myInventorySummary'] });
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
        const recordId = deleteModal.record?.id;
        if (!recordId) return;
        deleteOutward(recordId, {
            onSuccess: (data) => {
                if (data?.status !== false) {
                    setMainTableData((prev) => prev.filter((item) => item.id !== recordId));
                }
                queryClient.invalidateQueries({ queryKey: ['GetProductData'] });
                queryClient.invalidateQueries({ queryKey: ['myInventorySummary'] });
                closeDelete();
            },
        });
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
                                <Col span={24}>
                                    <Form.Item
                                        label={<span className={styles.stockEditBankLabel}>Bank</span>}
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
                            <div className={styles.stockEditProductsHead}>
                                <span>Products</span>
                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    className={styles.stockEditAddProductBtn}
                                    onClick={handleAddProductRow}
                                >
                                    Add New Data
                                </Button>
                            </div>
                            <div className={styles.stockEditProductWrap}>
                                <Table
                                    className={styles.stockEditProductTable}
                                    loading={isProductLoading}
                                    columns={[
                                        { title: 'No', key: 'no', width: 50, fixed: 'left', align: 'center', render: (_v, _r, idx) => idx + 1 },
                                        { title: 'Mfg. code', dataIndex: 'mfg_code', key: 'mfg_code', width: 100, fixed: 'left', render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'mfg_code', e.target.value)} /> },
                                        { title: 'D. No.', dataIndex: 'diamond_no', key: 'diamond_no', width: 90, fixed: 'left', render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'diamond_no', e.target.value)} /> },
                                        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, fixed: 'left', render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'sku', e.target.value)} /> },
                                        { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 80, render: (val, _r, idx) => <Input type="number" value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'polish_pcs', e.target.value)} /> },
                                        { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 90, render: (val, _r, idx) => <Input type="number" value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'polish_carat', e.target.value)} /> },
                                        { title: 'Cost', dataIndex: 'cost', key: 'cost', width: 90, render: (val, _r, idx) => <Input type="number" value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'cost', e.target.value)} /> },
                                        { title: 'Price', dataIndex: 'sell_price', key: 'sell_price', width: 90, render: (val, _r, idx) => <Input type="number" value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'sell_price', e.target.value)} /> },
                                        { title: 'Amount', dataIndex: 'sell_amount', key: 'sell_amount', width: 100, render: (val, _r, idx) => <Input type="number" value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'sell_amount', e.target.value)} /> },
                                        { title: 'LOC', dataIndex: 'location', key: 'location', width: 90, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'location', e.target.value)} /> },
                                        { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 120, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'remark', e.target.value)} /> },
                                        { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 80, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'lab', e.target.value)} /> },
                                        { title: 'Group Type', dataIndex: 'group_type', key: 'group_type', width: 100, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'group_type', e.target.value)} /> },
                                        { title: 'Report No.', dataIndex: 'report_no', key: 'report_no', width: 110, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'report_no', e.target.value)} /> },
                                        { title: 'Shape', dataIndex: 'shape', key: 'shape', width: 90, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'shape', e.target.value)} /> },
                                        { title: 'Clarity', dataIndex: 'clarity', key: 'clarity', width: 90, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'clarity', e.target.value)} /> },
                                        { title: 'Intensity', dataIndex: 'intensity', key: 'intensity', width: 90, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'intensity', e.target.value)} /> },
                                        { title: 'Overtone', dataIndex: 'overtone', key: 'overtone', width: 90, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'overtone', e.target.value)} /> },
                                        { title: 'Color', dataIndex: 'color', key: 'color', width: 80, render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'color', e.target.value)} /> },
                                        {
                                            title: '',
                                            key: 'action',
                                            width: 48,
                                            fixed: 'right',
                                            align: 'center',
                                            render: (_val, _record, idx) => (
                                                <Button
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => handleRemoveProductRow(idx)}
                                                    aria-label="Remove row"
                                                />
                                            ),
                                        },
                                    ]}
                                    dataSource={fetchedProducts}
                                    rowKey={(r) => r.id ?? r._tempId}
                                    pagination={false}
                                    size="small"
                                    scroll={{ x: 1900, y: 192 }}
                                    locale={{ emptyText: 'No products — click Add New Data' }}
                                />
                                {fetchedProducts.length > 0 ? (
                                    <div className={styles.stockEditTotalsBar}>
                                        <div className={styles.stockEditTotalsMetrics}>
                                            <span>Pcs : <b>{editProductTotals.pcs}</b></span>
                                            <span>Carats : <b>{editProductTotals.carat.toFixed(3)}</b></span>
                                            <span>Price : <b>{editProductTotals.price.toFixed(2)}</b></span>
                                            <span>Amount : <b>{editProductTotals.amount.toFixed(2)}</b></span>
                                        </div>
                                        <Form.Item name="narretion" label="Narration" className={styles.stockEditTotalsNarration}>
                                            <Input placeholder="Narration..." />
                                        </Form.Item>
                                    </div>
                                ) : null}
                            </div>
                        </Form>
                    </>
                )}
                saveBtnText="Update"
                width={1280}
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