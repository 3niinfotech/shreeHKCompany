import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Table, Card, Typography, Space, Button, Tag, Checkbox, Badge, Form, Input, Row, Col, Spin } from 'antd';
import { EditOutlined, PrinterOutlined, DeleteOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { Pencil, CircleCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useFetchApi, usePostApiRequest, useDeleteApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../api/endpoints';
import { toastSuccess, toastWarning, toastApiError } from '../../utils/toastNotify';
import { fetchProductDetail } from '../../api/services/productService';
import useFiltersFormFields from "../../components/common/filters/FilterFormFields";
import { BaseModal } from "../../components/common/modals";
import DynamicForm from '../../components/common/ui/DynamicFormField';
import { ConfirmDeleteModal } from "../../components/common/modals";
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import styles from "../../assets/scss/pages/outward.module.scss";
import useTableBodyScrollHeight from "../../hooks/useTableBodyScrollHeight";
import useBranchCompanies from "../../hooks/useBranchCompanies";
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
        { staleTime: 60 * 1000, placeholderData: (prev) => prev }
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

    const { options: branchCompanies } = useBranchCompanies();
    const companyMap = useMemo(() => {
        const map = new Map();
        (branchCompanies || []).forEach((c) => {
            map.set(Number(c.value), c.name || c.label);
        });
        return map;
    }, [branchCompanies]);

    const branchCompanyOptions = useMemo(() => {
        const list = (branchCompanies || []).map((c) => ({
            label: c.label || c.name,
            value: isNaN(Number(c.value)) ? c.value : Number(c.value),
        }));
        const rawComp = editingRecord?.company;
        const currentCompId =
            rawComp != null && rawComp !== ''
                ? (isNaN(Number(rawComp)) ? rawComp : Number(rawComp))
                : null;
        if (currentCompId != null && !list.some((o) => String(o.value) === String(currentCompId))) {
            const fallbackName =
                editingRecord?.company_name ||
                companyMap.get(Number(currentCompId)) ||
                `Company #${currentCompId}`;
            list.unshift({ label: fallbackName, value: currentCompId });
        }
        return list;
    }, [branchCompanies, editingRecord, companyMap]);

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
        { staleTime: 60 * 1000 }
    );
    const { mutate: updateTransaction } = usePostApiRequest(ENDPOINTS.outward.update, 'OutwardList', { showToast: true });

    const { mutate: deleteOutward, isPending: isDeleting } = useDeleteApiRequest(ENDPOINTS.outward.delete, 'OutwardList', { queryParam: 'deleteId' });

    const isFilterSelected = useMemo(
        () => !!(payload.party || payload.invoiceno || payload.type || payload.from || payload.to),
        [payload]
    );

    const { data: outwardData, isLoading: outwardLoading, isFetching: outwardFetching, refetch } = useFetchApi(
        'OutwardList',
        ENDPOINTS.outward.list,
        payload,
        'POST',
        { enabled: true, staleTime: 60 * 1000, placeholderData: (prev) => prev }
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
            const rawComp = details.company != null && details.company !== '' ? details.company : editingRecord?.company;
            const compId = rawComp != null && rawComp !== '' && !isNaN(Number(rawComp)) ? Number(rawComp) : null;
            const resolvedCompName =
                details.company_name ||
                editingRecord?.company_name ||
                (compId ? companyMap.get(compId) : '') ||
                (typeof rawComp === 'string' && isNaN(Number(rawComp)) ? rawComp : '') ||
                editForm.getFieldValue('company') ||
                '';
            editForm.setFieldsValue({
                ...details,
                company: resolvedCompName,
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
    }, [editDetailData, editForm, editingRecord, companyMap]);

    const { form, renderFilters, handleClear } = useFiltersFormFields(['type', 'invoice', 'date', 'party'], {
        typeOptions: [
            { label: 'Out Memo (Memo)', value: 'memo' },
            { label: 'Sale', value: 'sale' },
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
    }, [outwardData, payload.page, isFilterSelected]);

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

    const editMainFields = useMemo(() => [
        { name: 'entryno', label: 'Entry', type: 'text', required: true, span: 6, disabled: true },
        { name: 'company', label: 'Company', type: 'text', span: 6, disabled: true },
        { name: 'date', label: 'Date', type: 'date', required: true, span: 6 },
        { name: 'reference', label: 'Reference', type: 'text', required: true, span: 6 },
        { name: 'invoiceno', label: 'Invoice No', type: 'text', required: true, span: 6, disabled: true },
        { name: 'invoicedate', label: 'Invoice Date', type: 'date', required: true, span: 6 },
        { name: 'terms', label: 'Terms', type: 'text', required: true, span: 6 },
        { name: 'duedate', label: 'Due Date', type: 'date', required: true, span: 6 },
        { name: 'party', label: 'Party Name', type: 'select', options: partyOptions, required: true, span: 6 },
        { name: 'other_party', label: 'Other Party', type: 'select', options: partyOptions, required: true, span: 6 },
        { name: 'paid_amount', label: 'Paid Amount', type: 'number', required: true, span: 6 },
        { name: 'due_amount', label: 'Due Amount', type: 'number', required: true, span: 6 },
    ], [branchCompanyOptions, partyOptions]);

    const skuLookupDebounceTimers = useRef({});
    const fetchedProductsRef = useRef(fetchedProducts);
    useEffect(() => {
        fetchedProductsRef.current = fetchedProducts;
    }, [fetchedProducts]);

    const handleSkuLookup = useCallback(async (index, rawSku, isSilent = false) => {
        const trimmed = String(rawSku || '').trim();
        if (!trimmed) return;

        if (skuLookupDebounceTimers.current[index]) {
            clearTimeout(skuLookupDebounceTimers.current[index]);
            delete skuLookupDebounceTimers.current[index];
        }

        const currentRows = fetchedProductsRef.current || [];
        const currentRow = currentRows[index];

        // If row already has this exact SKU and valid ID loaded, skip re-fetching
        if (currentRow?.id && String(currentRow.sku || '').trim().toUpperCase() === trimmed.toUpperCase()) {
            return;
        }

        // Check duplicate in same transaction
        const isDuplicate = currentRows.some(
            (r, i) => i !== index && String(r.sku || '').trim().toUpperCase() === trimmed.toUpperCase()
        );
        if (isDuplicate) {
            if (!isSilent) {
                toastWarning(`SKU "${trimmed}" is already added in this transaction`);
            }
            return;
        }

        try {
            const data = await fetchProductDetail({ id: trimmed, by: 'p.sku' });
            const p = data?.Data;
            if (!p?.id) {
                if (!isSilent) {
                    toastWarning(`SKU "${trimmed}" not found in database`);
                }
                return;
            }

            const price = Number(p.sell_price) === 0 || p.sell_price == null
                ? (p.purchase_price ?? p.price ?? 0)
                : p.sell_price;
            const carat = Number(p.polish_carat ?? p.purchase_carat ?? 0);
            const pcs = p.polish_pcs ?? p.purchase_pcs ?? 1;
            const amount = Number(p.sell_amount) === 0 || p.sell_amount == null
                ? ((carat * Number(price || 0)) || (p.purchase_amount ?? p.amount ?? 0))
                : p.sell_amount;
            const formattedAmount = Number(amount || 0).toFixed(2);
            const cost = p.cost ?? p.purchase_price ?? "";

            setFetchedProducts((prev) => {
                if (!prev[index]) return prev;
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    id: p.id,
                    product_id: p.id,
                    productId: p.id,
                    mfg_code: p.mfg_code ?? "",
                    diamond_no: p.diamond_no ?? p.d_no ?? "",
                    sku: p.sku || trimmed,
                    polish_pcs: pcs,
                    polish_carat: carat,
                    cost: cost,
                    sell_price: price || "",
                    price: price || "",
                    sell_amount: formattedAmount,
                    amount: formattedAmount,
                    location: p.location ?? p.loc ?? "",
                    remark: p.remark ?? "",
                    lab: p.lab ?? "",
                    group_type: p.group_type ?? p.groupType ?? "",
                    report_no: p.report_no ?? p.certificate ?? "",
                    shape: p.shape ?? "",
                    clarity: p.clarity ?? "",
                    intensity: p.intensity ?? "",
                    overtone: p.overtone ?? "",
                    color: p.color ?? p.main_color ?? "",
                };
                return updated;
            });

            toastSuccess(`SKU "${p.sku || trimmed}" details auto-filled`);
        } catch (err) {
            if (err?.response?.status === 404) {
                if (!isSilent) {
                    toastWarning(`SKU "${trimmed}" not found in database`);
                }
                return;
            }
            if (!isSilent) {
                toastApiError(err);
            }
        }
    }, []);

    const handleProductFieldChange = (index, field, value) => {
        setFetchedProducts(prev => {
            const updated = [...prev];
            const row = { ...updated[index], [field]: value };
            if (field === "sell_price" || field === "polish_carat") {
                const price = Number(field === "sell_price" ? value : row.sell_price ?? row.price) || 0;
                const carat = Number(field === "polish_carat" ? value : row.polish_carat) || 0;
                row.sell_amount = (price * carat).toFixed(2);
                row.amount = row.sell_amount;
            }
            updated[index] = row;
            return updated;
        });

        if (field === "sku") {
            const trimmed = String(value || "").trim();
            if (skuLookupDebounceTimers.current[index]) {
                clearTimeout(skuLookupDebounceTimers.current[index]);
            }
            if (trimmed.length >= 2) {
                skuLookupDebounceTimers.current[index] = setTimeout(() => {
                    handleSkuLookup(index, trimmed, true);
                }, 500);
            }
        }
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
        if (skuLookupDebounceTimers.current[index]) {
            clearTimeout(skuLookupDebounceTimers.current[index]);
            delete skuLookupDebounceTimers.current[index];
        }
        setFetchedProducts((prev) => prev.filter((_, i) => i !== index));
    };

    const handleEditClick = (record) => {
        setEditingRecord(record);
        setEditId(record.id);
        setIsEditModalOpen(true);
        setFetchedProducts([]);
        const rawComp = record?.company;
        const compId = rawComp != null && rawComp !== '' && !isNaN(Number(rawComp)) ? Number(rawComp) : null;
        const resolvedCompName =
            record?.company_name ||
            (compId ? companyMap.get(compId) : '') ||
            (typeof rawComp === 'string' && isNaN(Number(rawComp)) ? rawComp : '') ||
            '';
        editForm.setFieldsValue({
            ...record,
            company: resolvedCompName,
            date: record.date ? dayjs(record.date) : null,
            invoicedate: record.invoicedate ? dayjs(record.invoicedate) : null,
            duedate: record.duedate ? dayjs(record.duedate) : null,
            party: record.party != null ? String(record.party) : undefined,
            other_party: record.other_party != null ? String(record.other_party) : undefined,
        });
    };

    useEffect(() => {
        if (!isEditModalOpen || !editingRecord) return;
        const currentVal = editForm.getFieldValue('company');
        const rawComp = editingRecord?.company;
        const compId = rawComp != null && rawComp !== '' && !isNaN(Number(rawComp)) ? Number(rawComp) : null;
        const compName =
            editingRecord?.company_name ||
            (compId ? companyMap.get(compId) : '') ||
            (typeof rawComp === 'string' && isNaN(Number(rawComp)) ? rawComp : '') ||
            '';
        if (!currentVal && compName) {
            editForm.setFieldsValue({ company: compName });
        }
    }, [isEditModalOpen, editingRecord, companyMap, editForm]);

    const handleSaveEdit = async () => {
        try {
            const values = await editForm.validateFields();
            const formattedDate = values.date?.format ? values.date.format('YYYY-MM-DD') : (values.date ? dayjs(values.date).format('YYYY-MM-DD') : null);
            const formattedInvoiceDate = values.invoicedate?.format ? values.invoicedate.format('YYYY-MM-DD') : (values.invoicedate ? dayjs(values.invoicedate).format('YYYY-MM-DD') : null);
            const formattedDueDate = values.duedate?.format ? values.duedate.format('YYYY-MM-DD') : (values.duedate ? dayjs(values.duedate).format('YYYY-MM-DD') : null);

            const originalCompanyId =
                editingRecord?.company != null && editingRecord?.company !== ''
                    ? (isNaN(Number(editingRecord.company)) ? editingRecord.company : Number(editingRecord.company))
                    : undefined;

            const payload = {
                id: editingRecord.id,
                ...values,
                ...(originalCompanyId != null ? { company: originalCompanyId } : {}),
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
                    ...(originalCompanyId != null ? { company: originalCompanyId } : {}),
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
                const colors = { sale: 'success', memo: 'warning', export: 'processing', consign: 'magenta' };
                return <Tag color={colors[type] || 'default'} style={{ textTransform: 'uppercase', fontWeight: 600 }}>{type}</Tag>;
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
                        <Button type="primary" icon={<ReloadOutlined />} loading={(outwardLoading || outwardFetching) && payload.page === 1} onClick={() => {
                            setHasMore(true);
                            if (payload.page === 1) {
                                refetch();
                            } else {
                                setPayload(prev => ({ ...prev, page: 1 }));
                            }
                        }}>
                            Refresh Data
                        </Button>
                        <Button
                            danger
                            onClick={() => {
                                handleClear();
                                setHasMore(true);
                                setSelectedRowKeys([]);
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
                        loading={(outwardLoading || outwardFetching) && payload.page === 1}
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
                                            Total Record: {isFilterSelected ? (outwardData?.total || mainTableData.length || 0) : 0}
                                            {isFilterSelected && mainTableData.length > 0 && ` | showing: ${mainTableData.length}`}
                                        </Text>
                                        <Space size="small" style={{ marginLeft: '15px' }}>
                                            <Tag color="blue">GIA Certified</Tag>
                                            <Tag color="warning">On Memo</Tag>
                                            <Tag color="blue">Send To Lab</Tag>
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
                title={editingRecord?.type ? `Edit Outward (${String(editingRecord.type).toUpperCase()})` : "Edit Outward"}
                subtitle={`${editingRecord?.invoiceno || (editingRecord?.entryno ? `#${editingRecord.entryno}` : (editingRecord?.id ? `#${editingRecord.id}` : ''))}${editingRecord?.company ? ` • ${editingRecord?.company_name || companyMap.get(Number(editingRecord.company)) || `Company #${editingRecord.company}`}` : ''}`}
                variant="edit"
                headerIcon={<Pencil size={16} strokeWidth={2} />}
                saveIcon={<CircleCheck size={15} strokeWidth={2.25} />}
                isOpen={isEditModalOpen}
                onClose={() => {
                    Object.values(skuLookupDebounceTimers.current).forEach(clearTimeout);
                    skuLookupDebounceTimers.current = {};
                    setIsEditModalOpen(false);
                    setEditId(null);
                    setFetchedProducts([]);
                }}
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
                              color: var(--color-text, #0f172a) !important;
                              -webkit-text-fill-color: var(--color-text, #0f172a) !important;
                              opacity: 1 !important;
                            }
                            [data-theme='dark'] .edit-modal-form-readable .ant-input-disabled,
                            [data-theme='dark'] .edit-modal-form-readable .ant-input[disabled],
                            [data-theme='dark'] .edit-modal-form-readable .ant-input-number-disabled .ant-input-number-input,
                            [data-theme='dark'] .edit-modal-form-readable .ant-input-number-disabled input,
                            [data-theme='dark'] .edit-modal-form-readable .ant-select-disabled .ant-select-selection-item,
                            [data-theme='dark'] .edit-modal-form-readable .ant-picker-disabled input,
                            [data-theme='dark'] .edit-modal-form-readable .ant-picker-input > input[disabled],
                            [data-theme='dark'] .edit-modal-form-readable textarea.ant-input-disabled {
                              color: #e2e8f0 !important;
                              -webkit-text-fill-color: #e2e8f0 !important;
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
                                        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, fixed: 'left', render: (val, _r, idx) => <Input value={val} className={styles.stockEditCellInput} onChange={(e) => handleProductFieldChange(idx, 'sku', e.target.value)} onBlur={(e) => handleSkuLookup(idx, e.target.value, false)} onPressEnter={(e) => handleSkuLookup(idx, e.target.value, false)} /> },
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