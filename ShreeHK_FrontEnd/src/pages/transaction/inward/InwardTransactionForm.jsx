import React, { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Form, Input, Button, Table, InputNumber, Typography, Upload, Tag, Spin, Switch, Select } from 'antd';
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
import { RefreshCcw, PlusCircle, Trash2, CheckCircle, FileSpreadsheet, Sparkles, ShieldCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toastApiError } from "../../../utils/toastNotify";
import { api } from '../../../api/client/axiosInstance';
import DynamicForm from '../../../components/common/ui/DynamicFormField';
import { useFetchApi, usePostApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../api/endpoints';
import useFormHandleChange from '../../../hooks/useFormHandleChange';
import useBranchCompanies from '../../../hooks/useBranchCompanies';
import useTableBodyScrollHeight from '../../../hooks/useTableBodyScrollHeight';
import ValidationTableModal from '../../../components/common/modals/ValidationTableModal';
import AICertificateScannerModal from '../../../components/ai/AICertificateScannerModal';
import LabBulkDryRunModal from './LabBulkDryRunModal';
import LabImportMismatchModal from './LabImportMismatchModal';
import {
  checkBulkDryRun,
  executeBulkVerify,
  compareExcelWithLabSpecs,
} from './inwardLabVerifyHelper';
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

  const seenSkus = new Set();
  for (let i = 0; i < items.length; i += 1) {
    const rawSku = String(items[i].sku || '').trim().toUpperCase();
    if (!rawSku) continue;
    if (seenSkus.has(rawSku)) {
      return `Row ${i + 1}: Duplicate SKU "${items[i].sku}" entered in line items. Each line item must have a unique SKU.`;
    }
    seenSkus.add(rawSku);

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
  const [autoVerifyLab, setAutoVerifyLab] = useState(false);
  const [fetchingRowKeys, setFetchingRowKeys] = useState({});
  const [dryRunModalOpen, setDryRunModalOpen] = useState(false);
  const [dryRunData, setDryRunData] = useState(null);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [mismatchModalOpen, setMismatchModalOpen] = useState(false);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [pendingVerifiedRows, setPendingVerifiedRows] = useState([]);
  const [rawExcelRows, setRawExcelRows] = useState([]);
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

  const handleFetchLabForRow = async (record) => {
    const reportNo = String(record.reportNo || '').trim();
    if (!reportNo) {
      toast.warning('Please enter a Report / Certificate number first.');
      return;
    }
    const lab = record.lab || 'GIA';
    setFetchingRowKeys((prev) => ({ ...prev, [record.key]: true }));
    try {
      const response = await api.post(ENDPOINTS.labIntegration.fetch, {
        lab,
        reportNumber: reportNo,
      });

      const resData = response.data;
      if (resData.status && resData.data) {
        const labData = resData.data;
        const mapped = labData.erpMapped || {};
        const isMock = Boolean(resData.isMock);

        if (isMock) {
          // STRICT RULE: Mock responses do NOT auto-fill specs, only display MOCK DATA badge for preview
          setItems((prevItems) =>
            prevItems.map((item) => {
              if (item.key === record.key) {
                return {
                  ...item,
                  isMock: true,
                  mockPreviewData: labData,
                };
              }
              return item;
            })
          );
          toast.info(`Mock certificate preview received for #${reportNo} (Simulation mode: form values not modified)`);
          return;
        }

        const changedMap = {
          shape: true,
          color: true,
          clarity: true,
          cut: true,
          polish: true,
          symm: true,
          floIntensity: true,
          tablePer: true,
          depthPer: true,
          measurements: true,
          girdle: true,
        };

        const newCarat = (!record.pCarat || Number(record.pCarat) === 0) && labData.carat
          ? Number(labData.carat)
          : record.pCarat;
        if (newCarat && newCarat !== record.pCarat) {
          changedMap.pCarat = true;
        }

        const price = Number(record.price) || 0;
        const amount = newCarat > 0 && price > 0 ? Math.round(newCarat * price * 100) / 100 : record.amount;

        setItems((prevItems) =>
          prevItems.map((item) => {
            if (item.key === record.key) {
              return {
                ...item,
                lab: labData.lab || item.lab || 'GIA',
                shape: mapped.shape || item.shape,
                color: mapped.color || item.color,
                clarity: mapped.clarity || item.clarity,
                cut: mapped.cut || item.cut,
                polish: mapped.polish || item.polish,
                symm: mapped.symmentry || item.symm,
                floIntensity: mapped.f_intensity || item.floIntensity,
                tablePer: mapped.table_pc || item.tablePer,
                depthPer: mapped.depth_pc || item.depthPer,
                measurements: mapped.mesurment || item.measurements,
                girdle: mapped.gridle || item.girdle,
                pCarat: newCarat,
                amount,
                isMock: false,
                labVerified: true,
                changedByLab: {
                  ...(item.changedByLab || {}),
                  ...changedMap,
                },
              };
            }
            return item;
          })
        );

        toast.success(`Official lab specs loaded for #${reportNo}`);
      } else {
        toast.error(resData.message || 'Certificate not found.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to fetch certificate from lab.');
    } finally {
      setFetchingRowKeys((prev) => ({ ...prev, [record.key]: false }));
    }
  };

  const handleProceedBulkVerify = async () => {
    if (!rawExcelRows || rawExcelRows.length === 0) return;
    setIsBulkVerifying(true);
    setVerifyProgress(15);

    const certRows = rawExcelRows.filter((r) => String(r.reportNo || '').trim());
    const itemsToCheck = certRows.map((r) => ({
      lab: r.lab || 'GIA',
      reportNumber: String(r.reportNo).trim(),
    }));

    const progressTimer = setInterval(() => {
      setVerifyProgress((p) => (p < 85 ? p + 10 : p));
    }, 400);

    try {
      const bulkRes = await executeBulkVerify(itemsToCheck, (pct) => {
        setVerifyProgress((prev) => Math.max(prev, pct));
      });
      clearInterval(progressTimer);
      setVerifyProgress(100);

      const comparison = compareExcelWithLabSpecs(rawExcelRows, bulkRes.results || []);

      setTimeout(() => {
        setIsBulkVerifying(false);
        setDryRunModalOpen(false);

        if (comparison.discrepancies && comparison.discrepancies.length > 0) {
          setDiscrepancies(comparison.discrepancies);
          setPendingVerifiedRows(comparison.updatedRows);
          setMismatchModalOpen(true);
        } else {
          startTransition(() => {
            setItems(comparison.updatedRows);
          });
          setIsSubmitted(false);
          toast.success(
            `Loaded ${comparison.updatedRows.length} stones (${comparison.verifiedCount} verified with lab${comparison.mockCount ? `, ${comparison.mockCount} mock` : ''}).`
          );
        }
      }, 500);
    } catch (err) {
      clearInterval(progressTimer);
      setIsBulkVerifying(false);
      toast.error(err.response?.data?.message || err.message || 'Bulk lab verification failed.');
    }
  };

  const handleSkipVerifyAndLoad = () => {
    setDryRunModalOpen(false);
    startTransition(() => {
      setItems(rawExcelRows);
    });
    setIsSubmitted(false);
    toast.info(`Loaded ${rawExcelRows.length} stones without lab verification.`);
  };

  const handleAcceptLabSpecs = () => {
    setMismatchModalOpen(false);
    startTransition(() => {
      setItems(pendingVerifiedRows);
    });
    setIsSubmitted(false);
    toast.success('Stones loaded and updated to official lab grading specs!');
  };

  const handleKeepExcelSpecs = () => {
    setMismatchModalOpen(false);
    startTransition(() => {
      setItems(rawExcelRows);
    });
    setIsSubmitted(false);
    toast.info('Stones loaded keeping original Excel specifications.');
  };

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

      // Check Auto-verify with Lab toggle
      if (autoVerifyLab) {
        const certRows = mappedRows.filter((r) => String(r.reportNo || '').trim());
        if (certRows.length > 0) {
          toast.dismiss(loadingToastId);
          setExcelLoading(false);
          setRawExcelRows(mappedRows);
          setExcelFileName(file.name || 'Excel file');

          // Call dry-run check
          const itemsToCheck = certRows.map((r) => ({
            lab: r.lab || 'GIA',
            reportNumber: String(r.reportNo).trim(),
          }));

          try {
            const dryRunRes = await checkBulkDryRun(itemsToCheck);
            setDryRunData({
              total: dryRunRes.total || certRows.length,
              cachedCount: dryRunRes.cachedCount || 0,
              estimatedLiveLookups: dryRunRes.estimatedLiveLookups || 0,
              dailyCap: dryRunRes.dailyCap || 500,
              dailyLookupsRemaining: dryRunRes.dailyLookupsRemaining || 500,
            });
            setDryRunModalOpen(true);
            return;
          } catch (dryRunErr) {
            toast.error(dryRunErr.response?.data?.message || 'Failed to check lab lookup quota.');
            // Fall through to loading normally
          }
        }
      }

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
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
                    <Switch
                      size="small"
                      checked={autoVerifyLab}
                      onChange={(checked) => setAutoVerifyLab(checked)}
                    />
                    <span style={{ fontSize: 11, fontWeight: 500, color: autoVerifyLab ? '#15803d' : '#64748b' }}>
                      Auto-verify with Lab
                    </span>
                  </div>
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
    autoVerifyLab,
  ]);

  const handleUpdateCell = (key, field, value) => {
    updateTableValue(key, field, value, (item) => {
      let updatedItem = { ...item };
      if (updatedItem.changedByLab && updatedItem.changedByLab[field]) {
        updatedItem.changedByLab = { ...updatedItem.changedByLab, [field]: false };
      }
      if (field === 'rPcs') {
        return {
          ...updatedItem,
          rPcs: value,
        };
      }
      if (field === 'pPcs') {
        return {
          ...updatedItem,
          pPcs: value,
        };
      }
      if (field === 'pCarat' || field === 'price') {
        const carat = field === 'pCarat' ? (value || 0) : (updatedItem.pCarat || 0);
        const price = field === 'price' ? (value || 0) : (updatedItem.price || 0);
        return { ...updatedItem, amount: Math.round(carat * price * 100) / 100 };
      }
      if (field === 'amount') {
        const amount = value || 0;
        const price = updatedItem.price || 0;
        if (price > 0 && amount > 0) {
          return { ...updatedItem, amount, pCarat: Math.round((amount / price) * 10000) / 10000 };
        }
        return { ...updatedItem, amount };
      }
      return updatedItem;
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

    const isLabFilled = Boolean(record.changedByLab?.[field]);
    const width = widthOverride ?? (type === 'number' ? 80 : 90);

    const baseStyle = {
      width,
      ...(isLabFilled
        ? {
            backgroundColor: '#f0fdf4',
            borderColor: '#86efac',
            color: '#15803d',
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          }
        : {}),
    };

    const errorStyle = hasError
      ? {
          ...baseStyle,
          border: '0.5px solid var(--color-error, #dc3d43)',
          boxShadow: 'none',
          outline: 'none',
        }
      : baseStyle;

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
    {
      title: 'Lab',
      width: 100,
      render: (_, r) => (
        <Select
          value={r.lab || 'GIA'}
          onChange={(val) => handleUpdateCell(r.key, 'lab', val)}
          style={{ width: '100%' }}
          options={[
            { value: 'GIA', label: 'GIA' },
            { value: 'IGI', label: 'IGI' },
            { value: 'HRD', label: 'HRD' },
            { value: 'NONE', label: 'None' },
          ]}
        />
      ),
    },
    {
      title: 'Report No',
      width: 220,
      render: (_, r) => {
        const isFetching = Boolean(fetchingRowKeys[r.key]);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Input
              value={r.reportNo}
              onChange={(e) => handleUpdateCell(r.key, 'reportNo', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFetchLabForRow(r);
                }
              }}
              placeholder="Report #"
              style={{
                flex: 1,
                ...(r.changedByLab?.reportNo ? { backgroundColor: '#f0fdf4', borderColor: '#86efac' } : {}),
              }}
            />
            <Button
              size="small"
              type="primary"
              ghost
              icon={<Sparkles size={13} />}
              loading={isFetching}
              onClick={() => handleFetchLabForRow(r)}
              title="Fetch from Lab registry (or press Enter)"
              style={{ padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
            {r.isMock && (
              <Tag color="orange" style={{ margin: 0, fontSize: 9, lineHeight: '16px', padding: '0 4px' }} title="Mock Provider Data">
                MOCK
              </Tag>
            )}
          </div>
        );
      },
    },
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
          style={{
            width: '240px',
            ...(r.changedByLab?.measurements ? { backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#15803d' } : {}),
          }}
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
    ? columnsRaw.map((col) => (col.fixed ? { ...col, fixed: undefined } : col))
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
    const filledItems = getFilledLineItems(lineItems);

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

    const count = filledItems.length;
    const loadingToastId = count > 500 ? toast.loading(`Saving ${count.toLocaleString()} inward stones to database... Please wait.`) : null;

    saveInward(finalPayload, {
      onSuccess: async () => {
        if (loadingToastId) toast.dismiss(loadingToastId);
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
      },
      onError: (error) => {
        if (loadingToastId) toast.dismiss(loadingToastId);
        toastApiError(error);
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

      // Import: skip checkExist API + confirmation modal → save directly without locking UI with redundant re-render
      if (skipExistCheck) {
        onFinalSave(normalizedItems);
        return;
      }

      setItems(normalizedItems);

      const filledItems = normalizedItems.filter((i) => String(i.sku || '').trim());
      const operatingCompanyId = form.getFieldValue('operating_company_id');
      const checkPayload = {
        products: formatProductsPayload(filledItems),
        operating_company_id: operatingCompanyId,
      };

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

  const totalStats = useMemo(() => {
    let rows = 0;
    let pcs = 0;
    let carats = 0;
    let amount = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const hasSku = String(item.sku || '').trim().length > 0;
      const p = Number(item.pPcs) || Number(item.rPcs) || 0;
      const c = Number(item.pCarat) || 0;
      const a = Number(item.amount) || 0;

      if (hasSku || p > 0 || c > 0 || a > 0) {
        rows += 1;
      }
      pcs += p;
      carats += c;
      amount += a;
    }
    if (rows === 0 && items.length > 0) {
      rows = items.length;
    }
    return { rows, pcs, carats, amount };
  }, [items]);

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
            <div className={styles.statItem}><label>Total Rows</label><span>{totalStats.rows.toLocaleString()}</span></div>
            <div className={styles.statItem}><label>Total Pcs</label><span>{totalStats.pcs.toLocaleString()}</span></div>
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

      <LabBulkDryRunModal
        isOpen={dryRunModalOpen}
        onClose={() => setDryRunModalOpen(false)}
        dryRunData={dryRunData}
        onConfirmVerify={handleProceedBulkVerify}
        onSkipVerify={handleSkipVerifyAndLoad}
        isVerifying={isBulkVerifying}
        progress={verifyProgress}
      />

      <LabImportMismatchModal
        isOpen={mismatchModalOpen}
        onClose={() => setMismatchModalOpen(false)}
        discrepancies={discrepancies}
        onAcceptLabSpecs={handleAcceptLabSpecs}
        onKeepExcelSpecs={handleKeepExcelSpecs}
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
