import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Button, Table, InputNumber } from 'antd';
import { RefreshCcw, PlusCircle, Trash2, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toastApiError } from '../../../utils/toastNotify';
import DynamicForm from '../../../components/common/ui/DynamicFormField';
import { useFetchApi, usePostApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../api/endpoints';
import useFormHandleChange from '../../../hooks/useFormHandleChange';
import useBranchCompanies from '../../../hooks/useBranchCompanies';
import ValidationTableModal from '../../../components/common/modals/ValidationTableModal';
import styles from '../../../assets/scss/pages/transaction/inwardpurchase.module.scss';
import PageHeroHeader, { pageHeroHeaderStyles } from '../../../components/common/PageHeroHeader';
import { SwapOutlined } from '@ant-design/icons';

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
  return items.map((item) => ({
    mfg_code: item.mfgCode || '',
    diamond_no: item.dNo || '',
    sku: String(item.sku || "").trim(),
    rought_pcs: (item.rPcs || item.pPcs || '')?.toString(),
    polish_pcs: (item.pPcs || item.rPcs || '')?.toString(),
    polish_carat: item.pCarat?.toString() || '0',
    price: item.price?.toString() || '0',
    amount: item.amount?.toString() || '0',
    cost: item.cost?.toString() || '',
    main_color: item.mainColor || '',
    location: item.loc || '',
    lab: item.lab || '',
    group_type: item.groupType || '',
    remark: item.remark || '',
    bgm: item.bgm || '',
    package: item.package || '',
    attr: {
      report_no: item.reportNo || '',
      shape: item.shape || '',
      clarity: item.clarity || '',
      intensity: item.intensity || '',
      overtone: item.overtone || '',
      color: item.color || '',
      size: item.size || '',
      polish: item.polish || '',
      symmentry: item.symm || '',
      cut: item.cut || '',
      mesurment: item.measurements || '',
      table_pc: item.tablePer || '',
      depth_pc: item.depthPer || '',
      gridle: item.girdle || '',
      f_intensity: item.floIntensity || '',
      eyeclean: '',
    },
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

function getLineItemValidationError(item, rowNo, { requirePcs = false } = {}) {
  const prefix = `Row ${rowNo}:`;
  if (!String(item.sku || '').trim()) return `${prefix} SKU is required.`;
  if (requirePcs && (!item.pPcs || Number(item.pPcs) <= 0)) {
    return `${prefix} Polish Pcs must be greater than 0.`;
  }
  if (!item.pCarat || item.pCarat <= 0) return `${prefix} Polish Carat must be greater than 0.`;
  if (!item.price || item.price <= 0) return `${prefix} Price must be greater than 0.`;
  const amount = item.amount || item.pCarat * item.price;
  if (!amount || amount <= 0) return `${prefix} Amount must be greater than 0.`;
  return null;
}

function getFirstLineItemValidationError(items, options = {}) {
  const filledItems = getFilledLineItems(items);
  if (filledItems.length === 0) {
    return 'Add at least one line item with SKU, pcs, carat, price and amount.';
  }

  const seenSkus = new Set();
  for (let i = 0; i < items.length; i += 1) {
    const rawSku = String(items[i].sku || '').trim().toUpperCase();
    if (!rawSku) continue;
    if (seenSkus.has(rawSku)) {
      return `Row ${i + 1}: Duplicate SKU "${items[i].sku}" entered in line items. Each line item must have a unique SKU.`;
    }
    seenSkus.add(rawSku);

    const error = getLineItemValidationError(items[i], i + 1, options);
    if (error) return error;
  }

  return null;
}

function invalidateInventoryCaches(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['GetProductData'] });
  queryClient.invalidateQueries({ queryKey: ['myInventorySummary'] });
  queryClient.invalidateQueries({ queryKey: ['InventoryList'] });
}

const INWARD_TYPE_LABELS = {
  purchase: 'Purchase',
  memo: 'In Memo',
  export: 'Export',
  consign: 'Consignment',
};

const InwardEntryForm = ({
  title,
  defaultInwardType = 'purchase',
  showRPcs = false,
  initialLineCount = 1,
  visibleRowCount = 7,
  tableScrollY,
  scrollableTable = false,
  skipExistCheck = false,
  hideMfgDno = false,
  wideLineFields = false,
  requirePcs = false,
  polishFieldLabels = false,
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [existData, setExistData] = useState([]);
  const [checkMessage, setCheckMessage] = useState('');

  const {
    form,
    items,
    setItems,
    addRow,
    removeRow,
    updateTableValue,
  } = useFormHandleChange({}, createInitialLineItems(initialLineCount));

  const queryClient = useQueryClient();
  const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
  const {
    options: branchCompanyOptions,
    defaultCompanyId,
    isLoading: isBranchCompanyLoading,
  } = useBranchCompanies();
  const { data: incrementData } = useFetchApi('GetIncrement', ENDPOINTS.common.increment);
  const { mutate: submitInward } = usePostApiRequest(ENDPOINTS.inward.checkExist, 'GetIncrementCheckExists', { showToast: false });
  const { mutate: saveInward, isLoading: isSaving } = usePostApiRequest(ENDPOINTS.inward.save, 'inwardSave');

  const handleValuesChange = (changedValues, allValues) => {
    if (changedValues.date || changedValues.terms !== undefined) {
      const { date, terms } = allValues;
      if (date) {
        const daysToAdd = parseInt(terms, 10) || 0;
        form.setFieldsValue({ dueDate: dayjs(date).add(daysToAdd, 'day') });
      }
    }
  };

  useEffect(() => {
    form.setFieldsValue({
      type: INWARD_TYPE_LABELS[defaultInwardType] || defaultInwardType,
    });
  }, [form, defaultInwardType]);

  useEffect(() => {
    if (defaultCompanyId && !form.getFieldValue('operating_company_id')) {
      form.setFieldsValue({ operating_company_id: defaultCompanyId });
    }
  }, [defaultCompanyId, form]);

  useEffect(() => {
    if (incrementData?.Data) {
      const d = incrementData.Data;
      const isMemoType = defaultInwardType === 'memo' || defaultInwardType === 'consign';
      const rawInv = String(d.invoice ?? '').trim();
      const invoiceNo = isMemoType
        ? (/^INV-\d+$/i.test(rawInv)
          ? rawInv.toUpperCase()
          : `INV-${rawInv.replace(/\D/g, '') || '1'}`)
        : rawInv;
      form.setFieldsValue({
        entry: d.inward,
        reference: d.reference,
        invoiceNo,
        company: d.company,
        date: dayjs(),
        terms: 0,
        dueDate: dayjs(),
        type: INWARD_TYPE_LABELS[defaultInwardType] || defaultInwardType,
      });
    }
  }, [incrementData, form, defaultInwardType]);

  const companyOptions = useMemo(() => {
    const rawData = companyData?.Data || companyData?.data || (Array.isArray(companyData) ? companyData : []);
    return Array.isArray(rawData) ? rawData.map((c) => ({ value: c.id, label: c.name })) : [];
  }, [companyData]);

  const typeLabel = INWARD_TYPE_LABELS[defaultInwardType] || defaultInwardType;
  const purchaseFields = [
    { name: 'entry', label: 'Entry No', span: 6, disabled: true },
    {
      name: 'type',
      label: 'Type',
      span: 6,
      disabled: true,
      placeholder: typeLabel,
    },
    { name: 'reference', label: 'Reference', span: 6 },
    { name: 'invoiceNo', label: 'Invoice No', span: 6, required: true },
    { name: 'company', label: 'Party', span: 6, type: 'select', required: true, loading: isCompanyLoading, options: companyOptions },
    { name: 'date', label: 'Date', span: 6, type: 'date', required: true },
    { name: 'terms', label: 'Terms (Days)', span: 6, type: 'number', required: true },
    { name: 'dueDate', label: 'Due Date', span: 6, type: 'date', required: true, disabled: true },
    {
      name: 'operating_company_id',
      label: 'Company',
      span: 6,
      type: 'select',
      required: true,
      loading: isBranchCompanyLoading,
      options: branchCompanyOptions,
      placeholder: 'Select Company (e.g. ShreeHK / KG)',
      allowClear: false,
    },
  ];

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

  const renderInput = (record, field, placeholder, type = 'text') => {
    const isRequired = ['sku', 'pCarat', 'price', 'amount', ...(requirePcs ? ['pPcs'] : [])].includes(field);
    const hasError = isSubmitted && isRequired && String(record.sku || '').trim() && (
      field === 'sku' ? !String(record.sku || '').trim()
        : field === 'pPcs' ? !record.pPcs || Number(record.pPcs) <= 0
          : field === 'pCarat' ? !record.pCarat || record.pCarat <= 0
            : field === 'price' ? !record.price || record.price <= 0
              : !record.amount || record.amount <= 0
    );
    const inputW = wideLineFields
      ? (type === 'number' ? '100%' : '100%')
      : (type === 'number' ? '80px' : '100px');
    return type === 'number' ? (
      <InputNumber status={hasError ? 'error' : ''} value={record[field]} onChange={(val) => handleUpdateCell(record.key, field, val)} style={{ width: inputW }} />
    ) : (
      <Input status={hasError ? 'error' : ''} value={record[field]} onChange={(e) => handleUpdateCell(record.key, field, e.target.value)} placeholder={placeholder} style={{ width: inputW }} />
    );
  };

  const w = wideLineFields
    ? {
        no: 56,
        sku: 180,
        rPcs: 110,
        pPcs: 110,
        pCarat: 120,
        cost: 130,
        price: 130,
        amount: 140,
        mainColor: 140,
        loc: 110,
        lab: 110,
        reportNo: 160,
        shape: 140,
        clarity: 120,
        action: 56,
      }
    : {
        no: 50,
        sku: 120,
        rPcs: 90,
        pPcs: 90,
        pCarat: 100,
        cost: 100,
        price: 100,
        amount: 120,
        mainColor: 100,
        loc: 100,
        lab: 100,
        reportNo: 120,
        shape: 100,
        clarity: 100,
        action: 50,
      };

  const baseColumns = [
    { title: 'No.', width: w.no, fixed: 'left', render: (_, __, index) => index + 1 },
    ...(!hideMfgDno
      ? [
          { title: 'Mfg. code', width: 100, fixed: 'left', render: (_, r) => renderInput(r, 'mfgCode', 'Mfg') },
          { title: 'D. No.', width: 100, fixed: 'left', render: (_, r) => renderInput(r, 'dNo', 'D.No') },
        ]
      : []),
    { title: 'SKU', width: w.sku, fixed: 'left', render: (_, r) => renderInput(r, 'sku', 'SKU') },
  ];
  const pcsTitle = polishFieldLabels ? 'Polish Pcs' : 'P.Pcs';
  const caratTitle = polishFieldLabels ? 'Polish Carat' : 'P.Carat';
  const rPcsColumn = { title: 'R.Pcs', width: w.rPcs, render: (_, r) => renderInput(r, 'rPcs', 'R.Pcs', 'number') };
  const restColumns = [
    { title: pcsTitle, width: w.pPcs, render: (_, r) => renderInput(r, 'pPcs', pcsTitle, 'number') },
    { title: caratTitle, width: w.pCarat, render: (_, r) => renderInput(r, 'pCarat', caratTitle, 'number') },
    { title: 'Cost', width: w.cost, render: (_, r) => renderInput(r, 'cost', 'Cost', 'number') },
    { title: 'Price', width: w.price, render: (_, r) => renderInput(r, 'price', 'Price', 'number') },
    { title: 'Amount', width: w.amount, align: 'right', render: (_, r) => renderInput(r, 'amount', 'Amount', 'number') },
    { title: 'Main Color', width: w.mainColor, render: (_, r) => renderInput(r, 'mainColor', 'Color') },
    { title: 'LOC', width: w.loc, render: (_, r) => renderInput(r, 'loc', 'LOC') },
    { title: 'Lab', width: w.lab, render: (_, r) => renderInput(r, 'lab', 'Lab') },
    { title: 'Report No', width: w.reportNo, render: (_, r) => renderInput(r, 'reportNo', 'Report') },
    { title: 'Shape', width: w.shape, render: (_, r) => renderInput(r, 'shape', 'Shape') },
    { title: 'Clarity', width: w.clarity, render: (_, r) => renderInput(r, 'clarity', 'Clarity') },
    {
      title: '', key: 'action', fixed: 'right', width: w.action,
      render: (_, record) => <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => removeRow(record.key)} />,
    },
  ];
  const columns = showRPcs ? [...baseColumns, rPcsColumn, ...restColumns] : [...baseColumns, ...restColumns];

  const lineRowHeight = 54;
  const tableBodyScrollY = useMemo(() => {
    if (tableScrollY != null) return tableScrollY;
    if (!scrollableTable) return 450;
    return visibleRowCount * lineRowHeight;
  }, [tableScrollY, scrollableTable, visibleRowCount]);

  const tableBodyScrollX = useMemo(() => {
    if (!scrollableTable) return 'max-content';
    return columns.reduce((sum, col) => sum + (col.width || 100), 0);
  }, [scrollableTable, columns]);

  const handleCheckAndSubmit = async () => {
    setIsSubmitted(true);
    try {
      await form.validateFields();
      const normalizedItems = items.map(normalizeLineItem);
      const validationError = getFirstLineItemValidationError(normalizedItems, { requirePcs });

      if (validationError) {
        setItems(normalizedItems);
        toast.error(validationError);
        return;
      }

      setItems(normalizedItems);

      const operatingCompanyId = form.getFieldValue('operating_company_id');
      if (!operatingCompanyId) {
        toast.error('Please select Company');
        return;
      }

      // In Memo / Import: skip checkExist API + confirmation modal → save directly
      if (skipExistCheck) {
        onFinalSave(normalizedItems);
        return;
      }

      const filledItems = getFilledLineItems(normalizedItems).map(normalizeLineItem);

      submitInward(
        {
          products: formatProductsPayload(filledItems),
          operating_company_id: operatingCompanyId,
        },
        {
          onSuccess: (response) => {
            setExistData(response?.data || []);
            setCheckMessage(response?.message || '');
            setIsModalOpen(true);
          },
          onError: (error) => toastApiError(error),
        }
      );
    } catch {
      toast.error('Please fill all required header fields.');
    }
  };

  const onFinalSave = (lineItems = items) => {
    const headerValues = form.getFieldsValue();
    const filledItems = getFilledLineItems(lineItems).map(normalizeLineItem);
    if (!headerValues.operating_company_id) {
      toast.error('Please select Company');
      return;
    }
    const finalPayload = {
      place: headerValues.place || '',
      invoicedate: headerValues.date ? dayjs(headerValues.date).format('DD-MM-YYYY') : '',
      terms: headerValues.terms?.toString() || '0',
      duedate: headerValues.dueDate ? dayjs(headerValues.dueDate).format('DD-MM-YYYY') : '',
      party: headerValues.company,
      operating_company_id: headerValues.operating_company_id,
      invoiceno: headerValues.invoiceNo || '',
      inward_type: defaultInwardType,
      narretion: headerValues.narration || '',
      reference: headerValues.reference || '',
      products: formatProductsPayload(filledItems),
    };
    saveInward(finalPayload, {
      onSuccess: () => {
        invalidateInventoryCaches(queryClient);
        setIsModalOpen(false);
        setExistData([]);
        setCheckMessage('');
        setIsSubmitted(false);
        form.resetFields();
        setItems(createInitialLineItems(initialLineCount));
      },
    });
  };

  const handlePartialReset = () => {
    form.setFieldsValue({
      type: INWARD_TYPE_LABELS[defaultInwardType] || defaultInwardType,
      terms: 0,
      dueDate: dayjs(),
    });
    setItems(createInitialLineItems(initialLineCount));
    setIsSubmitted(false);
  };

  const totalStats = useMemo(() => items.reduce((acc, curr) => ({
    pcs: acc.pcs + (curr.pPcs || curr.rPcs || 0),
    carats: acc.carats + (curr.pCarat || 0),
    amount: acc.amount + (curr.amount || 0),
  }), { pcs: 0, carats: 0, amount: 0 }), [items]);

  return (
    <div className={`${styles.purchaseContainer} ${scrollableTable ? styles.purchaseContainerFixed : ''}`}>
      <PageHeroHeader
        breadcrumb="TRANSACTION / STOCK"
        title={title}
        icon={<SwapOutlined />}
        actions={(
          <Button className={pageHeroHeaderStyles.actionBtn} icon={<RefreshCcw size={16} />} onClick={handlePartialReset}>
            Reset
          </Button>
        )}
      />
      <Form form={form} layout="vertical" className={styles.formSection} onValuesChange={handleValuesChange}>
        <DynamicForm fields={purchaseFields} />
      </Form>
      <div
        className={`${styles.tableSection} ${scrollableTable ? styles.tableSectionScrollable : ''}`}
        style={scrollableTable ? { '--inward-visible-rows': visibleRowCount } : undefined}
      >
        <Table
          columns={columns}
          dataSource={items}
          pagination={false}
          size="small"
          scroll={{ x: tableBodyScrollX, y: tableBodyScrollY }}
        />
        <div className={`${styles.footerStats} ${styles.footerStatsBar}`}>
          <div className={styles.footerStatsTotals}>
            <div className={styles.statItem}><label>Total Carats</label><span>{totalStats.carats.toFixed(2)}</span></div>
            <div className={styles.statItem}><label>Total Amount</label><span className={styles.amount}>${totalStats.amount.toLocaleString()}</span></div>
          </div>
          <div className={styles.footerStatsActions}>
            <Button
              type="dashed"
              onClick={() => addRow(INITIAL_ITEM_STATE)}
              icon={<PlusCircle size={16} />}
              className={styles.addLineBtn}
            >
              Add New Line Item
            </Button>
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

export default InwardEntryForm;
