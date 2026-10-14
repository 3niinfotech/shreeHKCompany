import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Form, Input, Button, Table, InputNumber, Typography, Upload, Tag, Spin } from 'antd';
import {
  ImportOutlined,
  UnorderedListOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  InboxOutlined,
  FormOutlined,
  UploadOutlined,
} from '@ant-design/icons';

const INWARD_PAGE_ICONS = {
  import: ImportOutlined,
  purchase: ShoppingCartOutlined,
  memo: FileTextOutlined,
  consign: InboxOutlined,
};
import { RefreshCcw, PlusCircle, Trash2, CheckCircle, FileSpreadsheet, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toastApiError } from "../../../utils/toastNotify";
import DynamicForm from '../../../components/common/ui/DynamicFormField';
import { useFetchApi, usePostApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../api/endpoints';
import useFormHandleChange from '../../../hooks/useFormHandleChange';
import useBranchCompanies from '../../../hooks/useBranchCompanies';
import useTableBodyScrollHeight from '../../../hooks/useTableBodyScrollHeight';
import ValidationTableModal from '../../../components/common/modals/ValidationTableModal';
import AICertificateScannerModal from '../../../components/ai/AICertificateScannerModal';
import { parseInwardImportExcel } from './inwardExcelImport';

import defaultStyles from "../../../assets/scss/pages/transaction/inwardpurchase.module.scss";
import PageHeroHeader from '../../../components/common/PageHeroHeader';

const { Text } = Typography;

const INITIAL_ITEM_STATE = {
  mfgCode: '', dNo: '', sku: '', rPcs: 0, pPcs: 0, pCarat: 0, cost: 0, price: 0, amount: 0,
  mainColor: '', loc: '', lab: '', reportNo: '', shape: '', clarity: '', intensity: '',
  overtone: '', color: '', size: '', polish: '', symm: '', cut: '', floIntensity: '',
  measurements: '', tablePer: '', depthPer: '', girdle: '', bgm: '', package: '', remark: '', groupType: ''
};

function createInitialLineItems(count = 1) {
  const baseKey = Date.now();
  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    ...INITIAL_ITEM_STATE,
    key: baseKey + index,
  }));
}

function formatProductsPayload(items) {
  return items.map(item => ({
    mfg_code: item.mfgCode || "",
    diamond_no: item.dNo || "",
    sku: String(item.sku || "").trim(),
    rought_pcs: (item.rPcs || item.pPcs || "")?.toString(),
    polish_pcs: (item.pPcs || item.rPcs || "")?.toString(),
    polish_carat: item.pCarat?.toString() || "0",
    price: item.price?.toString() || "0",
    amount: item.amount?.toString() || "0",
    cost: item.cost?.toString() || "",
    main_color: item.mainColor || "",
    location: item.loc || "",
    lab: item.lab || "",
    group_type: item.groupType || "",
    remark: item.remark || "",
    bgm: item.bgm || "",
    package: item.package || "",
    attr: {
      report_no: item.reportNo || "",
      shape: item.shape || "",
      clarity: item.clarity || "",
      intensity: item.intensity || "",
      overtone: item.overtone || "",
      color: item.color || "",
      size: item.size || "",
      polish: item.polish || "",
      symmentry: item.symm || "",
      cut: item.cut || "",
      mesurment: item.measurements || "",
      table_pc: item.tablePer || "",
      depth_pc: item.depthPer || "",
      gridle: item.girdle || "",
      f_intensity: item.floIntensity || "",
      eyeclean: ""
    }
  }));
}

function getFilledLineItems(items) {
  return items.filter((item) => String(item.sku || '').trim());
}

function normalizeLineItem(item) {
  const price = Number(item.price) || 0;
  let pCarat = Number(item.pCarat) || 0;
  let amount = Number(item.amount) || 0;

  if (pCarat > 0 && price > 0) {
    amount = Math.round(pCarat * price * 100) / 100;
  } else if (price > 0 && amount > 0) {
    pCarat = Math.round((amount / price) * 10000) / 10000;
  }

  return { ...item, pCarat, price, amount };
}

