import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Table, Card, Typography, Space, Button, Tag, Checkbox, Select, Input, InputNumber, Empty, Form, Spin, Tooltip, DatePicker, Dropdown, Row, Col } from 'antd';
import {
  EditOutlined,
  PrinterOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlusOutlined,
  TeamOutlined,
  RollbackOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  ExportOutlined,
  ImportOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toastApiSuccess, toastApiError } from '../../../utils/apiToast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useFetchApi, useDeleteApiRequest, usePostApiRequest } from '../../../api/ApiFunction';
import { api } from '../../../api/axiosInstance';
import { ENDPOINTS } from '../../../constants/endpoints';
import { ConfirmDeleteModal, BaseModal } from '../../../components/common/modals';
import DynamicForm from '../../../hooks/DynamicFormField';
import GiaReturnModal from '../../../components/transaction/stock/GiaReturnModal';
import TransactionInvoicePreviewModal from '../../../components/transaction/invoice/TransactionInvoicePreviewModal';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../../components/common/filters/AdvancedFilterPanel';
import PageHeroHeader from '../../../components/common/PageHeroHeader';
import { FileTextOutlined } from '@ant-design/icons';
import useAuthStore from '../../../store/Auth.Store';
import useTableBodyScrollHeight from '../../../hooks/useTableBodyScrollHeight';
import useTableSkeleton from '../../../components/common/skeleton/useTableSkeleton';
import { SkeletonForm } from '../../../components/common/skeleton';
import { Pencil, CircleCheck } from 'lucide-react';
import { cssVar } from '../../../theme';
import styles from '../../../assets/scss/pages/outward.module.scss';
import { SkuLink } from '../../../hooks/useSkuModalAction';
import { resolveCompanyLogoUrl } from '../../../utils/companyLogo';
import '../../../assets/scss/masterEdit.scss';

const { Text } = Typography;

const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const SCROLL_LIMIT = 20;

const defaultProductColumns = [
  { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, render: (text, record) => <SkuLink sku={text} record={record} /> },
  { title: 'Mfg. Code', dataIndex: 'mfg_code', key: 'mfg_code', width: 110 },
  { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 70, align: 'center' },
  { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 90, align: 'center' },
  { title: 'Cost', dataIndex: 'cost', key: 'cost', width: 90, align: 'right', render: (v) => v || '-' },
  { title: 'Price', dataIndex: 'price', key: 'price', width: 90, align: 'right', render: (v) => v || '-' },
  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 100, align: 'right', render: (v) => <Text strong>{v || 0}</Text> },
  { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 80 },
  { title: 'LOC', dataIndex: 'location', key: 'location', width: 80 },
  { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 120, ellipsis: true },
];

const typeColors = {
  memo: 'warning',
  consign: 'magenta',
  sale: 'success',
  export: 'processing',
  lab: 'blue',
  purchase: 'purple',
  import: 'cyan',
};

