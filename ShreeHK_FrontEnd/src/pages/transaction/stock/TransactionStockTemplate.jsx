import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Table, Card, Typography, Space, Button, Tag, Checkbox, Select, Input, InputNumber, Empty, Form, Tooltip, DatePicker, Row, Col } from 'antd';
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { toastApiSuccess, toastApiError, toastWarning, toastInfo, toastSuccess } from '../../../utils/toastNotify';
import { fetchProductDetail } from '../../../api/services/productService';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useFetchApi, useDeleteApiRequest, usePostApiRequest } from '../../../api/ApiFunction';
import { api } from '../../../api/client/axiosInstance';
import { ENDPOINTS, QUERY_KEYS } from '../../../api/endpoints';
import { ConfirmDeleteModal, BaseModal } from '../../../components/common/modals';
import DynamicForm from '../../../components/common/ui/DynamicFormField';
import GiaReturnModal from '../../../components/transaction/stock/GiaReturnModal';
import MemoConvertModal from '../../../components/transaction/stock/MemoConvertModal';
import ConvertToExportModal from '../../../components/transaction/stock/ConvertToExportModal';
import TransactionInvoicePreviewModal from '../../../components/transaction/invoice/TransactionInvoicePreviewModal';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../../components/common/filters/AdvancedFilterPanel';
import PageHeroHeader from '../../../components/common/PageHeroHeader';
import { FileTextOutlined } from '@ant-design/icons';
import useAuthStore from '../../../store/Auth.Store';
import useBranchCompanies from '../../../hooks/useBranchCompanies';
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
  inter_transfer: 'geekblue',
  inter_memo: 'volcano',
  transfer: 'geekblue',
};

const getTypeColor = (type) => {
  const t = String(type || '').trim().toLowerCase();
  if (t.includes('import')) return 'cyan';
  if (t.includes('purchase')) return 'purple';
  if (t.includes('sale')) return 'success';
  if (t.includes('inter_memo')) return 'volcano';
  if (t.includes('memo')) return 'warning';
  if (t.includes('consign')) return 'magenta';
  if (t.includes('export')) return 'processing';
  if (t.includes('lab')) return 'blue';
  if (t.includes('transfer')) return 'geekblue';
  return typeColors[t] || 'default';
};