function getLineItemValidationError(item, rowNo) {
  const prefix = `Row ${rowNo}:`;
  if (!String(item.sku || '').trim()) return `${prefix} SKU is required.`;
  if (!item.pPcs || Number(item.pPcs) <= 0) return `${prefix} Polish Pcs must be greater than 0.`;
  if (!item.pCarat || item.pCarat <= 0) return `${prefix} Polish Carat must be greater than 0.`;
  if (!item.price || item.price <= 0) return `${prefix} Price must be greater than 0.`;
  const amount = item.amount || item.pCarat * item.price;
  if (!amount || amount <= 0) return `${prefix} Amount must be greater than 0.`;
  return null;
}

function getFirstLineItemValidationError(items) {
  const filledItems = getFilledLineItems(items);
  if (filledItems.length === 0) {
    return 'Add at least one line item with SKU, Polish Pcs, Polish Carat, Price and Amount.';
  }

  for (let i = 0; i < items.length; i += 1) {
    if (!String(items[i].sku || '').trim()) continue;
    const error = getLineItemValidationError(items[i], i + 1);
    if (error) return error;
  }

  return null;
}

function invalidateInventoryCaches(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['GetProductData'] });
  queryClient.invalidateQueries({ queryKey: ['myInventorySummary'] });
  queryClient.invalidateQueries({ queryKey: ['InventoryList'] });
}