const TransactionStockTemplate = ({
  title,
  queryKey,
  listEndpoint,
  listPayload = {},
  stockType,
  actions = {},
  entryPath,
  productColumns = defaultProductColumns,
  deleteEndpoint,
  deleteQueryKey,
  invoiceTitle = 'Purchase Invoice',
  infiniteScroll = false,
  typeFilterOptions = [],
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyName = useAuthStore((s) => s.companyName);
  const companyLogo = useAuthStore((s) => s.companyLogo);
  const [party, setParty] = useState('');
  const [invoice, setInvoice] = useState(() => (searchParams.get('invoice') || '').trim());
  const [filterType, setFilterType] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [offset, setOffset] = useState(0);
  const [allGroups, setAllGroups] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [scrollFetching, setScrollFetching] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, record: null });
  const [invoiceModal, setInvoiceModal] = useState({ open: false, record: null });
  const [giaReturnModal, setGiaReturnModal] = useState({ open: false, record: null, productIds: [] });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [fetchedProducts, setFetchedProducts] = useState([]);
  const [originalSproducts, setOriginalSproducts] = useState('');
  const [editForm] = Form.useForm();
  const tableRef = useRef(null);

  const listLimit = infiniteScroll ? SCROLL_LIMIT : pageSize;
  const listStart = infiniteScroll ? offset : (page - 1) * pageSize;

  const payload = useMemo(() => ({
    party: party || '',
    invoice: invoice || '',
    invoiceno: invoice || '',
    page: infiniteScroll ? Math.floor(listStart / listLimit) + 1 : page,
    limit: listLimit,
    start: listStart,
    ...listPayload,
    ...(stockType ? { stockType } : {}),
    ...(filterType ? { type: filterType } : {}),
    ...(fromDate ? { fromDate: dayjs(fromDate).format('YYYY-MM-DD') } : {}),
    ...(toDate ? { toDate: dayjs(toDate).format('YYYY-MM-DD') } : {}),
  }), [party, invoice, page, listLimit, listStart, listPayload, stockType, infiniteScroll, filterType, fromDate, toDate]);

  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);

  const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
  const { data: listData, isLoading, refetch, isFetching } = useFetchApi(
    [queryKey, payload],
    listEndpoint,
    payload,
    'POST',
    { enabled: true }
  );

  const { mutate: deleteRecord, isPending: isDeleting } = useDeleteApiRequest(deleteEndpoint, deleteQueryKey || queryKey);

  const editSaveEndpoint = actions.editSaveEndpoint || ENDPOINTS.outward.update;
  const { mutate: updateOutwardRecord, isPending: isUpdating } = usePostApiRequest(
    editSaveEndpoint,
    queryKey,
    { showToast: true }
  );

  // Purchase / In-Memo are dai_inward — must not call /outward/?id=
  const editGetBase = actions.editGetEndpoint ?? ENDPOINTS.outward.getById;
  const editDetailUrl = editId ? `${editGetBase}/?id=${editId}` : null;

  const { data: editDetailData, isLoading: isEditLoading } = useFetchApi(
    ['StockEditDetails', editGetBase, editId],
    editDetailUrl,
    null,
    'GET',
    { enabled: !!editId && !!actions.showEdit && !!editDetailUrl }
  );

  const applyEditDetails = useCallback((details, productsArg) => {
    if (!details) return;

    const productList = Array.isArray(productsArg)
      ? productsArg
      : Array.isArray(details.products)
        ? details.products
        : [];

    const normalizedProducts = productList.map((p) => ({
      ...p,
      sell_price: p.sell_price ?? p.purchase_price ?? p.price,
      sell_amount: p.sell_amount ?? p.purchase_amount ?? p.amount,
    }));

    editForm.setFieldsValue({
      ...details,
      type: details.type || details.inward_type || '',
      entryno: details.entryno ?? details.id,
      date: details.date ? dayjs(details.date) : null,
      invoicedate: details.invoicedate ? dayjs(details.invoicedate) : null,
      duedate: details.duedate ? dayjs(details.duedate) : null,
      party: details.party != null ? String(details.party) : undefined,
      other_party: details.other_party != null ? String(details.other_party) : undefined,
      boc: details.boc === 1 || details.boc === true,
      citi: details.citi === 1 || details.citi === true,
      dbs: details.dbs === 1 || details.dbs === true,
      sc: details.sc === 1 || details.sc === true,
    });

    setFetchedProducts(normalizedProducts);

    const csvIds = typeof details.products === 'string' && details.products
      ? details.products
      : normalizedProducts.map((p) => p.id).filter(Boolean).join(',');
    setOriginalSproducts(csvIds || '');
  }, [editForm]);

  useEffect(() => {
    if (!editDetailData || editDetailData.status === false) return;
    const details = editDetailData?.Data || editDetailData?.data;
    if (!details) return;
    applyEditDetails(details, editDetailData?.products);
  }, [editDetailData, applyEditDetails]);

  const postAction = async (url, body) => {
    if (!url) return false;
    setActionLoading(true);
    try {
      const res = await api.post(url, body);
      if (res.data?.status === false) {
        toastApiError({ response: { data: res.data } });
        return false;
      }
      toastApiSuccess(res.data);
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey?.[0];
          if (Array.isArray(key)) return key[0] === queryKey;
          return key === queryKey;
        },
      });
      if (infiniteScroll) {
        setHasMore(true);
        setScrollFetching(false);
        if (offset !== 0) {
          setOffset(0);
          setAllGroups([]);
        } else {
          const result = await refetch();
          const d = result?.data?.Data || result?.data?.data;
          setAllGroups(Array.isArray(d) ? d : []);
        }
      } else {
        await refetch();
      }
      return true;
    } catch (err) {
      toastApiError(err);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const partyOptions = useMemo(() => {
    const d = companyData?.Data || companyData?.data;
    return Array.isArray(d) ? d.map((item) => ({ label: item.name, value: String(item.id) })) : [];
  }, [companyData]);

  const editMainFields = useMemo(() => [
    { name: 'entryno', label: 'Entry', type: 'text', required: true, span: 6, disabled: true },
    { name: 'type', label: 'Type', type: 'text', required: true, span: 6, disabled: true },
    { name: 'place', label: 'Place', type: 'text', span: 6 },
    { name: 'date', label: 'Date', type: 'date', required: true, span: 6 },
    { name: 'reference', label: 'Reference', type: 'text', span: 6 },
    { name: 'invoiceno', label: 'Invoice No', type: 'text', required: true, span: 6, disabled: true },
    { name: 'invoicedate', label: 'Invoice Date', type: 'date', span: 6 },
    { name: 'terms', label: 'Terms', type: 'text', span: 6 },
    { name: 'duedate', label: 'Due Date', type: 'date', span: 6 },
    { name: 'party', label: 'Party Name', type: 'select', options: partyOptions, required: true, span: 6 },
    { name: 'other_party', label: 'Other Party', type: 'select', options: partyOptions, span: 6 },
    { name: 'paid_amount', label: 'Paid Amount', type: 'number', span: 6 },
  ], [partyOptions]);

  const invoiceFromUrl = (searchParams.get('invoice') || '').trim();

  const resetList = useCallback(() => {
    if (infiniteScroll) {
      setOffset(0);
      setAllGroups([]);
      setHasMore(true);
      setScrollFetching(false);
    } else {
      setPage(1);
    }
    setExpandedRowKeys([]);
  }, [infiniteScroll]);

  useEffect(() => {
    setInvoice(invoiceFromUrl);
    resetList();
  }, [invoiceFromUrl, resetList]);

  useEffect(() => {
    if (!infiniteScroll || !listData) return;
    const d = listData?.Data || listData?.data;
    const newRecords = Array.isArray(d) ? d : [];
    const total = Number(listData?.TotalItems ?? listData?.total ?? 0);

    setAllGroups((prev) => {
      if (offset === 0) return newRecords;
      const existingIds = new Set(prev.map((item) => item.id));
      return [...prev, ...newRecords.filter((item) => !existingIds.has(item.id))];
    });

    if (!newRecords.length || newRecords.length < listLimit || (total > 0 && offset + newRecords.length >= total)) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }
    setScrollFetching(false);
  }, [listData, offset, infiniteScroll, listLimit]);

  const groups = useMemo(() => {
    if (infiniteScroll) return allGroups;
    const d = listData?.Data || listData?.data;
    return Array.isArray(d) ? d : [];
  }, [infiniteScroll, allGroups, listData]);

  const totalItems = useMemo(() => {
    const fromApi = Number(listData?.TotalItems ?? listData?.total ?? 0);
    if (infiniteScroll) return fromApi || allGroups.length;
    return fromApi;
  }, [infiniteScroll, listData, allGroups.length]);

  const tableHeight = useTableBodyScrollHeight(tableRef, [
    groups.length,
    isLoading,
    isFetching,
    infiniteScroll ? offset : page,
    infiniteScroll ? false : pageSize,
    infiniteScroll ? false : totalItems,
  ]);

  const handleTableScroll = useCallback((e) => {
    if (!infiniteScroll) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && !scrollFetching && !isFetching && hasMore) {
      setScrollFetching(true);
      setOffset((prev) => prev + SCROLL_LIMIT);
    }
  }, [infiniteScroll, scrollFetching, isFetching, hasMore]);

  const refreshList = useCallback(async () => {
    setExpandedRowKeys([]);

    const invalidateStockQueries = () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey?.[0];
          if (Array.isArray(key)) return key[0] === queryKey;
          return key === queryKey;
        },
      });
    };

    if (infiniteScroll) {
      setHasMore(true);
      setScrollFetching(false);
      // Clearing allGroups before a same-key refetch can stick on empty when
      // React Query structural-shares identical data and useEffect never re-runs.
      if (offset !== 0) {
        setOffset(0);
        setAllGroups([]);
        invalidateStockQueries();
        return;
      }
      const result = await refetch();
      const d = result?.data?.Data || result?.data?.data;
      const newRecords = Array.isArray(d) ? d : [];
      setAllGroups(newRecords);
      const total = Number(result?.data?.TotalItems ?? result?.data?.total ?? 0);
      if (!newRecords.length || newRecords.length < listLimit || (total > 0 && newRecords.length >= total)) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      return;
    }

    if (page !== 1) {
      setPage(1);
      invalidateStockQueries();
      return;
    }
    await refetch();
  }, [infiniteScroll, offset, page, refetch, listLimit, queryClient, queryKey]);

  const pageStats = useMemo(() => groups.reduce((acc, group) => {
    (group.products || []).forEach((p) => {
      acc.pcs += Number(p.polish_pcs || 0);
      acc.carats += Number(p.polish_carat || 0);
      acc.amount += Number(p.sell_amount || p.amount || 0);
    });
    return acc;
  }, { pcs: 0, carats: 0, amount: 0 }), [groups]);

  const toggleProduct = (groupId, productId, checked) => {
    setSelectedProducts((prev) => {
      const current = prev[groupId] || [];
      const next = checked
        ? [...new Set([...current, productId])]
        : current.filter((id) => id !== productId);
      return { ...prev, [groupId]: next };
    });
  };

  const toggleAllInGroup = (groupId, products, checked) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [groupId]: checked ? products.map((p) => p.id) : [],
    }));
  };

  const getSelected = (groupId) => selectedProducts[groupId] || [];

  const openDelete = (record) => setDeleteModal({ open: true, record });
  const closeDelete = () => setDeleteModal({ open: false, record: null });
  const openInvoice = (record) => setInvoiceModal({ open: true, record });
  const closeInvoice = () => setInvoiceModal({ open: false, record: null });

  const invoiceCompany = useMemo(
    () => ({
      name: companyName || 'ShreeHK',
      tagline: 'Diamond & Gemstone Trading',
      logo: companyLogo || null,
      logoUrl: resolveCompanyLogoUrl(companyLogo),
    }),
    [companyName, companyLogo]
  );

  const handlePrint = (record) => {
    openInvoice(record);
  };

  const handleEditClick = (record) => {
    setEditingRecord(record);
    setEditId(record.id);
    setIsEditModalOpen(true);
    setFetchedProducts([]);
    setOriginalSproducts('');
    editForm.resetFields();
    // Fill immediately from list row (API may be inward/outward; list already has header + products)
    applyEditDetails(record, record.products);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditId(null);
    setEditingRecord(null);
    setFetchedProducts([]);
    setOriginalSproducts('');
    editForm.resetFields();
  };

  const handleProductFieldChange = (index, field, value) => {
    setFetchedProducts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const originalIds = originalSproducts
        || (editingRecord?.products || []).map((p) => (typeof p === 'object' ? p.id : p)).filter(Boolean).join(',');
      const payload = {
        id: editingRecord.id,
        type: editingRecord.type,
        sproducts: originalIds,
        ...values,
        boc: values.boc ? 1 : 0,
        citi: values.citi ? 1 : 0,
        dbs: values.dbs ? 1 : 0,
        sc: values.sc ? 1 : 0,
        date: values.date?.format?.('YYYY-MM-DD') ?? values.date,
        invoicedate: values.invoicedate?.format?.('YYYY-MM-DD') ?? values.invoicedate,
        duedate: values.duedate?.format?.('YYYY-MM-DD') ?? values.duedate,
        products: fetchedProducts,
      };

      updateOutwardRecord(payload, {
        onSuccess: () => {
          closeEditModal();
          refreshList();
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleReturn = (record) => {
    const products = getSelected(record.id);
    if (!products.length) return;
    if (actions.giaReturn) {
      setGiaReturnModal({ open: true, record, productIds: products });
      return;
    }
    postAction(actions.returnEndpoint, { id: record.id, outid: record.id, products }).then((ok) => {
      if (ok) setSelectedProducts((prev) => ({ ...prev, [record.id]: [] }));
    });
  };

  const handleMemoToSale = (record) => {
    const products = getSelected(record.id);
    if (!products.length) return;
    postAction(actions.memoToSaleEndpoint, { memo_id: record.id, id: record.id, products, type: 'sale', party: record.party });
  };

  const handleMemoToPurchase = (record) => {
    const products = getSelected(record.id);
    if (!products.length) return;
    postAction(actions.memoToPurchaseEndpoint, { memo_id: record.id, id: record.id, products, party: record.party });
  };

  const handleToggle = (record, inwardType) => {
    postAction(actions.toggleEndpoint, { id: record.id, inward_type: inwardType });
  };

  const handleToExport = (record, type) => {
    postAction(actions.toExportEndpoint, { id: record.id, type });
  };

  const handleDelete = () => {
    if (!deleteModal.record?.id) return;
    deleteRecord(deleteModal.record.id, {
      onSuccess: () => { refreshList(); closeDelete(); },
    });
  };

  const buildGroupColumns = useCallback((group) => [
    {
      title: (
        <Checkbox
          checked={
            (group.products || []).length > 0
            && getSelected(group.id).length === (group.products || []).length
          }
          indeterminate={
            getSelected(group.id).length > 0
            && getSelected(group.id).length < (group.products || []).length
          }
          onChange={(e) => toggleAllInGroup(group.id, group.products || [], e.target.checked)}
        />
      ),
      width: 50,
      fixed: 'left',
      render: (_, row) => (
        <Checkbox
          checked={getSelected(group.id).includes(row.id)}
          onChange={(e) => toggleProduct(group.id, row.id, e.target.checked)}
        />
      ),
    },
    ...productColumns,
  ], [productColumns, selectedProducts]);

  const renderExpandedRow = (group) => {
    const products = group.products || [];
    const columns = buildGroupColumns(group);
    const childTotals = products.reduce((acc, p) => {
      acc.pcs += Number(p.polish_pcs || 0);
      acc.carats += Number(p.polish_carat || 0);
      acc.price += Number(p.sell_price ?? p.purchase_price ?? p.price ?? 0);
      acc.amount += Number(p.sell_amount ?? p.purchase_amount ?? p.amount ?? 0);
      return acc;
    }, { pcs: 0, carats: 0, price: 0, amount: 0 });

    const isPcsCol = (key) => key === 'polish_pcs' || key === 'pcs';
    const isCaratCol = (key) => key === 'polish_carat' || key === 'carat';
    const isPriceCol = (key) => key === 'price' || key === 'sell_price' || key === 'purchase_price';
    const isAmountCol = (key) => key === 'amount' || key === 'sell_amount' || key === 'purchase_amount';

    return (
      <div className={styles.expandedBlock}>
        <div className={styles.innerTableWrap}>
          <Table
            columns={columns}
            dataSource={products}
            rowKey="id"
            pagination={false}
            size="middle"
            bordered
            tableLayout="fixed"
            className={styles.innerTable}
            style={{ minWidth: Math.max(1200, productColumns.length * 100) }}
            summary={() => {
              if (!products.length) return null;
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row className={styles.childSummaryRow}>
                    {columns.map((col, index) => {
                      const key = col.dataIndex || col.key;
                      let content = null;
                      if (index === 0) {
                        content = <Text strong>Total</Text>;
                      } else if (isPcsCol(key)) {
                        content = <Text strong>{childTotals.pcs.toLocaleString()}</Text>;
                      } else if (isCaratCol(key)) {
                        content = <Text strong>{childTotals.carats.toFixed(2)}</Text>;
                      } else if (isPriceCol(key)) {
                        content = <Text strong>{childTotals.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>;
                      } else if (isAmountCol(key)) {
                        content = <Text strong>{childTotals.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>;
                      }
                      return (
                        <Table.Summary.Cell
                          key={key || index}
                          index={index}
                          align={col.align || (index === 0 ? 'left' : undefined)}
                        >
                          {content}
                        </Table.Summary.Cell>
                      );
                    })}
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
        </div>
      </div>
    );
  };

  const mainColumns = [
    {
      title: 'Entry No',
      dataIndex: 'entryno',
      key: 'entryno',
      width: 110,
      render: (val) => <Text strong>#{val}</Text>,
    },
    {
      title: 'Type',
      key: 'type',
      width: 100,
      render: (_, record) => {
        const displayType = record.type || record.inward_type;
        return (
          <Tag color={typeColors[displayType] || 'default'} style={{ textTransform: 'uppercase', fontWeight: 600 }}>
            {String(displayType || '-')}
          </Tag>
        );
      },
    },
    {
      title: 'Party',
      key: 'party',
      width: 180,
      ellipsis: true,
      render: (_, record) => record.party_name || record.party || '-',
    },
    {
      title: 'Invoice',
      dataIndex: 'invoiceno',
      key: 'invoiceno',
      width: 130,
      ellipsis: true,
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      width: 120,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')),
    },
    {
      title: 'Stones',
      key: 'stoneCount',
      width: 80,
      align: 'center',
      render: (_, record) => (record.products || []).length,
    },
    {
      title: 'Amount',
      dataIndex: 'final_amount',
      key: 'final_amount',
      width: 120,
      align: 'right',
      render: (val, record) => {
        const amount = val ?? (record.products || []).reduce(
          (sum, p) => sum + Number(p.sell_amount || p.amount || 0),
          0
        );
        return <Text strong>${Number(amount || 0).toLocaleString()}</Text>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 160,
      fixed: 'right',
      align: 'center',
      render: (_, record) => {
        const selectedCount = getSelected(record.id).length;
        const displayType = record.type || record.inward_type;
        const needsSelectionDisabled = !selectedCount || actionLoading;

        const moreItems = [];
        if (actions.showReturn) {
          moreItems.push({
            key: 'return',
            icon: <RollbackOutlined className={styles.actionReturn} />,
            label: 'Return',
            disabled: needsSelectionDisabled,
          });
        }
        if (actions.showMemoToSale) {
          moreItems.push({
            key: 'sale',
            icon: <DollarOutlined className={styles.actionSale} />,
            label: 'Sale',
            disabled: needsSelectionDisabled,
          });
        }
        if (actions.showMemoToPurchase) {
          moreItems.push({
            key: 'purchase',
            icon: <ShoppingCartOutlined className={styles.actionPurchase} />,
            label: 'Purchase',
            disabled: needsSelectionDisabled,
          });
        }
        if (actions.showToConsign && displayType === 'memo') {
          moreItems.push({
            key: 'toConsign',
            icon: <SwapOutlined className={styles.actionConsign} />,
            label: 'To Consign',
            disabled: actionLoading,
          });
        }
        if (actions.showToExport && displayType === 'sale') {
          moreItems.push({
            key: 'toExport',
            icon: <ExportOutlined className={styles.actionExport} />,
            label: 'To Export',
            disabled: actionLoading,
          });
        }
        if (actions.showToPurchase && displayType === 'import') {
          moreItems.push({
            key: 'toPurchase',
            icon: <ShoppingCartOutlined className={styles.actionPurchase} />,
            label: 'To Purchase',
            disabled: actionLoading,
          });
        }
        if (actions.showToImport && displayType === 'purchase') {
          moreItems.push({
            key: 'toImport',
            icon: <ImportOutlined className={styles.actionImport} />,
            label: 'To Import',
            disabled: actionLoading,
          });
        }

        const handleMoreClick = ({ key }) => {
          if (key === 'return' && !needsSelectionDisabled) handleReturn(record);
          if (key === 'sale' && !needsSelectionDisabled) handleMemoToSale(record);
          if (key === 'purchase' && !needsSelectionDisabled) handleMemoToPurchase(record);
          if (key === 'toConsign' && !actionLoading) handleToExport(record, 'consign');
          if (key === 'toExport' && !actionLoading) handleToExport(record, 'export');
          if (key === 'toPurchase' && !actionLoading) handleToggle(record, 'purchase');
          if (key === 'toImport' && !actionLoading) handleToggle(record, 'import');
        };

        return (
          <div className={styles.actionIcons}>
            {moreItems.length > 0 && (
              <Dropdown
                menu={{ items: moreItems, onClick: handleMoreClick }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Tooltip title="More">
                  <EllipsisOutlined className={styles.actionMore} />
                </Tooltip>
              </Dropdown>
            )}
            {actions.showEdit && (
              <Tooltip title="Edit">
                <EditOutlined className={styles.edit} onClick={() => handleEditClick(record)} />
              </Tooltip>
            )}
            {actions.showPrint && (
              <Tooltip title="Print">
                <PrinterOutlined className={styles.print} onClick={() => handlePrint(record)} />
              </Tooltip>
            )}
            {actions.showDelete && (
              <Tooltip title="Delete">
                <DeleteOutlined className={styles.delete} onClick={() => openDelete(record)} />
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  const listLoading = infiniteScroll
    ? (isLoading && offset === 0)
    : isLoading;

  const {
    columns: skeletonAwareColumns,
    dataSource: skeletonAwareGroups,
    tableLoading,
    showSkeleton,
  } = useTableSkeleton({
    columns: mainColumns,
    dataSource: groups,
    loading: listLoading,
    rowCount: 8,
    rowKey: '_skeletonKey',
  });

  const handlePaginationChange = (nextPage, nextPageSize) => {
    setPage(nextPage);
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
    }
    setExpandedRowKeys([]);
  };

  return (
    <div className={styles.outwardContainer}>
      {/* <PageHeroHeader
        breadcrumb="TRANSACTION / STOCK"
        title={title}
        icon={<FileTextOutlined />}
        actions={(
          <Space wrap>
            {entryPath && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(entryPath)}>
                New Entry
              </Button>
            )}
            <Button type="primary" icon={<ReloadOutlined />} loading={isFetching && (!infiniteScroll || offset === 0)} onClick={refreshList}>
              Refresh
            </Button>
          </Space>
        )}
      /> */}

      <AdvancedFilterPanel
        title={`${title}`}
        // subtitle="Filter records by company and invoice number."
        activeCount={[party, invoice, filterType, fromDate, toDate].filter(Boolean).length}
        onClear={() => {
          setParty('');
          setInvoice('');
          setFilterType('');
          setFromDate(null);
          setToDate(null);
          resetList();
        }}
        clearDisabled={!party && !invoice && !filterType && !fromDate && !toDate}
        showSearch={false}
        extraActions={
          <Space>
            {entryPath && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate(entryPath)}
              >
                New Entry
              </Button>
            )}

            <Button
              type="primary"
              icon={<ReloadOutlined />}
              loading={isFetching && (!infiniteScroll || offset === 0)}
              onClick={refreshList}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        {/* <FilterField label="Company" icon={<TeamOutlined />}> */}
        <FilterField>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All Company Name"
            className={filterPanelStyles.filterControl}
            value={party || undefined}
            onChange={(v) => { setParty(v || ''); resetList(); }}
            options={partyOptions}
            virtual
            style={{ padding: "6px 11px" }}
          />
        </FilterField>
        {/* <FilterField label="Invoice"> */}
        <FilterField>
          <Input
            className={filterPanelStyles.filterControl}
            value={invoice}
            onChange={(e) => { setInvoice(e.target.value); resetList(); }}
            onPressEnter={refreshList}
            placeholder="Invoice number"
            allowClear
          />
        </FilterField>
        {typeFilterOptions.length > 0 && (
          <FilterField>
            <Select
              allowClear
              placeholder="All Type"
              className={filterPanelStyles.filterControl}
              value={filterType || undefined}
              onChange={(v) => { setFilterType(v || ''); resetList(); }}
              options={typeFilterOptions}
              style={{ padding: "6px 11px", minWidth: 140 }}
            />
          </FilterField>
        )}
        <FilterField>
          <DatePicker
            allowClear
            format="DD-MM-YYYY"
            placeholder="From Date"
            className={filterPanelStyles.filterControl}
            value={fromDate}
            onChange={(v) => { setFromDate(v); resetList(); }}
            style={{ width: '100%', minWidth: 140 }}
          />
        </FilterField>
        <FilterField>
          <DatePicker
            allowClear
            format="DD-MM-YYYY"
            placeholder="To Date"
            className={filterPanelStyles.filterControl}
            value={toDate}
            onChange={(v) => { setToDate(v); resetList(); }}
            style={{ width: '100%', minWidth: 140 }}
          />
        </FilterField>
      </AdvancedFilterPanel>

      <Card variant="none" className={styles.cardContainer}>
        <div
          ref={tableRef}
          className={`erp-table-container ${styles.fixedHeightTable}`}
          style={{ ['--table-scroll-y']: `${tableHeight}px` }}
        >
          <Table
            columns={skeletonAwareColumns}
            dataSource={skeletonAwareGroups}
            rowKey={showSkeleton ? '_skeletonKey' : 'id'}
            loading={tableLoading}
            className={styles.tableWrapper}
            size="small"
            bordered
            tableLayout="fixed"
            scroll={{ x: 1200, y: tableHeight }}
            onScroll={infiniteScroll && !showSkeleton ? handleTableScroll : undefined}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No records found. Adjust filters or create a new entry."
                />
              ),
            }}
            expandable={showSkeleton ? undefined : {
              expandedRowRender: renderExpandedRow,
              expandedRowClassName: () => styles.expandedRow,
              expandedRowKeys,
              onExpandedRowsChange: setExpandedRowKeys,
            }}
            pagination={showSkeleton || infiniteScroll ? false : {
              current: page,
              pageSize,
              total: totalItems,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} entries`,
              onChange: handlePaginationChange,
              position: ['bottomCenter'],
              hideOnSinglePage: totalItems <= PAGE_SIZE_DEFAULT,
            }}
            footer={() => (
              <div className={styles.statsBarFooter}>
                <div className={styles.statsBar}>
                  <div className={styles.legendGroup}>
                    <Text strong>Total Records: {totalItems.toLocaleString()}</Text>
                    <Text type="secondary" style={{ marginLeft: 12 }}>
                      {infiniteScroll
                        ? `Total ${groups.length.toLocaleString()} ${groups.length === 1 ? 'entry' : 'entries'}`
                        : `Showing page ${page} · ${groups.length} ${groups.length === 1 ? 'entry' : 'entries'}`}
                    </Text>
                  </div>
                  {infiniteScroll && groups.length > 0 && (
                    <div className={styles.statsBarCenter}>
                      {(isFetching || scrollFetching) ? <Spin size="small" /> :
                        hasMore ? 'Scroll down for more...' : `All ${groups.length} entries loaded`}
                    </div>
                  )}
                  <div className={styles.totalsGroup}>
                    <div className={styles.statItem}>
                      <label>{infiniteScroll ? 'Total Pcs' : 'Page Pcs'}</label>
                      <span>{pageStats.pcs.toLocaleString()}</span>
                    </div>
                    <div className={styles.statItem}>
                      <label>{infiniteScroll ? 'Total Carats' : 'Page Carats'}</label>
                      <span>{pageStats.carats.toFixed(2)}</span>
                    </div>
                    <div className={styles.statItem}>
                      <label>{infiniteScroll ? 'Total Amount' : 'Page Amount'}</label>
                      <span style={{ color: cssVar('color-error') }}>${pageStats.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      </Card>

      <ConfirmDeleteModal
        open={deleteModal.open}
        onCancel={closeDelete}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete record?"
        entityName={
          deleteModal.record?.entryno != null && deleteModal.record?.entryno !== ""
            ? `#${deleteModal.record.entryno}`
            : deleteModal.record?.invoiceno || deleteModal.record?.id
        }
      />

      {actions.giaReturn && (
        <GiaReturnModal
          open={giaReturnModal.open}
          record={giaReturnModal.record}
          productIds={giaReturnModal.productIds}
          products={giaReturnModal.record?.products || []}
          onClose={() => setGiaReturnModal({ open: false, record: null, productIds: [] })}
          onSuccess={() => {
            refreshList();
            setSelectedProducts({});
            setGiaReturnModal({ open: false, record: null, productIds: [] });
          }}
        />
      )}

      <TransactionInvoicePreviewModal
        open={invoiceModal.open}
        onClose={closeInvoice}
        record={invoiceModal.record}
        invoiceTitle={invoiceTitle}
        company={invoiceCompany}
        selectedProductIds={
          invoiceModal.record && getSelected(invoiceModal.record.id).length
            ? getSelected(invoiceModal.record.id)
            : null
        }
      />

      {actions.showEdit && (
        <BaseModal
          title="Edit"
          subtitle={editingRecord?.invoiceno || ''}
          variant="edit"
          headerIcon={<Pencil size={16} strokeWidth={2} />}
          saveIcon={<CircleCheck size={15} strokeWidth={2.25} />}
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
          loading={isUpdating}
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
                {isEditLoading ? (
                  <SkeletonForm fields={6} />
                ) : (
                  <>
                    <DynamicForm fields={editMainFields} />
                    <Row gutter={[16, 0]} className={styles.stockEditPayRow}>
                      <Col span={6}>
                        <Form.Item name="due_amount" label="Due Amount">
                          <InputNumber min={0} placeholder="0.00" style={{ width: '100%', height: 40 }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
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
                  </>
                )}
                <div className={styles.stockEditProductsHead}>Products</div>
                <Table
                  className={styles.stockEditProductTable}
                  loading={false}
                  columns={isEditLoading ? [
                    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
                    { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 80 },
                    { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 80 },
                    { title: 'Price', dataIndex: 'sell_price', key: 'sell_price', width: 80 },
                    { title: 'Amount', dataIndex: 'sell_amount', key: 'sell_amount', width: 80 },
                  ].map((col) => ({
                    ...col,
                    render: () => <span style={{ display: 'inline-block', width: '70%', height: 12, borderRadius: 6, background: 'var(--color-bg-muted)' }} />,
                  })) : [
                    { title: 'SKU', dataIndex: 'sku', key: 'sku', render: (val, _record, idx) => <Input value={val} onChange={(e) => handleProductFieldChange(idx, 'sku', e.target.value)} /> },
                    { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', render: (val, _record, idx) => <Input type="number" value={val} onChange={(e) => handleProductFieldChange(idx, 'polish_pcs', e.target.value)} /> },
                    { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', render: (val, _record, idx) => <Input type="number" value={val} onChange={(e) => handleProductFieldChange(idx, 'polish_carat', e.target.value)} /> },
                    { title: 'Price', dataIndex: 'sell_price', key: 'sell_price', render: (val, _record, idx) => <Input type="number" value={val} onChange={(e) => handleProductFieldChange(idx, 'sell_price', e.target.value)} /> },
                    { title: 'Amount', dataIndex: 'sell_amount', key: 'sell_amount', render: (val, _record, idx) => <Input type="number" value={val} onChange={(e) => handleProductFieldChange(idx, 'sell_amount', e.target.value)} /> },
                  ]}
                  dataSource={isEditLoading ? Array.from({ length: 3 }, (_, i) => ({ id: `sk-p-${i}` })) : fetchedProducts}
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
      )}
    </div>
  );
};

export default TransactionStockTemplate;
