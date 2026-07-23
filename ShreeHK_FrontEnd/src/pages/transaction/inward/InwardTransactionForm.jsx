import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Button, Table, InputNumber, Typography, Upload, Tag } from 'antd';
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
import { RefreshCcw, PlusCircle, Trash2, CheckCircle, FileSpreadsheet } from 'lucide-react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toastApiError } from "../../../utils/apiToast";
import DynamicForm from '../../../hooks/DynamicFormField';
import { useFetchApi, usePostApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../constants/endpoints';
import useFormHandleChange from '../../../hooks/useFormHandleChange';
import ValidationTableModal from '../../../hooks/ValidationTableModal';
import { parseInwardImportExcel } from './inwardExcelImport';
import defaultStyles from "../../../assets/scss/pages/transaction/inwardpurchase.module.scss";
import PageHeroHeader, { pageHeroHeaderStyles } from '../../../components/common/PageHeroHeader';

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
    sku: item.sku,
    rought_pcs: item.rPcs?.toString() || "",
    polish_pcs: item.pPcs?.toString() || "",
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
  if (!item.pCarat || item.pCarat <= 0) return `${prefix} P.Carat must be greater than 0.`;
  if (!item.price || item.price <= 0) return `${prefix} Price must be greater than 0.`;
  const amount = item.amount || item.pCarat * item.price;
  if (!amount || amount <= 0) return `${prefix} Amount must be greater than 0.`;
  return null;
}

