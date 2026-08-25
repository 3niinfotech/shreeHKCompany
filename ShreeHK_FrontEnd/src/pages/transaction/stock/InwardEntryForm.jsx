import React, { useEffect, useMemo, useState } from 'react';
import { Form, Input, Button, Table, InputNumber } from 'antd';
import { RefreshCcw, PlusCircle, Trash2, CheckCircle } from 'lucide-react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toastApiError } from '../../../utils/apiToast';
import DynamicForm from '../../../hooks/DynamicFormField';
import { useFetchApi, usePostApiRequest } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../constants/endpoints';
import useFormHandleChange from '../../../hooks/useFormHandleChange';
import ValidationTableModal from '../../../hooks/ValidationTableModal';
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
    sku: item.sku,
    rought_pcs: item.rPcs?.toString() || '',
    polish_pcs: item.pPcs?.toString() || '',
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

const InwardEntryForm = ({
  title,
  defaultInwardType = 'purchase',
  showRPcs = false,
  initialLineCount = 1,
  visibleRowCount = 7,
  tableScrollY,
  scrollableTable = false,
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
    if (incrementData?.Data) {
      const d = incrementData.Data;
      form.setFieldsValue({
        entry: d.inward,
        reference: d.reference,
        invoiceNo: d.invoice,
        company: d.company,
        date: dayjs(),
        terms: 0,
        dueDate: dayjs(),
        type: defaultInwardType,
      });
    }
  }, [incrementData, form, defaultInwardType]);

  const companyOptions = useMemo(() => {
    const rawData = companyData?.Data || companyData?.data || (Array.isArray(companyData) ? companyData : []);
    return Array.isArray(rawData) ? rawData.map((c) => ({ value: c.id, label: c.name })) : [];
  }, [companyData]);

  const purchaseFields = [
    { name: 'entry', label: 'Entry No', span: 6, disabled: true },
    {
      name: 'type',
      label: 'Inward Type',
      span: 6,
      type: 'select',
      required: true,
      disabled: true,
      options: [
        { value: 'purchase', label: 'Purchase' },
        { value: 'memo', label: 'In Memo' },
        { value: 'export', label: 'Export' },
        { value: 'consign', label: 'Consignment' },
      ],
    },
    { name: 'reference', label: 'Reference', span: 6 },
    { name: 'invoiceNo', label: 'Invoice No', span: 6, required: true },
    { name: 'company', label: 'Company', span: 6, type: 'select', required: true, loading: isCompanyLoading, options: companyOptions },
    { name: 'date', label: 'Date', span: 6, type: 'date', required: true },
    { name: 'terms', label: 'Terms (Days)', span: 6, type: 'number', required: true },
    { name: 'dueDate', label: 'Due Date', span: 6, type: 'date', required: true, disabled: true },
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

  const renderInput = (record, field, placeholder, type = 'text') => {
    const isRequired = ['sku', 'pCarat', 'price', 'amount'].includes(field);
    const hasError = isSubmitted && isRequired && String(record.sku || '').trim() && (
      field === 'sku' ? !String(record.sku || '').trim()
        : field === 'pCarat' ? !record.pCarat || record.pCarat <= 0
          : field === 'price' ? !record.price || record.price <= 0
            : !record.amount || record.amount <= 0
    );
    return type === 'number' ? (
      <InputNumber status={hasError ? 'error' : ''} value={record[field]} onChange={(val) => handleUpdateCell(record.key, field, val)} style={{ width: '80px' }} />
    ) : (
      <Input status={hasError ? 'error' : ''} value={record[field]} onChange={(e) => handleUpdateCell(record.key, field, e.target.value)} placeholder={placeholder} style={{ width: '100px' }} />
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
    {
      title: '', key: 'action', fixed: 'right', width: 50,
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
      const validationError = getFirstLineItemValidationError(normalizedItems);

      if (validationError) {
        setItems(normalizedItems);
        toast.error(validationError);
        return;
      }

      const filledItems = getFilledLineItems(normalizedItems).map(normalizeLineItem);

      submitInward(
        { products: formatProductsPayload(filledItems) },
        {
          onSuccess: (response) => {
            setItems(normalizedItems);
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

  const onFinalSave = () => {
    const headerValues = form.getFieldsValue();
    const filledItems = getFilledLineItems(items).map(normalizeLineItem);
    const finalPayload = {
      place: headerValues.place || '',
      invoicedate: headerValues.date ? dayjs(headerValues.date).format('DD-MM-YYYY') : '',
      terms: headerValues.terms?.toString() || '0',
      duedate: headerValues.dueDate ? dayjs(headerValues.dueDate).format('DD-MM-YYYY') : '',
      party: headerValues.company,
      invoiceno: headerValues.invoiceNo || '',
      inward_type: headerValues.type || defaultInwardType,
      narretion: headerValues.narration || '',
      reference: headerValues.reference || '',
      products: formatProductsPayload(filledItems),
    };
    saveInward(finalPayload, {
      onSuccess: () => {
        invalidateInventoryCaches(queryClient);
        const skuList = filledItems.map((item) => item.sku).filter(Boolean).join(', ');
        if (skuList) {
          // toast.success(`Stock saved. Open Inventory → My Inventory and search: ${skuList}`);
        }
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
    form.setFieldsValue({ type: defaultInwardType, terms: 0, dueDate: dayjs() });
    setItems(createInitialLineItems(initialLineCount));
    setIsSubmitted(false);
  };

  const totalStats = useMemo(() => items.reduce((acc, curr) => ({
    pcs: acc.pcs + (curr.pPcs || 0),
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
          setCheckMessage('');
        }}
        onSave={onFinalSave}
        existData={existData}
        items={items}
        message={checkMessage}
        loading={isSaving}
      />
    </div>
  );
};

export default InwardEntryForm;