const skuMatchesProduct = (product, sku) => {
  const needle = String(sku || '').trim().toLowerCase();
  if (!needle) return true;
  return [product?.sku, product?.parent_sku, product?.mfg_code, product?.diamond_no]
    .some((value) => String(value || '').toLowerCase().includes(needle));
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
  showSkuFilter = false,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyName = useAuthStore((s) => s.companyName);
  const companyLogo = useAuthStore((s) => s.companyLogo);
  const { options: branchCompanies } = useBranchCompanies();
  const companyMap = useMemo(() => {
    const map = new Map();
    (branchCompanies || []).forEach((c) => {
      map.set(Number(c.value), c.name || c.label);
    });
    return map;
  }, [branchCompanies]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [party, setParty] = useState('');
  const [invoice, setInvoice] = useState(() => (searchParams.get('invoice') || '').trim());
  const [filterType, setFilterType] = useState(() => (searchParams.get('type') || '').trim());
  const [skuSearch, setSkuSearch] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [offset, setOffset] = useState(0);
  const [allGroups, setAllGroups] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [scrollFetching, setScrollFetching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, record: null });
  const [invoiceModal, setInvoiceModal] = useState({ open: false, record: null });
  const [giaReturnModal, setGiaReturnModal] = useState({ open: false, record: null, productIds: [] });
  const [memoConvertModal, setMemoConvertModal] = useState({
    open: false,
    mode: 'sale',
    record: null,
    productIds: [],
  });
  const [memoConvertLoading, setMemoConvertLoading] = useState(false);
  const [toExportModal, setToExportModal] = useState({
    open: false,
    record: null,
    convertType: 'export',
  });
  const [toExportLoading, setToExportLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [fetchedProducts, setFetchedProducts] = useState([]);
  const [originalSproducts, setOriginalSproducts] = useState('');
  const [editForm] = Form.useForm();
  const tableRef = useRef(null);

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

  const listLimit = infiniteScroll ? SCROLL_LIMIT : pageSize;
  const listStart = infiniteScroll ? offset : (page - 1) * pageSize;

  const payload = useMemo(() => ({
    company: selectedCompany || '',
    party: party || '',
    invoice: invoice || '',
    invoiceno: invoice || '',
    page: infiniteScroll ? Math.floor(listStart / listLimit) + 1 : page,
    limit: listLimit,
    start: listStart,
    ...listPayload,
    ...(stockType ? { stockType } : {}),
    ...(filterType ? { type: filterType } : {}),
    ...(showSkuFilter && skuSearch.trim() ? { sku: skuSearch.trim() } : {}),
    ...(fromDate ? { fromDate: dayjs(fromDate).format('YYYY-MM-DD') } : {}),
    ...(toDate ? { toDate: dayjs(toDate).format('YYYY-MM-DD') } : {}),
  }), [selectedCompany, party, invoice, page, listLimit, listStart, listPayload, stockType, infiniteScroll, filterType, showSkuFilter, skuSearch, fromDate, toDate]);

  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);

  const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
  const { data: listData, isLoading, refetch, isFetching } = useFetchApi(
    [queryKey, payload],
    listEndpoint,
    payload,
    'POST',
    { enabled: true, staleTime: 0, refetchOnMount: 'always' }
  );

  const { mutate: deleteRecord, isPending: isDeleting } = useDeleteApiRequest(deleteEndpoint, deleteQueryKey || queryKey, { queryParam: 'deleteId' });

  const isOutwardRecord = !String(actions.editGetEndpoint || "").includes("inward");
  const editSaveEndpoint =
    actions.editSaveEndpoint ||
    (isOutwardRecord ? ENDPOINTS.outward.update : ENDPOINTS.inward.update);
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
      // Venya sgrid: sell_price/amount == 0 → fall back to price/amount
      sell_price: Number(p.sell_price) === 0 || p.sell_price == null
        ? (p.purchase_price ?? p.price)
        : p.sell_price,
      sell_amount: Number(p.sell_amount) === 0 || p.sell_amount == null
        ? (p.purchase_amount ?? p.amount)
        : p.sell_amount,
      location: p.location ?? p.loc ?? "",
      group_type: p.group_type ?? p.groupType ?? "",
      cost: p.cost ?? "",
      remark: p.remark ?? "",
      lab: p.lab ?? "",
      mfg_code: p.mfg_code ?? "",
      diamond_no: p.diamond_no ?? p.d_no ?? "",
      report_no: p.report_no ?? "",
      shape: p.shape ?? "",
      clarity: p.clarity ?? "",
      intensity: p.intensity ?? "",
      overtone: p.overtone ?? "",
      color: p.color ?? p.main_color ?? "",
    }));

    const rawCompany = details.company != null && details.company !== ''
      ? details.company
      : (editingRecord?.company != null && editingRecord?.company !== '' ? editingRecord.company : undefined);
    const compId =
      rawCompany != null && rawCompany !== '' && !isNaN(Number(rawCompany))
        ? Number(rawCompany)
        : null;
    const resolvedCompanyText =
      details.company_name ||
      editingRecord?.company_name ||
      (compId ? companyMap.get(compId) : '') ||
      (typeof rawCompany === 'string' && isNaN(Number(rawCompany)) ? rawCompany : '') ||
      companyName ||
      '';

    editForm.setFieldsValue({
      ...details,
      company: resolvedCompanyText,
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
      boc_sksm: details.boc_sksm === 1 || details.boc_sksm === true,
      citi_sksm: details.citi_sksm === 1 || details.citi_sksm === true,
      shipping_name: details.shipping_name != null && details.shipping_name !== ''
        ? String(details.shipping_name)
        : undefined,
      origin_of: details.origin_of != null && details.origin_of !== ''
        ? String(details.origin_of)
        : undefined,
      manufacture_origin: details.manufacture_origin != null && details.manufacture_origin !== ''
        ? String(details.manufacture_origin)
        : undefined,
      shipping_charge: details.shipping_charge ?? '',
      cif: details.cif ?? '',
      vat_percent: details.vat_percent != null ? String(details.vat_percent) : '0',
      vat_amount: details.vat_amount ?? '',
    });

    setFetchedProducts(normalizedProducts);

    const csvIds = typeof details.products === 'string' && details.products
      ? details.products
      : normalizedProducts.map((p) => p.id).filter(Boolean).join(',');
    setOriginalSproducts(csvIds || '');
  }, [editForm, editingRecord, companyMap, companyName]);

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
          const queryFirst = Array.isArray(key) ? key[0] : key;
          const targetFirst = Array.isArray(queryKey) ? queryKey[0] : queryKey;
          return queryFirst === targetFirst;
        },
      });
      queryClient.invalidateQueries({ queryKey: ['GetProductData'] });
      queryClient.invalidateQueries({ queryKey: ['myInventorySummary'] });
      queryClient.invalidateQueries({ queryKey: ['OutwardList'] });
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
    const baseParties = Array.isArray(d) ? d.map((item) => ({ label: item.name, value: String(item.id) })) : [];
    if (stockType === 'inter_transfer' || stockType === 'inter_memo') {
      const compOptions = (branchCompanies || []).map((c) => ({
        label: c.label || c.name,
        value: c.label || c.name,
      }));
      return [...compOptions, ...baseParties];
    }
    return baseParties;
  }, [companyData, branchCompanies, stockType]);

  // Venya sale edit (sform.php): sale / export / consign share this modal layout
  const isVenyaSaleEdit =
    stockType === 'sale' ||
    ['sale', 'export', 'consign'].includes(String(editingRecord?.type || '').toLowerCase());

  const { data: shippingMasterData } = useFetchApi(
    [QUERY_KEYS.shipping, 'sale-edit'],
    ENDPOINTS.shipping.list,
    { limit: 500 },
    'GET',
    { enabled: isEditModalOpen && isVenyaSaleEdit }
  );
  const { data: originMasterData } = useFetchApi(
    [QUERY_KEYS.origins, 'sale-edit'],
    ENDPOINTS.origin.list,
    { limit: 500 },
    'GET',
    { enabled: isEditModalOpen && isVenyaSaleEdit }
  );

  const shippingOptions = useMemo(() => {
    const d = shippingMasterData?.Data || shippingMasterData?.data || shippingMasterData;
    const list = Array.isArray(d) ? d : [];
    return list.map((item) => ({
      label: item.name || item.shipping_name || String(item.id),
      value: String(item.id),
    }));
  }, [shippingMasterData]);

  const originOptions = useMemo(() => {
    const d = originMasterData?.Data || originMasterData?.data || originMasterData;
    const list = Array.isArray(d) ? d : [];
    return list.map((item) => ({
      label: item.name || item.origin_name || String(item.id),
      value: String(item.id),
    }));
  }, [originMasterData]);

  const editModalTitle = useMemo(() => {
    const recType = editingRecord?.type || editingRecord?.inward_type;
    const formatType = (t) => {
      const s = String(t || '').trim().toLowerCase();
      if (s === 'memo') return 'Memo';
      if (s === 'sale') return 'Sale';
      if (s === 'purchase') return 'Purchase';
      if (s === 'import') return 'Import';
      if (s === 'export') return 'Export';
      if (s === 'consign') return 'Consignment';
      if (s === 'lab' || s === 'gia') return 'GIA Lab';
      return s.charAt(0).toUpperCase() + s.slice(1);
    };

    if (recType) {
      const formattedType = formatType(recType);
      if (title) {
        const cleanTitle = title.trim();
        if (cleanTitle.toLowerCase().includes(formattedType.toLowerCase())) {
          return cleanTitle.toLowerCase().startsWith('edit') ? cleanTitle : `Edit ${cleanTitle}`;
        }
        return `Edit ${cleanTitle} (${formattedType})`;
      }
      return `Edit ${formattedType}`;
    }

    if (title) {
      const cleanTitle = title.trim();
      return cleanTitle.toLowerCase().startsWith('edit') ? cleanTitle : `Edit ${cleanTitle}`;
    }
    return 'Edit Transaction';
  }, [title, editingRecord]);

  const editModalSubtitle = useMemo(() => {
    const idText =
      editingRecord?.invoiceno ||
      (editingRecord?.entryno ? `#${editingRecord.entryno}` : (editingRecord?.id ? `#${editingRecord.id}` : ''));
    const compId =
      editingRecord?.company != null && editingRecord?.company !== ''
        ? Number(editingRecord.company)
        : null;
    const compName =
      editingRecord?.company_name ||
      (compId ? companyMap.get(compId) : '') ||
      '';
    if (idText && compName) {
      return `${idText} • ${compName}`;
    }
    return idText || compName || '';
  }, [editingRecord, companyMap]);

  const resolvedEditCompanyName = useMemo(() => {
    const rawComp = editingRecord?.company;
    const compId =
      rawComp != null && rawComp !== '' && !isNaN(Number(rawComp))
        ? Number(rawComp)
        : null;
    return (
      editingRecord?.company_name ||
      (compId ? companyMap.get(compId) : '') ||
      (typeof rawComp === 'string' && isNaN(Number(rawComp)) ? rawComp : '') ||
      companyName ||
      ''
    );
  }, [editingRecord, companyMap, companyName]);

  useEffect(() => {
    if (!isEditModalOpen) return;
    const currentVal = editForm.getFieldValue('company');
    if (!currentVal && resolvedEditCompanyName) {
      editForm.setFieldsValue({ company: resolvedEditCompanyName });
    }
  }, [isEditModalOpen, resolvedEditCompanyName, editForm]);

  const editMainFields = useMemo(() => {
    // 5 fields per row (account for Row gutter)
    const c5 = '1 1 calc(20% - 13px)';
    if (isVenyaSaleEdit) {
      // Match Venya sform.php header (no Type field — type is hidden)
      return [
        { name: 'entryno', label: 'Entry', type: 'text', required: true, flex: c5, disabled: true },
        { name: 'company', label: 'Company', type: 'text', flex: c5, disabled: true },
        { name: 'place', label: 'Sale @', type: 'text', flex: c5 },
        { name: 'date', label: 'Date', type: 'date', required: true, flex: c5 },
        { name: 'reference', label: 'Reference', type: 'text', flex: c5 },
        { name: 'invoiceno', label: 'Invoice No.', type: 'text', required: true, flex: c5, disabled: true },
        { name: 'invoicedate', label: 'Invoice Date', type: 'date', flex: c5 },
        { name: 'terms', label: 'Terms', type: 'text', flex: c5 },
        { name: 'duedate', label: 'Due Date', type: 'date', flex: c5 },
        { name: 'paid_amount', label: 'Paid Amount', type: 'number', flex: c5 },
        { name: 'due_amount', label: 'Due Amount', type: 'number', flex: c5 },
        { name: 'party', label: 'Party Name', type: 'select', options: partyOptions, required: true, flex: c5 },
        { name: 'other_party', label: 'Other Party', type: 'select', options: partyOptions, flex: c5 },
      ];
    }
    return [
      { name: 'entryno', label: 'Entry', type: 'text', required: true, flex: c5, disabled: true },
      { name: 'company', label: 'Company', type: 'text', flex: c5, disabled: true },
      { name: 'type', label: 'Type', type: 'text', required: true, flex: c5, disabled: true },
      { name: 'place', label: 'Place', type: 'text', flex: c5 },
      { name: 'date', label: 'Date', type: 'date', required: true, flex: c5 },
      { name: 'reference', label: 'Reference', type: 'text', flex: c5 },
      { name: 'invoiceno', label: 'Invoice No', type: 'text', required: true, flex: c5, disabled: true },
      { name: 'invoicedate', label: 'Invoice Date', type: 'date', flex: c5 },
      { name: 'terms', label: 'Terms', type: 'text', flex: c5 },
      { name: 'duedate', label: 'Due Date', type: 'date', flex: c5 },
      { name: 'paid_amount', label: 'Paid Amount', type: 'number', flex: c5 },
      { name: 'party', label: 'Party Name', type: 'select', options: partyOptions, required: true, flex: c5 },
      { name: 'other_party', label: 'Other Party', type: 'select', options: partyOptions, flex: c5 },
      { name: 'due_amount', label: 'Due Amount', type: 'number', flex: c5 },
      {
        type: 'custom',
        noFormItem: true,
        flex: c5,
        render: () => (
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
        ),
      },
    ];
  }, [partyOptions, isVenyaSaleEdit, branchCompanyOptions]);

  const watchInvoiceDate = Form.useWatch('invoicedate', editForm);
  const watchTerms = Form.useWatch('terms', editForm);
  const watchShippingCharge = Form.useWatch('shipping_charge', editForm);
  const watchVatPercent = Form.useWatch('vat_percent', editForm);

  useEffect(() => {
    if (!isEditModalOpen || !isVenyaSaleEdit || !watchInvoiceDate) return;
    const base = dayjs(watchInvoiceDate);
    if (!base.isValid()) return;
    const termsRaw = String(watchTerms ?? '').trim();
    if (termsRaw === '') {
      editForm.setFieldsValue({ duedate: base });
      return;
    }
    const days = parseInt(termsRaw, 10);
    if (!Number.isNaN(days)) {
      editForm.setFieldsValue({ duedate: base.add(days, 'day') });
    }
  }, [watchInvoiceDate, watchTerms, isEditModalOpen, isVenyaSaleEdit, editForm]);

  const invoiceFromUrl = (searchParams.get('invoice') || '').trim();
  const typeFromUrl = (searchParams.get('type') || '').trim();

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
    setFilterType(typeFromUrl);
    resetList();
  }, [invoiceFromUrl, typeFromUrl, resetList]);

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

  useEffect(() => {
    if (!showSkuFilter || !skuSearch.trim() || !groups.length) return;
    setExpandedRowKeys(groups.map((group) => group.id));
  }, [showSkuFilter, skuSearch, groups]);

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
    setIsRefreshing(true);
    setExpandedRowKeys([]);
    setSelectedProducts({});
    setHasMore(true);
    setScrollFetching(false);
    setOffset(0);
    setPage(1);

    const invalidateStockQueries = async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey?.[0];
          const queryFirst = Array.isArray(key) ? key[0] : key;
          const targetFirst = Array.isArray(queryKey) ? queryKey[0] : queryKey;
          return queryFirst === targetFirst;
        },
      });
    };

    try {
      await invalidateStockQueries();
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
      toastInfo('Data refreshed');
    } catch (err) {
      console.error('Refresh error:', err);
      toastApiError(err);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, queryKey, refetch, listLimit]);

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

  const closeEditModal = () => {
    Object.values(skuLookupDebounceTimers.current).forEach(clearTimeout);
    skuLookupDebounceTimers.current = {};
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
      const row = { ...updated[index], [field]: value };
      // Venya sale.php calAmount: Amount = Price × P.Carat
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

  // Outward edit modals only (Sale / Out Memo / GIA) — not inward or stone-update
  const allowAddProductInEdit =
    actions.allowAddProductInEdit ??
    !String(actions.editGetEndpoint || "").includes("inward");

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

  const editProductTotals = useMemo(() => {
    let pcs = 0;
    let carat = 0;
    let amount = 0;
    fetchedProducts.forEach((p) => {
      pcs += Number(p.polish_pcs) || 0;
      carat += Number(p.polish_carat) || 0;
      amount += Number(p.sell_amount ?? p.amount) || 0;
    });
    // Venya sale edit: Price total = Amount / Carats
    return {
      pcs,
      carat,
      amount,
      price: carat > 0 ? amount / carat : 0,
    };
  }, [fetchedProducts]);

  // Venya sale edit (sgrid.php): SKU, P.Pcs, P.Carat, Cost, Price, Amount, LOC, Remark, Lab
  const isVenyaSaleEditGrid = isVenyaSaleEdit;

  useEffect(() => {
    if (!isEditModalOpen || !isVenyaSaleEdit) return;
    const vatPercent = Number(watchVatPercent) || 0;
    const base = editProductTotals.amount + (Number(watchShippingCharge) || 0);
    if (vatPercent > 0 && base > 0) {
      editForm.setFieldsValue({ vat_amount: (base * vatPercent / 100).toFixed(2) });
    } else {
      editForm.setFieldsValue({ vat_amount: '' });
    }
  }, [
    watchVatPercent,
    watchShippingCharge,
    editProductTotals.amount,
    isEditModalOpen,
    isVenyaSaleEdit,
    editForm,
  ]);

  const editProductColumns = useMemo(() => {
    const textCol = (title, field, width, opts = {}) => ({
      title,
      dataIndex: field,
      key: field,
      width,
      fixed: opts.fixed,
      render: (val, _record, idx) => (
        <Input
          type={opts.type || "text"}
          value={val ?? ""}
          placeholder={opts.placeholder || ""}
          className={styles.stockEditCellInput}
          onChange={(e) => handleProductFieldChange(idx, field, e.target.value)}
          onBlur={field === "sku" ? (e) => handleSkuLookup(idx, e.target.value, false) : undefined}
          onPressEnter={field === "sku" ? (e) => handleSkuLookup(idx, e.target.value, false) : undefined}
        />
      ),
    });

    const cols = [
      {
        title: "No",
        key: "no",
        width: 50,
        fixed: "left",
        align: "center",
        render: (_v, _r, idx) => idx + 1,
      },
      ...(isVenyaSaleEditGrid
        ? [
          textCol("SKU", "sku", 120, { fixed: "left", placeholder: "SKU" }),
          textCol("P.Pcs", "polish_pcs", 80, { type: "number", placeholder: "0" }),
          textCol("P.Carat", "polish_carat", 90, { type: "number", placeholder: "0.00" }),
          textCol("Cost", "cost", 90, { type: "number", placeholder: "0.00" }),
          textCol("Price", "sell_price", 90, { type: "number", placeholder: "0.00" }),
          textCol("Amount", "sell_amount", 100, { type: "number", placeholder: "0.00" }),
          textCol("LOC", "location", 90, { placeholder: "LOC" }),
          textCol("Remark", "remark", 120, { placeholder: "Remark" }),
          textCol("Lab", "lab", 80, { placeholder: "Lab" }),
        ]
        : [
          textCol("Mfg. code", "mfg_code", 100, { fixed: "left", placeholder: "Mfg" }),
          textCol("D. No.", "diamond_no", 90, { fixed: "left", placeholder: "D.No" }),
          textCol("SKU", "sku", 120, { fixed: "left", placeholder: "SKU" }),
          textCol("Pcs", "polish_pcs", 80, { type: "number", placeholder: "0" }),
          textCol("Carat", "polish_carat", 90, { type: "number", placeholder: "0.00" }),
          textCol("Cost", "cost", 90, { type: "number", placeholder: "0.00" }),
          textCol("Price", "sell_price", 90, { type: "number", placeholder: "0.00" }),
          textCol("Amount", "sell_amount", 100, { type: "number", placeholder: "0.00" }),
          textCol("LOC", "location", 90, { placeholder: "LOC" }),
          textCol("Remark", "remark", 120, { placeholder: "Remark" }),
          textCol("Lab", "lab", 80, { placeholder: "Lab" }),
          textCol("Group Type", "group_type", 100, { placeholder: "Group" }),
          textCol("Report No.", "report_no", 110, { placeholder: "Report" }),
          textCol("Shape", "shape", 90, { placeholder: "Shape" }),
          textCol("Clarity", "clarity", 90, { placeholder: "Clarity" }),
          textCol("Intensity", "intensity", 90, { placeholder: "Intensity" }),
          textCol("Overtone", "overtone", 90, { placeholder: "Overtone" }),
          textCol("Color", "color", 80, { placeholder: "Color" }),
        ]),
    ];

    if (allowAddProductInEdit) {
      cols.push({
        title: "",
        key: "action",
        width: 48,
        fixed: "right",
        align: "center",
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
      });
    }
    return cols;
  }, [allowAddProductInEdit, isVenyaSaleEditGrid, handleSkuLookup]);

  const editProductSkeletonColumns = useMemo(
    () =>
      editProductColumns.map((col) => ({
        ...col,
        render: () => (
          <span
            style={{
              display: "inline-block",
              width: "70%",
              height: 12,
              borderRadius: 6,
              background: "var(--color-bg-muted)",
            }}
          />
        ),
      })),
    [editProductColumns]
  );

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      const originalIds = originalSproducts
        || (editingRecord?.products || []).map((p) => (typeof p === 'object' ? p.id : p)).filter(Boolean).join(',');

      const originalCompanyId =
        editingRecord?.company != null && editingRecord?.company !== ''
          ? (isNaN(Number(editingRecord.company)) ? editingRecord.company : Number(editingRecord.company))
          : undefined;

      const payload = {
        id: editingRecord.id,
        type: editingRecord.type,
        sproducts: originalIds,
        ...values,
        ...(originalCompanyId != null ? { company: originalCompanyId } : {}),
        boc: values.boc ? 1 : 0,
        citi: values.citi ? 1 : 0,
        dbs: values.dbs ? 1 : 0,
        sc: values.sc ? 1 : 0,
        boc_sksm: values.boc_sksm ? 1 : 0,
        citi_sksm: values.citi_sksm ? 1 : 0,
        date: values.date?.format?.('YYYY-MM-DD') ?? values.date,
        invoicedate: values.invoicedate?.format?.('YYYY-MM-DD') ?? values.invoicedate,
        duedate: values.duedate?.format?.('YYYY-MM-DD') ?? values.duedate,
        shipping_charge: values.shipping_charge ?? 0,
        vat_percent: values.vat_percent ?? 0,
        products: fetchedProducts,
      };

      updateOutwardRecord(payload, {
        onSuccess: (res) => {
          if (res?.status === false) return;
          queryClient.invalidateQueries({ queryKey: ['GetProductData'] });
          queryClient.invalidateQueries({ queryKey: ['myInventorySummary'] });
          queryClient.invalidateQueries({ queryKey: ['OutwardList'] });
          queryClient.invalidateQueries({ queryKey: ['StockEditDetails'] });
          closeEditModal();
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const resolveReturnProductIds = (record) => {
    const selected = getSelected(record.id);
    if (selected.length) return selected;
    // Unique ids — JOIN duplicates must not sell/return the same stone multiple times
    return [...new Set(
      (record.products || []).map((p) => p.id).filter((id) => id != null).map(String),
    )];
  };

  const handleReturn = (record) => {
    const products = resolveReturnProductIds(record);
    if (!products.length) {
      toastWarning('No stones available to return');
      return;
    }
    if (actions.giaReturn) {
      setGiaReturnModal({ open: true, record, productIds: products });
      return;
    }
    setMemoConvertModal({ open: true, mode: 'return', record, productIds: products });
  };

  const handleMemoToSale = (record) => {
    const products = resolveReturnProductIds(record);
    if (!products.length) {
      toastWarning('No stones available to convert to sale');
      return;
    }
    setMemoConvertModal({ open: true, mode: 'sale', record, productIds: products });
  };

  const closeMemoConvertModal = () => {
    setMemoConvertModal({ open: false, mode: 'sale', record: null, productIds: [] });
    setMemoConvertLoading(false);
  };

  const handleMemoConvertConfirm = async (payload) => {
    const endpoint =
      memoConvertModal.mode === 'sale'
        ? actions.memoToSaleEndpoint
        : memoConvertModal.mode === 'purchase'
          ? actions.memoToPurchaseEndpoint
          : actions.returnEndpoint;
    if (!endpoint) return;
    setMemoConvertLoading(true);
    try {
      const body =
        memoConvertModal.mode === 'return'
          ? {
            id: payload.id,
            outid: payload.id,
            products: payload.products,
            record: payload.record,
            narretion: payload.narretion,
          }
          : payload;
      const ok = await postAction(endpoint, body);
      if (ok) {
        setSelectedProducts((prev) => ({ ...prev, [payload.id]: [] }));
        closeMemoConvertModal();
      } else {
        setMemoConvertLoading(false);
      }
    } catch {
      setMemoConvertLoading(false);
    }
  };

  const handleMemoToPurchase = (record) => {
    const products = resolveReturnProductIds(record);
    if (!products.length) {
      toastWarning('No stones available to purchase');
      return;
    }
    setMemoConvertModal({ open: true, mode: 'purchase', record, productIds: products });
  };

  const handleToggle = (record, inwardType) => {
    postAction(actions.toggleEndpoint, { id: record.id, inward_type: inwardType });
  };

  const handleToExport = (record, type) => {
    if (type === 'export' || type === 'consign') {
      setToExportModal({ open: true, record, convertType: type });
      return;
    }
    postAction(actions.toExportEndpoint, { id: record.id, type });
  };

  const closeToExportModal = () => {
    setToExportModal({ open: false, record: null, convertType: 'export' });
    setToExportLoading(false);
  };

  const handleToExportConfirm = async (payload) => {
    if (!actions.toExportEndpoint) return;
    setToExportLoading(true);
    try {
      const ok = await postAction(actions.toExportEndpoint, payload);
      if (ok) closeToExportModal();
      else setToExportLoading(false);
    } catch {
      setToExportLoading(false);
    }
  };

  const handleDelete = () => {
    const recordId = deleteModal.record?.id;
    if (!recordId) return;
    deleteRecord(recordId, {
      onSuccess: (data) => {
        if (data?.status !== false) {
          setAllGroups((prev) => prev.filter((item) => item.id !== recordId));
        }
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey?.[0];
            const queryFirst = Array.isArray(key) ? key[0] : key;
            const targetFirst = Array.isArray(queryKey) ? queryKey[0] : queryKey;
            return queryFirst === targetFirst;
          },
        });
        queryClient.invalidateQueries({ queryKey: ['GetProductData'] });
        queryClient.invalidateQueries({ queryKey: ['myInventorySummary'] });
        queryClient.invalidateQueries({ queryKey: ['OutwardList'] });
        if (typeof refetch === 'function') {
          refetch();
        }
        closeDelete();
      },
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

  const toggleMainRowExpand = useCallback((record) => {
    const key = record?.id;
    if (key == null) return;
    setExpandedRowKeys((prev) =>
      (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]),
    );
  }, []);

  const getMainRowProps = useCallback(
    (record) => ({
      onClick: (event) => {
        const target = event.target;
        if (
          target.closest(
            'a, button, .ant-btn, .anticon, .actionIcons, .actionBtn, .ant-table-row-expand-icon-cell, .ant-table-row-expand-icon, input, textarea, select, .ant-checkbox-wrapper, .ant-select, .ant-dropdown, .ant-picker, [data-no-row-expand]',
          )
        ) {
          return;
        }
        toggleMainRowExpand(record);
      },
      style: { cursor: 'pointer' },
    }),
    [toggleMainRowExpand],
  );

  const renderExpandedRow = (group) => {
    const products = (group.products || []).filter((product) => skuMatchesProduct(product, skuSearch));
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
      width: actions.entryWidth || 110,
      render: (val, record) => {
        const entry = String(val ?? record?.id ?? '').trim();
        return <Text strong style={{ whiteSpace: 'nowrap' }}>{entry ? `#${entry}` : '—'}</Text>;
      },
    },
    {
      title: 'Company',
      key: 'company',
      width: 220,
      ellipsis: true,
      render: (_, record) => {
        const compId = record.company != null ? Number(record.company) : null;
        const compName = record.company_name || companyMap.get(compId) || (compId ? `Company #${compId}` : '—');
        return (
          <Tag color="blue" style={{ fontWeight: 600 }}>
            {compName}
          </Tag>
        );
      },
    },
    {
      title: 'Type',
      key: 'type',
      width: actions.typeWidth || 100,
      render: (_, record) => {
        const displayType = record.type || record.inward_type;
        return (
          <Tag color={getTypeColor(displayType)} style={{ textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {String(displayType || '-')}
          </Tag>
        );
      },
    },
    {
      title: 'Party',
      key: 'party',
      width: actions.partyWidth || 180,
      ellipsis: true,
      render: (_, record) => {
        if (record.party_name) return record.party_name;
        if (stockType === 'inter_transfer' || stockType === 'inter_memo') {
          const compId = Number(record.party);
          if (compId && companyMap.has(compId)) {
            return companyMap.get(compId);
          }
        }
        return record.party || '-';
      },
    },
    {
      title: 'Invoice',
      dataIndex: 'invoiceno',
      key: 'invoiceno',
      width: actions.invoiceWidth || 130,
      ellipsis: true,
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      width: actions.referenceWidth || 140,
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: actions.dateWidth || 100,
      render: (v) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')}
        </span>
      ),
    },
    {
      title: 'Stones',
      key: 'stoneCount',
      width: 60,
      align: 'center',
      render: (_, record) => (record.products || []).length,
    },
    {
      title: 'Pcs',
      key: 'totalPcs',
      width: 55,
      align: 'center',
      render: (_, record) => (record.products || []).reduce(
        (sum, p) => sum + Number(p.polish_pcs || 0),
        0
      ),
    },
    {
      title: 'Carat',
      key: 'totalCarat',
      width: 90,
      align: 'center',
      render: (_, record) => (record.products || []).reduce(
        (sum, p) => sum + Number(p.polish_carat || 0),
        0
      ).toFixed(2),
    },
    {
      title: 'Price',
      key: 'totalPrice',
      width: 90,
      align: 'right',
      render: (_, record) => {
        const price = (record.products || []).reduce(
          (sum, p) => sum + Number(p.sell_price ?? p.price ?? 0),
          0
        );
        return Number(price || 0).toLocaleString();
      },
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
        return <Text strong style={{ whiteSpace: 'nowrap' }}>${Number(amount || 0).toLocaleString()}</Text>;
      },
    },
    ...(actions.showReturn || actions.showMemoToSale || actions.showMemoToPurchase || actions.showToConsign || actions.showToExport || actions.showToPurchase || actions.showToImport
      ? [{
        title: 'Operations',
        key: 'buttons',
        width: actions.operationsWidth || (() => {
          const count = [
            actions.showReturn,
            actions.showMemoToSale,
            actions.showMemoToPurchase,
            actions.showToConsign,
            actions.showToExport,
            actions.showToPurchase,
            actions.showToImport,
          ].filter(Boolean).length;
          if (count <= 1) return 115;
          if (count === 2) return 165;
          return 230;
        })(),
        align: 'center',
        render: (_, record) => {
          const displayType = record.type || record.inward_type;
          const groupProductCount = (record.products || []).length;
          const isAlreadyReturned =
            record.status === 'returned' ||
            record.status === 'close_sale' ||
            record.status === 'close_memo' ||
            record.status === 'close_export';
          const returnDisabled = actionLoading || groupProductCount === 0 || isAlreadyReturned;

          return (
            <div className={styles.actionButtons}>
              {actions.showReturn && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionReturn} ${returnDisabled ? styles.actionDisabled : ''}`}
                  disabled={returnDisabled}
                  title={isAlreadyReturned ? 'Already returned' : ''}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!returnDisabled) handleReturn(record);
                  }}
                >
                  <RollbackOutlined />
                  {displayType === 'export' ? 'Sale Return' : (actions.returnBtnText || 'Return')}
                </button>
              )}
              {actions.showMemoToSale && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionSale} ${returnDisabled ? styles.actionDisabled : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!returnDisabled) handleMemoToSale(record);
                  }}
                >
                  <DollarOutlined />
                  Sale
                </button>
              )}
              {actions.showMemoToPurchase && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionPurchase} ${returnDisabled ? styles.actionDisabled : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!returnDisabled) handleMemoToPurchase(record);
                  }}
                >
                  <ShoppingCartOutlined />
                  Purchase
                </button>
              )}
              {actions.showToConsign && displayType === 'memo' && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionConsign} ${actionLoading ? styles.actionDisabled : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!actionLoading) handleToExport(record, 'consign');
                  }}
                >
                  <SwapOutlined />
                  Consign
                </button>
              )}
              {actions.showToExport && displayType === 'sale' && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionExport} ${actionLoading ? styles.actionDisabled : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!actionLoading) handleToExport(record, 'export');
                  }}
                >
                  <ExportOutlined />
                  To Export
                </button>
              )}
              {actions.showToPurchase && displayType === 'import' && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionPurchase} ${actionLoading ? styles.actionDisabled : ''}`}
                  onClick={() => { if (!actionLoading) handleToggle(record, 'purchase'); }}
                >
                  <ShoppingCartOutlined />
                  To Purchase
                </button>
              )}
              {actions.showToImport && displayType === 'purchase' && (
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionImport} ${actionLoading ? styles.actionDisabled : ''}`}
                  onClick={() => { if (!actionLoading) handleToggle(record, 'import'); }}
                >
                  <ImportOutlined />
                  To Import
                </button>
              )}
            </div>
          );
        },
      }]
      : []),
    {
      title: 'Action',
      key: 'action',
      width: 120,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <div className={styles.actionIcons}>
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
      ),
    },
  ];

  const listLoading = infiniteScroll
    ? ((isLoading || isFetching) && offset === 0)
    : (isLoading || isFetching);

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
        activeCount={[selectedCompany, party, invoice, filterType, skuSearch, fromDate, toDate].filter(Boolean).length}
        onClear={() => {
          setSelectedCompany('');
          setParty('');
          setInvoice('');
          setFilterType('');
          setSkuSearch('');
          setFromDate(null);
          setToDate(null);
          resetList();
        }}
        clearDisabled={!selectedCompany && !party && !invoice && !filterType && !skuSearch && !fromDate && !toDate}
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
              loading={isRefreshing || (isFetching && (!infiniteScroll || offset === 0))}
              onClick={refreshList}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <FilterField>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All Company"
            className={filterPanelStyles.filterControl}
            value={selectedCompany || undefined}
            onChange={(v) => { setSelectedCompany(v || ''); resetList(); }}
            options={branchCompanies}
            style={{ minWidth: 150, borderRadius: 8 }}
          />
        </FilterField>
        {showSkuFilter && (
          <FilterField>
            <Input
              className={filterPanelStyles.filterControl}
              value={skuSearch}
              onChange={(e) => { setSkuSearch(e.target.value); resetList(); }}
              onPressEnter={refreshList}
              placeholder="Enter Stone / SKU"
              allowClear
            />
          </FilterField>
        )}
        <FilterField>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="All Party Name"
            className={filterPanelStyles.filterControl}
            value={party || undefined}
            onChange={(v) => { setParty(v || ''); resetList(); }}
            options={partyOptions}
            style={{ borderRadius: 8 }}
            virtual
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
            borderRadius="8px"
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
              style={{ minWidth: 140, borderRadius: 8 }}
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
            loading={tableLoading || isRefreshing}
            className={styles.tableWrapper}
            size="small"
            bordered
            tableLayout="fixed"
            scroll={{ x: 1710, y: tableHeight }}
            onScroll={infiniteScroll && !showSkeleton ? handleTableScroll : undefined}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No records found. Adjust filters or create a new entry."
                />
              ),
            }}
            onRow={showSkeleton ? undefined : getMainRowProps}
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
                    <Text strong>
                      {infiniteScroll
                        ? `Total ${groups.length.toLocaleString()} ${groups.length === 1 ? 'entry' : 'entries'}`
                        : `Showing page ${page} · ${groups.length} ${groups.length === 1 ? 'entry' : 'entries'}`}
                    </Text>
                    <Text type="secondary" className={styles.totalStoneLabel} style={{ marginLeft: 12 }}>
                      Total Stone: <span className={styles.totalStoneValue}>{totalItems.toLocaleString()}</span>
                    </Text>
                  </div>
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

      <MemoConvertModal
        open={memoConvertModal.open}
        mode={memoConvertModal.mode}
        returnVariant={
          actions.returnVariant ||
          (actions.returnEndpoint?.includes('/inward-stock/return')
            ? 'purchase'
            : (stockType === 'sale' || stockType === 'inter_transfer' ? 'sale' : 'memo'))
        }
        record={memoConvertModal.record}
        productIds={memoConvertModal.productIds}
        products={memoConvertModal.record?.products || []}
        loading={memoConvertLoading || actionLoading}
        onClose={closeMemoConvertModal}
        onConfirm={handleMemoConvertConfirm}
      />

      <ConvertToExportModal
        open={toExportModal.open}
        record={toExportModal.record}
        convertType={toExportModal.convertType || 'export'}
        loading={toExportLoading || actionLoading}
        onClose={closeToExportModal}
        onConfirm={handleToExportConfirm}
      />

      <TransactionInvoicePreviewModal
        open={invoiceModal.open}
        onClose={closeInvoice}
        record={invoiceModal.record}
        invoiceTitle={invoiceTitle}
        printType={actions.printType}
        company={invoiceCompany}
        selectedProductIds={
          invoiceModal.record && getSelected(invoiceModal.record.id).length
            ? getSelected(invoiceModal.record.id)
            : null
        }
      />

      {actions.showEdit && (
        <BaseModal
          title={editModalTitle}
          subtitle={editModalSubtitle}
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
                {isEditLoading ? (
                  <SkeletonForm fields={6} />
                ) : (
                  <>
                    <DynamicForm fields={editMainFields} />
                    {isVenyaSaleEdit ? (
                      <Row gutter={[16, 0]} className={styles.stockEditPayRow}>
                        <Col span={24}>
                          <Form.Item
                            label={<span className={styles.stockEditBankLabel}>Bank</span>}
                            colon={false}
                          >
                            <div className={`${styles.stockEditBankSlot} ${styles.stockEditBankSlotWide}`}>
                              <Form.Item name="boc" valuePropName="checked" noStyle>
                                <Checkbox>BOC</Checkbox>
                              </Form.Item>
                              <Form.Item name="citi" valuePropName="checked" noStyle>
                                <Checkbox>Citi</Checkbox>
                              </Form.Item>
                              <Form.Item name="dbs" valuePropName="checked" noStyle>
                                <Checkbox>DBS</Checkbox>
                              </Form.Item>
                              <Form.Item name="sc" valuePropName="checked" noStyle>
                                <Checkbox>SC</Checkbox>
                              </Form.Item>
                              <Form.Item name="boc_sksm" valuePropName="checked" noStyle>
                                <Checkbox>BOC-SKSM</Checkbox>
                              </Form.Item>
                              <Form.Item name="citi_sksm" valuePropName="checked" noStyle>
                                <Checkbox>DBS-SKSM</Checkbox>
                              </Form.Item>
                            </div>
                          </Form.Item>
                        </Col>
                      </Row>
                    ) : null}
                  </>
                )}
                <div className={styles.stockEditProductsHead}>
                  <span>{isVenyaSaleEdit ? `Total Record : ${fetchedProducts.length}` : 'Products'}</span>
                  {allowAddProductInEdit && !isEditLoading ? (
                    <Button
                      type="primary"
                      size="small"
                      icon={<PlusOutlined />}
                      className={styles.stockEditAddProductBtn}
                      onClick={handleAddProductRow}
                    >
                      Add New Data
                    </Button>
                  ) : null}
                </div>
                <div className={styles.stockEditProductWrap}>
                  <Table
                    className={styles.stockEditProductTable}
                    loading={false}
                    columns={isEditLoading ? editProductSkeletonColumns : editProductColumns}
                    dataSource={isEditLoading ? Array.from({ length: 3 }, (_, i) => ({ id: `sk-p-${i}` })) : fetchedProducts}
                    rowKey={(r) => r.id ?? r._tempId}
                    pagination={false}
                    size="small"
                    scroll={{ x: isVenyaSaleEditGrid ? 980 : 1900, y: 180 }}
                    locale={
                      allowAddProductInEdit
                        ? { emptyText: 'No products — click Add New Data' }
                        : undefined
                    }
                  />
                  {!isEditLoading && fetchedProducts.length > 0 ? (
                    <div className={`${styles.stockEditTotalsBar} ${styles.stockEditTotalsBarCompact}`}>
                      <div className={styles.stockEditTotalsMetrics}>
                        <span>Pcs : <b>{editProductTotals.pcs}</b></span>
                        <span>Carats : <b>{editProductTotals.carat.toFixed(3)}</b></span>
                        <span>Price : <b>{editProductTotals.price.toFixed(2)}</b></span>
                        <span>Amount : <b>{editProductTotals.amount.toFixed(2)}</b></span>
                      </div>
                      {!isVenyaSaleEdit ? (
                        <Form.Item
                          name="narretion"
                          label="Narration"
                          colon={false}
                          className={styles.stockEditTotalsNarration}
                        >
                          <Input placeholder="Enter Narration" allowClear />
                        </Form.Item>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {isVenyaSaleEdit && !isEditLoading ? (
                  <>
                    <Row gutter={[12, 8]} className={styles.stockEditExportRow}>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="shipping_name" label="Shipping">
                          <Select
                            allowClear
                            placeholder="Select Shipping"
                            options={shippingOptions}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="origin_of" label="Origin of">
                          <Select
                            allowClear
                            placeholder="Select Origin"
                            options={originOptions}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="manufacture_origin" label="Manf.Origin">
                          <Select
                            allowClear
                            placeholder="Select Manf Origin"
                            options={originOptions}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="shipping_charge" label="Charge">
                          <InputNumber min={0} placeholder="0.00" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="cif" label="C.I.F">
                          <Input placeholder="C.I.F" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="vat_percent" label="VAT">
                          <Select
                            options={[
                              { value: '0', label: 'No VAT' },
                              { value: '7', label: 'VAT 7%' },
                            ]}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={6}>
                        <Form.Item name="vat_amount" label="VAT Amount">
                          <Input placeholder="0.00" disabled />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="narretion" label="Narration" className={styles.stockEditSaleNarration}>
                      <Input.TextArea rows={3} placeholder="Narretion" />
                    </Form.Item>
                  </>
                ) : null}
              </Form>
            </>
          )}
          saveBtnText={isVenyaSaleEdit ? 'Update Data' : 'Update'}
          width={isVenyaSaleEdit ? 1360 : 1280}
        />
      )}
    </div>
  );
};

export default TransactionStockTemplate;