function getFirstLineItemValidationError(items) {
  const filledItems = getFilledLineItems(items);
  if (filledItems.length === 0) {
    return 'Add at least one line item with SKU, carat and price.';
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
  purchaseFieldsOverride,
  defaultInwardType = "purchase",
  typeOptions,
  useModernLayout = false,
  stylesModule,
  showExcelUpload = false,
  initialLineCount = 1,
  visibleRowCount = 4,
  tableScrollY,
  scrollableTable = false,
}) => {
  const styles = stylesModule || defaultStyles;
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existData, setExistData] = useState([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelFileName, setExcelFileName] = useState('');

  const {
    form,
    items,
    setItems,
    addRow,
    removeRow,
    updateTableValue,
  } = useFormHandleChange({}, createInitialLineItems(initialLineCount));

  const inwardType = Form.useWatch('type', form) || defaultInwardType;
  const PageIcon = INWARD_PAGE_ICONS[inwardType] || FormOutlined;
  const showRoughPcs = showRPcs || inwardType === 'purchase' || showExcelUpload;

  const queryClient = useQueryClient();
  const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
  const { data: incrementData } = useFetchApi('GetIncrement', ENDPOINTS.common.increment);
  const { mutate: submitInward } = usePostApiRequest(ENDPOINTS.inward.checkExist, 'GetIncrementCheckExists', { showToast: false });
  const { mutate: saveInward, isLoading: isSaving } = usePostApiRequest(ENDPOINTS.inward.save, 'inwardSave');

  const handleValuesChange = (changedValues, allValues) => {
    if (changedValues.date || changedValues.terms !== undefined) {
      const { date, terms } = allValues;
      if (date) {
        const daysToAdd = parseInt(terms) || 0;
        form.setFieldsValue({ dueDate: dayjs(date).add(daysToAdd, 'day') });
      }
    }
  };

  useEffect(() => {
    if (incrementData?.Data) {
      const d = incrementData.Data;
      form.setFieldsValue({
        entry: d.inward, reference: d.reference, invoiceNo: d.invoice, company: d.company,
        date: dayjs(), terms: 0, dueDate: dayjs(), type: defaultInwardType
      });
    }
  }, [incrementData, form, defaultInwardType]);

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

  const purchaseFields = purchaseFieldsOverride || [
    { name: "entry", label: "Entry No", span: 6, disabled: true },
    { name: "type", label: "Inward Type", span: 6, type: 'select', required: true, options: inwardTypeOptions },
    { name: "reference", label: "Reference", span: 6 },
    { name: "invoiceNo", label: "Invoice No", span: 6, required: true },
    { name: "company", label: "Company", span: 6, type: 'select', required: true, loading: isCompanyLoading, options: companyOptions },
    { name: "date", label: "Date", span: 6, type: 'date', required: true },
    { name: "terms", label: "Terms (Days)", span: 6, type: 'number', required: true },
    { name: "dueDate", label: "Due Date", span: 6, type: 'date', required: true, disabled: true },
  ];

  const handleUpdateCell = (key, field, value) => {
    updateTableValue(key, field, value, (item) => {
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

  const renderInput = (record, field, placeholder, type = "text") => {
    const isRequired = ['sku', 'pCarat', 'price', 'amount'].includes(field);
    const hasError = isSubmitted && isRequired && String(record.sku || '').trim() && (
      field === 'sku' ? !String(record.sku || '').trim()
        : field === 'pCarat' ? !record.pCarat || record.pCarat <= 0
          : field === 'price' ? !record.price || record.price <= 0
            : !record.amount || record.amount <= 0
    );

    return type === "number" ? (
      <InputNumber status={hasError ? "error" : ""} value={record[field]} onChange={(val) => handleUpdateCell(record.key, field, val)} style={{ width: '80px' }} />
    ) : (
      <Input status={hasError ? "error" : ""} value={record[field]} onChange={(e) => handleUpdateCell(record.key, field, e.target.value)} placeholder={placeholder} style={{ width: '100px' }} />
    );
  };

  const baseColumns = [
    { title: 'No.', width: 50, fixed: 'left', render: (_, __, index) => index + 1 },
    { title: 'Mfg. code', width: 100, fixed: 'left', render: (_, r) => renderInput(r, 'mfgCode', 'Mfg') },
    { title: 'D. No.', width: 100, fixed: 'left', render: (_, r) => renderInput(r, 'dNo', 'D.No') },
    { title: 'SKU', width: 120, fixed: 'left', render: (_, r) => renderInput(r, 'sku', 'SKU') },
  ];

  const rPcsColumn = { title: 'R.Pcs', width: 90, render: (_, r) => renderInput(r, 'rPcs', 'R.Pcs', 'number') };

  const restColumns = [
    { title: 'P.Pcs', width: 90, render: (_, r) => renderInput(r, 'pPcs', 'P.Pcs', 'number') },
    { title: 'P.Carat', width: 100, render: (_, r) => renderInput(r, 'pCarat', 'Carat', 'number') },
    { title: 'Cost', width: 100, render: (_, r) => renderInput(r, 'cost', 'Cost', 'number') },
    { title: 'Price', width: 100, render: (_, r) => renderInput(r, 'price', 'Price', 'number') },
    { title: 'Amount', width: 120, align: 'right', render: (_, r) => renderInput(r, 'amount', 'Amount', 'number') },
    { title: 'Main Color', width: 100, render: (_, r) => renderInput(r, 'mainColor', 'Color') },
    { title: 'LOC', width: 100, render: (_, r) => renderInput(r, 'loc', 'LOC') },
    { title: 'Lab', width: 100, render: (_, r) => renderInput(r, 'lab', 'Lab') },
    { title: 'Report No', width: 120, render: (_, r) => renderInput(r, 'reportNo', 'Report') },
    { title: 'Shape', width: 100, render: (_, r) => renderInput(r, 'shape', 'Shape') },
    { title: 'Clarity', width: 100, render: (_, r) => renderInput(r, 'clarity', 'Clarity') },
    { title: 'Measurements', width: 130, render: (_, r) => renderInput(r, 'measurements', 'Meas') },
    {
      title: '', key: 'action', fixed: 'right', width: 50,
      render: (_, record) => (
        <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => removeRow(record.key)} />
      )
    }
  ];

  const columns = showRoughPcs
    ? [...baseColumns, rPcsColumn, ...restColumns]
    : [...baseColumns, ...restColumns];

  const lineRowHeight = 54;
  const tableBodyScrollY = useMemo(() => {
    if (tableScrollY != null) return tableScrollY;
    if (!scrollableTable) return useModernLayout ? 300 : 450;
    const rowCount = Math.max(items.length, 1);
    return Math.min(rowCount, visibleRowCount) * lineRowHeight;
  }, [tableScrollY, scrollableTable, useModernLayout, items.length, visibleRowCount]);

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

  const handleExcelUpload = async (uploadInfo) => {
    const file = uploadInfo.file?.originFileObj || uploadInfo.file;
    if (!file || uploadInfo.file?.status === 'removed') return;

    setExcelLoading(true);
    try {
      const parsedRows = await parseInwardImportExcel(file);
      const mappedRows = parsedRows.map((row, index) => ({
        ...INITIAL_ITEM_STATE,
        ...normalizeLineItem(row),
        key: Date.now() + index,
      }));
      setItems(mappedRows);
      setIsSubmitted(false);
      setExcelFileName(file.name || 'Excel file');
      toast.success(`${mappedRows.length} row(s) loaded from Excel.`);
    } catch (error) {
      toast.error(error?.message || 'Failed to read Excel file.');
    } finally {
      setExcelLoading(false);
    }
  };

  const handleCheckAndSubmit = async () => {
    setIsSubmitted(true);
    try {
      await form.validateFields();
      const normalizedItems = items.map(normalizeLineItem);
      const validationError = getFirstLineItemValidationError(normalizedItems);

      if (validationError) {
        setItems(normalizedItems);
        toast.error(validationError);
        return;
      }

      const filledItems = getFilledLineItems(normalizedItems).map(normalizeLineItem);
      const checkPayload = { products: formatProductsPayload(filledItems) };

      submitInward(checkPayload, {
        onSuccess: (response) => {
          setItems(normalizedItems);
          setExistData(response?.data || []);
          setIsModalOpen(true);
        },
        onError: (error) => toastApiError(error),
      });
    } catch {
      toast.error('Please fill all required header fields.');
    }
  };

  const onFinalSave = () => {
    const headerValues = form.getFieldsValue();
    const filledItems = getFilledLineItems(items).map(normalizeLineItem);

    const finalPayload = {
      place: headerValues.place || "",
      invoicedate: headerValues.date ? dayjs(headerValues.date).format('DD-MM-YYYY') : "",
      terms: headerValues.terms?.toString() || "0",
      duedate: headerValues.dueDate ? dayjs(headerValues.dueDate).format('DD-MM-YYYY') : "",
      party: headerValues.company,
      invoiceno: headerValues.invoiceNo || "",
      inward_type: headerValues.type || "",
      narretion: headerValues.narration || "",
      reference: headerValues.reference || "",
      products: formatProductsPayload(filledItems)
    };

    saveInward(finalPayload, {
      onSuccess: () => {
        invalidateInventoryCaches(queryClient);
        const skuList = filledItems.map((item) => item.sku).filter(Boolean).join(', ');
        if (skuList) {
          toast.success(`Stock saved. Open Inventory → My Inventory and search: ${skuList}`);
        }
        setIsModalOpen(false);
        setExistData([]);
        setIsSubmitted(false);
        form.resetFields();
        setItems(createInitialLineItems(initialLineCount));
        setExcelFileName('');
      }
    });
  };

  const handlePartialReset = () => {
    form.setFieldsValue({ type: defaultInwardType, terms: 0, dueDate: dayjs() });
    setItems(createInitialLineItems(initialLineCount));
    setIsSubmitted(false);
    setExcelFileName('');
  };

  const filledLineCount = useMemo(
    () => items.filter((item) => String(item.sku || '').trim()).length,
    [items],
  );

  const totalStats = useMemo(() => items.reduce((acc, curr) => ({
    pcs: acc.pcs + (curr.pPcs || 0), carats: acc.carats + (curr.pCarat || 0), amount: acc.amount + (curr.amount || 0)
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
        {showExcelUpload ? (
          <div className={`${styles.excelUploadPanel} ${styles.excelUploadPanelInForm}`}>
            <div className={styles.excelUploadCompact}>
              <div className={styles.excelUploadMeta}>
                <FileSpreadsheet size={15} strokeWidth={2} />
                <div className={styles.excelUploadCopy}>
                  <span className={styles.excelUploadTitle}>Excel Import</span>
                  <span className={styles.excelUploadHint}>Import Format · auto-fills line items</span>
                </div>
              </div>
              <div className={styles.excelUploadActions}>
                {excelFileName ? (
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
                    {excelFileName ? 'Replace' : 'Upload .xlsx'}
                  </Button>
                </Upload>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={`${styles.tableSection} ${scrollableTable ? styles.tableSectionScrollable : ''}`}
        // style={scrollableTable ? { '--inward-visible-rows': visibleRowCount } : undefined}
      >
        {useModernLayout ? (
          <div className={styles.tableCardHead}>
            <span className={styles.formCardHeadIcon}><UnorderedListOutlined /></span>
            <div>
              <span className={styles.formCardTitle}>Line Items</span>
              <Text type="secondary" className={styles.formCardSub}>
                Add stones with SKU, carat, price and attributes
              </Text>
            </div>
          </div>
        ) : null}
        <Table
          columns={columns}
          dataSource={items}
          pagination={false}
          size="small"
          scroll={{ x: tableBodyScrollX, y: tableBodyScrollY }}
          footer={scrollableTable ? undefined : () => addLineItemButton(false)}
        />
        <div className={`${styles.footerStats} ${scrollableTable ? styles.footerStatsBar : ''}`}>
          <div className={styles.footerStatsTotals}>
            <div className={styles.statItem}><label>Total Carats</label><span>{totalStats.carats.toFixed(2)}</span></div>
            <div className={styles.statItem}><label>Total Amount</label><span className={styles.amount}>${totalStats.amount.toLocaleString()}</span></div>
          </div>
          <div className={styles.footerStatsActions}>
            {scrollableTable ? addLineItemButton(true) : null}
            <Button type="primary" icon={<CheckCircle size={18} />} className={styles.submitBtn} onClick={handleCheckAndSubmit}>
              Check & Submit
            </Button>
          </div>
        </div>
      </div>

      <ValidationTableModal
        isVisible={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExistData([]);
        }}
        onSave={onFinalSave}
        existData={existData}
        loading={isSaving}
      />
    </div>
  );
};

export default InwardTransactionForm;