const InwardTransactionForm = ({
  title = "Inward - Purchase Transaction",
  showRPcs = false,
  showMfgCode = true,
  purchaseFieldsOverride,
  defaultInwardType = "purchase",
  typeOptions,
  useModernLayout = false,
  stylesModule,
  showExcelUpload = false,
  skipExistCheck = false,
  initialLineCount = 1,
  visibleRowCount = 4,
  tableScrollY,
  scrollableTable = false,
}) => {
  const styles = stylesModule || defaultStyles;
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiOcrModalOpen, setAiOcrModalOpen] = useState(false);
  const [existData, setExistData] = useState([]);
  const [checkMessage, setCheckMessage] = useState('');
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelFileName, setExcelFileName] = useState('');
  const tableWrapRef = useRef(null);

  const handleApplyScanData = (scanData) => {
    setItems(prevItems => {
      const emptyIndex = prevItems.findIndex(i => !i.sku && (!i.pCarat || i.pCarat === 0));
      const targetIndex = emptyIndex >= 0 ? emptyIndex : prevItems.length;
      const updated = [...prevItems];
      const targetItem = updated[targetIndex] || { ...INITIAL_ITEM_STATE, key: Date.now() };

      updated[targetIndex] = {
        ...targetItem,
        reportNo: scanData.reportNo || targetItem.reportNo,
        lab: scanData.lab || targetItem.lab,
        shape: scanData.shape || targetItem.shape,
        pCarat: scanData.pCarat || targetItem.pCarat,
        color: scanData.color || targetItem.color,
        clarity: scanData.clarity || targetItem.clarity,
        cut: scanData.cut || targetItem.cut,
        polish: scanData.polish || targetItem.polish,
        symm: scanData.symm || targetItem.symm,
        floIntensity: scanData.floIntensity || targetItem.floIntensity,
        depthPer: scanData.depthPer || targetItem.depthPer,
        tablePer: scanData.tablePer || targetItem.tablePer,
        measurements: scanData.measurements || targetItem.measurements,
      };
      return updated;
    });
  };

  const {
    form,
    items,
    setItems,
    addRow,
    removeRow,
    updateTableValue,
  } = useFormHandleChange({}, createInitialLineItems(initialLineCount));

  const measuredScrollY = useTableBodyScrollHeight(tableWrapRef, [
    items.length,
    scrollableTable,
    useModernLayout,
  ]);

  const inwardType = Form.useWatch('type', form) || defaultInwardType;
  const PageIcon = INWARD_PAGE_ICONS[inwardType] || FormOutlined;
  const showRoughPcs = showRPcs || inwardType === 'purchase';

  const queryClient = useQueryClient();
  const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
  const {
    options: branchCompanyOptions,
    isLoading: isBranchCompanyLoading,
  } = useBranchCompanies();
  const {
    data: incrementData,
    refetch: refetchIncrement,
  } = useFetchApi('GetIncrement', ENDPOINTS.common.increment, {}, 'GET', {
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const { mutate: submitInward } = usePostApiRequest(ENDPOINTS.inward.checkExist, 'GetIncrementCheckExists', { showToast: false });
  const { mutate: saveInward, isLoading: isSaving } = usePostApiRequest(ENDPOINTS.inward.save, 'inwardSave');

  const applyHeaderDefaults = (increment = null) => {
    const today = dayjs();
    form.setFieldsValue({
      entry: increment?.inward ?? form.getFieldValue('entry') ?? '',
      reference: increment?.reference ?? form.getFieldValue('reference') ?? '',
      date: today,
      terms: 0,
      dueDate: today,
      type: defaultInwardType,
    });
  };

  const handleValuesChange = (changedValues, allValues) => {
    if (changedValues.date || changedValues.terms !== undefined) {
      const { date, terms } = allValues;
      if (date) {
        const daysToAdd = parseInt(terms) || 0;
        form.setFieldsValue({ dueDate: dayjs(date).add(daysToAdd, 'day') });
      }
    }
  };

  // Always set today's Date / Due Date even if increment API is slow/empty
  useEffect(() => {
    applyHeaderDefaults(incrementData?.Data || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incrementData, defaultInwardType]);

  useEffect(() => {
    // First paint: date must be selected immediately
    if (!form.getFieldValue('date')) {
      form.setFieldsValue({
        date: dayjs(),
        dueDate: dayjs(),
        terms: 0,
        type: defaultInwardType,
      });
    }
  }, [form, defaultInwardType]);

  const inwardTypeOptions = typeOptions || [
    { value: 'import', label: 'Import' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'memo', label: 'In Memo' },
    { value: 'consign', label: 'In Consignment' },
  ];

  const companyOptions = useMemo(() => {
    const rawData = companyData?.Data || companyData?.data || (Array.isArray(companyData) ? companyData : []);
    return Array.isArray(rawData) ? rawData.map(c => ({ value: c.id, label: c.name })) : [];
  }, [companyData]);

  const handleExcelUpload = async (uploadInfo) => {
    const file = uploadInfo.file?.originFileObj || uploadInfo.file;
    if (!file || uploadInfo.file?.status === 'removed') return;

    setExcelLoading(true);
    const loadingToastId = toast.loading('Reading Excel file…');
    try {
      // Let Spin / button loading paint before heavy parse work
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));

      const parsedRows = await parseInwardImportExcel(file);
      const mappedRows = parsedRows.map((row, index) => ({
        ...INITIAL_ITEM_STATE,
        ...normalizeLineItem(row),
        key: Date.now() + index,
      }));

      toast.loading(`Loading ${mappedRows.length} row(s) into the table…`, {
        id: loadingToastId,
      });
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));

      // Same data — defer heavy table paint so UI stays responsive on large files
      startTransition(() => {
        setItems(mappedRows);
      });
      setIsSubmitted(false);
      setExcelFileName(file.name || 'Excel file');
      toast.success(`${mappedRows.length} row(s) loaded from Excel.`, {
        id: loadingToastId,
      });
    } catch (error) {
      toast.error(error?.message || 'Failed to read Excel file.', {
        id: loadingToastId,
      });
    } finally {
      setExcelLoading(false);
    }
  };

  const filledLineCount = useMemo(
    () => items.filter((item) => String(item.sku || '').trim()).length,
    [items],
  );

  const purchaseFields = useMemo(() => {
    if (purchaseFieldsOverride) return purchaseFieldsOverride;

    // Import: row1 = Entry…Company | row2 = Party, Date, Terms, Due Date, Excel
    const colSpan = showExcelUpload ? 4 : 6;
    const colFlex = showExcelUpload ? '1 1 0' : undefined;
    const colStyle = showExcelUpload
      ? { maxWidth: '20%', flex: '1 1 0', width: '20%' }
      : undefined;

    const companyField = {
      name: 'operating_company_id',
      label: 'Company',
      span: colSpan,
      flex: colFlex,
      style: colStyle,
      type: 'select',
      required: true,
      loading: isBranchCompanyLoading,
      options: branchCompanyOptions,
      placeholder: 'Select Company (e.g. ShreeHK / KG)',
      allowClear: false,
    };

    const partyField = {
      name: "company",
      label: "Party",
      span: colSpan,
      flex: colFlex,
      style: colStyle,
      type: 'select',
      required: true,
      loading: isCompanyLoading,
      options: companyOptions,
      placeholder: 'Select Party',
      allowClear: true,
    };

    // Forces Party/Date/Terms/Due Date/Excel onto the next row
    const rowBreak = {
      name: '_row_break',
      type: 'custom',
      noFormItem: true,
      flex: '0 0 100%',
      style: {
        flex: '0 0 100%',
        maxWidth: '100%',
        width: '100%',
        height: 0,
        padding: 0,
        margin: 0,
        overflow: 'hidden',
      },
      render: () => null,
    };

    const fields = [
      { name: "entry", label: "Entry No", span: colSpan, flex: colFlex, style: colStyle, disabled: true },
      { name: "type", label: "Inward Type", span: colSpan, flex: colFlex, style: colStyle, type: 'select', required: true, options: inwardTypeOptions },
      { name: "reference", label: "Reference", span: colSpan, flex: colFlex, style: colStyle },
      { name: "invoiceNo", label: "Invoice No", span: colSpan, flex: colFlex, style: colStyle, required: true },
      ...(showExcelUpload ? [companyField, rowBreak] : []),
      partyField,
      { name: "date", label: "Date", span: colSpan, flex: colFlex, style: colStyle, type: 'date', required: true },
      { name: "terms", label: "Terms (Days)", span: colSpan, flex: colFlex, style: colStyle, type: 'number', required: true },
      { name: "dueDate", label: "Due Date", span: colSpan, flex: colFlex, style: colStyle, type: 'date', required: true, disabled: true },
      ...(!showExcelUpload ? [companyField] : []),
    ];

    if (showExcelUpload) {
      fields.push({
        name: 'excel_upload',
        type: 'custom',
        noFormItem: true,
        span: colSpan,
        flex: colFlex,
        style: colStyle,
        render: () => (
          <div className={styles.excelUploadFieldAlign}>
            <span className={styles.excelUploadFieldLabel}>Excel Import</span>
            <div className={`${styles.excelUploadPanel} ${styles.excelUploadPanelInline}`}>
              <div className={styles.excelUploadCompact}>
                <div className={styles.excelUploadMeta}>
                  <FileSpreadsheet size={15} strokeWidth={2} />
                  <div className={styles.excelUploadCopy}>
                    <span className={styles.excelUploadHint}>
                      {excelLoading
                        ? 'Reading Excel… please wait'
                        : 'Import Format · auto-fills line items'}
                    </span>
                  </div>
                </div>
                <div className={styles.excelUploadActions}>
                  {excelFileName && !excelLoading ? (
                    <Tag color="success" className={styles.excelUploadTag} title={excelFileName}>
                      {filledLineCount} row{filledLineCount === 1 ? '' : 's'}
                    </Tag>
                  ) : null}
                  <Upload
                    accept=".xls,.xlsx"
                    showUploadList={false}
                    beforeUpload={() => false}
                    onChange={handleExcelUpload}
                    disabled={excelLoading}
                  >
                    <Button size="small" icon={<UploadOutlined />} loading={excelLoading}>
                      {excelLoading ? 'Reading…' : excelFileName ? 'Replace' : 'Upload .xlsx'}
                    </Button>
                  </Upload>
                </div>
              </div>
            </div>
          </div>
        ),
      });
    }

    return fields;
  }, [
    purchaseFieldsOverride,
    inwardTypeOptions,
    isCompanyLoading,
    companyOptions,
    isBranchCompanyLoading,
    branchCompanyOptions,
    showExcelUpload,
    styles,
    excelFileName,
    excelLoading,
    filledLineCount,
  ]);

  const handleUpdateCell = (key, field, value) => {
    updateTableValue(key, field, value, (item) => {
      if (field === 'rPcs') {
        return {
          ...item,
          rPcs: value,
        };
      }
      if (field === 'pPcs') {
        return {
          ...item,
          pPcs: value,
        };
      }
      if (field === 'pCarat' || field === 'price') {
        const carat = field === 'pCarat' ? (value || 0) : (item.pCarat || 0);
        const price = field === 'price' ? (value || 0) : (item.price || 0);
        return { ...item, amount: Math.round(carat * price * 100) / 100 };
      }
      if (field === 'amount') {
        const amount = value || 0;
        const price = item.price || 0;
        if (price > 0 && amount > 0) {
          return { ...item, amount, pCarat: Math.round((amount / price) * 10000) / 10000 };
        }
        return { ...item, amount };
      }
      return item;
    });
  };

  const isRequiredFieldEmpty = (record, field) => {
    if (field === 'sku') return !String(record.sku || '').trim();
    if (field === 'pPcs') return !record.pPcs || Number(record.pPcs) <= 0;
    if (field === 'pCarat') return !record.pCarat || Number(record.pCarat) <= 0;
    if (field === 'price') return !record.price || Number(record.price) <= 0;
    if (field === 'amount') return !record.amount || Number(record.amount) <= 0;
    return false;
  };

  const isLineRowActive = (record) =>
    String(record.sku || '').trim() ||
    Number(record.pPcs) > 0 ||
    Number(record.pCarat) > 0 ||
    Number(record.price) > 0 ||
    Number(record.amount) > 0;

  // Same validation rules — compute once instead of items.some() per cell (O(n²) → O(n))
  const anyActiveLine = useMemo(
    () =>
      items.some(
        (record) =>
          String(record.sku || '').trim() ||
          Number(record.pPcs) > 0 ||
          Number(record.pCarat) > 0 ||
          Number(record.price) > 0 ||
          Number(record.amount) > 0,
      ),
    [items],
  );
  const firstItemKey = items[0]?.key;
  const useVirtualTable = items.length >= 80;

  const renderInput = (record, field, placeholder, type = "text", widthOverride) => {
    const isRequired = ['sku', 'pPcs', 'pCarat', 'price', 'amount'].includes(field);
    const shouldValidateRow =
      isLineRowActive(record) || (!anyActiveLine && firstItemKey === record.key);
    const hasError =
      Boolean(isSubmitted) &&
      isRequired &&
      shouldValidateRow &&
      isRequiredFieldEmpty(record, field);

    const width = widthOverride ?? (type === 'number' ? 80 : 90);
    const errorStyle = hasError
      ? {
          width,
          border: '0.5px solid var(--color-error, #dc3d43)',
          boxShadow: 'none',
          outline: 'none',
        }
      : { width };

    return type === 'number' ? (
      <InputNumber
        value={record[field]}
        onChange={(val) => handleUpdateCell(record.key, field, val)}
        status={hasError ? 'error' : undefined}
        className={hasError ? styles.requiredFieldError : undefined}
        style={errorStyle}
      />
    ) : (
      <Input
        value={record[field]}
        onChange={(e) => handleUpdateCell(record.key, field, e.target.value)}
        placeholder={placeholder}
        status={hasError ? 'error' : undefined}
        className={hasError ? styles.requiredFieldError : undefined}
        style={errorStyle}
      />
    );
  };

  const baseColumns = [
    { title: 'No.', width: 50, fixed: 'left', render: (_, __, index) => index + 1 },
    ...(showMfgCode
      ? [{ title: 'Mfg. code', width: 100, fixed: 'left', render: (_, r) => renderInput(r, 'mfgCode', 'Mfg') }]
      : []),
    {
      title: <span>SKU <span style={{ color: '#ff4d4f' }}>*</span></span>,
      width: 180,
      fixed: 'left',
      render: (_, r) => renderInput(r, 'sku', 'SKU', 'text', '100%'),
    },
  ];

  const rPcsColumn = { title: 'R.Pcs', width: 90, render: (_, r) => renderInput(r, 'rPcs', 'R.Pcs', 'number') };

  const restColumns = [
    {
      title: <span>Polish Pcs <span style={{ color: '#ff4d4f' }}>*</span></span>,
      width: 78,
      render: (_, r) => renderInput(r, 'pPcs', 'Pcs', 'number', 64),
    },
    {
      title: <span>Polish Carat <span style={{ color: '#ff4d4f' }}>*</span></span>,
      width: 88,
      render: (_, r) => renderInput(r, 'pCarat', 'Carat', 'number', 72),
    },
    { title: 'Cost', width: 120, render: (_, r) => renderInput(r, 'cost', 'Cost', 'number', '100%') },
    {
      title: <span>Price <span style={{ color: '#ff4d4f' }}>*</span></span>,
      width: 120,
      render: (_, r) => renderInput(r, 'price', 'Price', 'number', '100%'),
    },
    {
      title: <span>Amount <span style={{ color: '#ff4d4f' }}>*</span></span>,
      width: 140,
      align: 'right',
      render: (_, r) => renderInput(r, 'amount', 'Amount', 'number', '100%'),
    },
    { title: 'Main Color', width: 150, render: (_, r) => renderInput(r, 'mainColor', 'Color', 'text', '100%') },
    { title: 'LOC', width: 100, render: (_, r) => renderInput(r, 'loc', 'LOC') },
    { title: 'Lab', width: 100, render: (_, r) => renderInput(r, 'lab', 'Lab') },
    { title: 'Report No', width: 170, render: (_, r) => renderInput(r, 'reportNo', 'Report', 'text', '100%') },
    { title: 'Shape', width: 140, render: (_, r) => renderInput(r, 'shape', 'Shape', 'text', '100%') },
    { title: 'Clarity', width: 140, render: (_, r) => renderInput(r, 'clarity', 'Clarity', 'text', '100%') },
    {
      title: 'Measurements',
      width: 260,
      render: (_, r) => (
        <Input
          value={r.measurements}
          onChange={(e) => handleUpdateCell(r.key, 'measurements', e.target.value)}
          placeholder="Measurement"
          style={{ width: '240px' }}
        />
      ),
    },
    {
      title: '', key: 'action', fixed: 'right', width: 50,
      render: (_, record) => (
        <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => removeRow(record.key)} />
      )
    }
  ];

  const columnsRaw = showRoughPcs
    ? [...baseColumns, rPcsColumn, ...restColumns]
    : [...baseColumns, ...restColumns];

  // Virtual + fixed columns is unreliable in antd — drop fixed only for large lists
  const columns = useVirtualTable
    ? columnsRaw.map(({ fixed, ...col }) => col)
    : columnsRaw;

  const tableBodyScrollY = useMemo(() => {
    if (tableScrollY != null) return tableScrollY;
    if (scrollableTable) return measuredScrollY;
    return useModernLayout ? 300 : 450;
  }, [tableScrollY, scrollableTable, useModernLayout, measuredScrollY]);

  const tableBodyScrollX = useMemo(() => {
    if (!scrollableTable) return 'max-content';
    return columns.reduce((sum, col) => sum + (col.width || 100), 0);
  }, [scrollableTable, columns]);

  const addLineItemButton = (inline = false) => (
    <Button
      style={useModernLayout && !inline ? undefined : { borderColor: inline ? undefined : 'darkorange' }}
      type="dashed"
      onClick={() => addRow(INITIAL_ITEM_STATE)}
      block={!inline}
      icon={<PlusCircle size={16} />}
      className={inline ? styles.addLineBtn : undefined}
    >
      Add New Line Item
    </Button>
  );

  const onFinalSave = (lineItems = items) => {
    const headerValues = form.getFieldsValue();
    const filledItems = getFilledLineItems(lineItems).map(normalizeLineItem);

    if (!headerValues.operating_company_id) {
      toast.error('Please select Company');
      return;
    }

    const finalPayload = {
      place: headerValues.place || "",
      invoicedate: headerValues.date ? dayjs(headerValues.date).format('DD-MM-YYYY') : "",
      terms: headerValues.terms?.toString() || "0",
      duedate: headerValues.dueDate ? dayjs(headerValues.dueDate).format('DD-MM-YYYY') : "",
      party: headerValues.company,
      operating_company_id: headerValues.operating_company_id,
      invoiceno: headerValues.invoiceNo || "",
      inward_type: headerValues.type || "",
      narretion: headerValues.narration || "",
      reference: headerValues.reference || "",
      products: formatProductsPayload(filledItems)
    };

    saveInward(finalPayload, {
      onSuccess: async () => {
        invalidateInventoryCaches(queryClient);
        queryClient.invalidateQueries({ queryKey: ['GetIncrement'] });
        setIsModalOpen(false);
        setExistData([]);
        setCheckMessage('');
        setIsSubmitted(false);
        form.resetFields();
        setItems(createInitialLineItems(initialLineCount));
        setExcelFileName('');
        // Reload next Entry No + restore default Date after reset
        try {
          const refreshed = await refetchIncrement();
          applyHeaderDefaults(refreshed?.data?.Data || null);
        } catch {
          applyHeaderDefaults(null);
        }
      }
    });
  };

  const handleCheckAndSubmit = async () => {
    // Force line-item required borders to paint even if header validate throws
    setIsSubmitted(true);
    try {
      await form.validateFields();
      const normalizedItems = items.map(normalizeLineItem);
      const validationError = getFirstLineItemValidationError(normalizedItems);

      if (validationError) {
        setItems([...normalizedItems]);
        toast.error(validationError);
        return;
      }

      setItems(normalizedItems);

      // Import: skip checkExist API + confirmation modal → save directly
      if (skipExistCheck) {
        onFinalSave(normalizedItems);
        return;
      }

      const filledItems = getFilledLineItems(normalizedItems).map(normalizeLineItem);
      const checkPayload = { products: formatProductsPayload(filledItems) };

      submitInward(checkPayload, {
        onSuccess: (response) => {
          setExistData(response?.data || []);
          setCheckMessage(response?.message || '');
          setIsModalOpen(true);
        },
        onError: (error) => toastApiError(error),
      });
    } catch {
      toast.error('Please fill all required header fields.');
    }
  };

  const handlePartialReset = () => {
    applyHeaderDefaults(incrementData?.Data || null);
    setItems(createInitialLineItems(initialLineCount));
    setIsSubmitted(false);
    setExcelFileName('');
  };

  const totalStats = useMemo(() => items.reduce((acc, curr) => ({
    pcs: acc.pcs + (curr.pPcs || curr.rPcs || 0), carats: acc.carats + (curr.pCarat || 0), amount: acc.amount + (curr.amount || 0)
  }), { pcs: 0, carats: 0, amount: 0 }), [items]);

  return (
    <div className={styles.purchaseContainer}>
      {useModernLayout ? (
        // <PageHeroHeader
        //   breadcrumb="TRANSACTION / INWARD"
        //   title={title}
        //   icon={<PageIcon />}
        //   actions={(
        //     <Button className={pageHeroHeaderStyles.actionBtn} icon={<RefreshCcw size={16} />} onClick={handlePartialReset}>
        //       Reset
        //     </Button>
        //   )}
        // />
        <></>
      ) : (
        <div className={styles.headerRow}>
          <h4>{title}</h4>
          <Button icon={<RefreshCcw size={16} />} onClick={handlePartialReset}>Reset</Button>
        </div>
      )}

      <div className={useModernLayout ? styles.formCard : undefined}>
        {useModernLayout ? (
          <div className={styles.formCardHead}>
            <span className={styles.formCardHeadIcon}><PageIcon /></span>
            <div>
              <span className={styles.formCardTitle}>Transaction Details</span>
              <Text type="secondary" className={styles.formCardSub}>
                Entry, reference, invoice, company and payment terms
              </Text>
            </div>
          </div>
        ) : null}
        <Form form={form} layout="vertical" className={styles.formSection} onValuesChange={handleValuesChange}>
          <DynamicForm fields={purchaseFields} />
        </Form>
      </div>

      <div
        className={`${styles.tableSection} ${scrollableTable ? styles.tableSectionScrollable : ''}`}
      // style={scrollableTable ? { '--inward-visible-rows': visibleRowCount } : undefined}
      >
        {useModernLayout ? (
          <div className={styles.tableCardHead}>
            <span className={styles.formCardHeadIcon}><UnorderedListOutlined /></span>
            <div className={styles.tableCardHeadText}>
              <span className={styles.formCardTitle}>Line Items</span>
              <Text type="secondary" className={styles.formCardSub}>
                Add stones with SKU, carat, price and attributes
              </Text>
            </div>
            <div className={styles.tableCardHeadActions}>
              {addLineItemButton(true)}
            </div>
          </div>
        ) : (
          <div className={styles.tableAddRow}>
            {addLineItemButton(true)}
          </div>
        )}
        <div
          ref={scrollableTable ? tableWrapRef : undefined}
          className={scrollableTable ? styles.tableBodyWrap : undefined}
          style={
            scrollableTable
              ? { '--table-scroll-y': `${tableBodyScrollY}px` }
              : undefined
          }
        >
          {/* Spin must stay INSIDE tableBodyWrap — wrapping outside grows height in a measure loop */}
          <Spin
            spinning={excelLoading}
            tip="Reading Excel and loading line items…"
            className={styles.excelTableSpin}
          >
            <Table
              key={`inward-lines-${isSubmitted ? 'err' : 'ok'}-${useVirtualTable ? 'v' : 'n'}`}
              columns={columns}
              dataSource={items}
              pagination={false}
              size="small"
              virtual={useVirtualTable}
              scroll={{ x: tableBodyScrollX, y: tableBodyScrollY }}
            />
          </Spin>
        </div>
        <div className={`${styles.footerStats} ${scrollableTable ? styles.footerStatsBar : ''}`}>
          <div className={styles.footerStatsTotals}>
            <div className={styles.statItem}><label>Total Carats</label><span>{totalStats.carats.toFixed(2)}</span></div>
            <div className={styles.statItem}><label>Total Amount</label><span className={styles.amount}>${totalStats.amount.toLocaleString()}</span></div>
          </div>
          <div className={styles.footerStatsActions}>
            <Button
              type="primary"
              icon={<CheckCircle size={18} />}
              className={styles.submitBtn}
              onClick={handleCheckAndSubmit}
              loading={skipExistCheck ? isSaving : undefined}
            >
              {skipExistCheck ? 'Submit' : 'Check & Submit'}
            </Button>
          </div>
        </div>
      </div>

      <AICertificateScannerModal
        open={aiOcrModalOpen}
        onClose={() => setAiOcrModalOpen(false)}
        onApplyScanData={handleApplyScanData}
      />

      {!skipExistCheck ? (
        <ValidationTableModal
          isVisible={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setExistData([]);
            setCheckMessage('');
          }}
          onSave={() => onFinalSave()}
          existData={existData}
          items={items}
          message={checkMessage}
          loading={isSaving}
        />
      ) : null}
    </div>
  );
};

export default InwardTransactionForm;
