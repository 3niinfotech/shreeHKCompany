import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Form, Input, Button, Table, InputNumber, Select } from 'antd';
import { toastWarning } from '../../../utils/toastNotify';
import { RefreshCcw, PlusCircle, Trash2, CheckCircle } from 'lucide-react';
import { SwapOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import DynamicForm from '../../../hooks/DynamicFormField';
import { useFetchApi } from '../../../api/ApiFunction';
import { ENDPOINTS } from '../../../constants/endpoints';
import { fetchProductDetail } from '../../../api/services/productService';
import { sendToOutward } from '../../../api/services/outwardService';
import { toastApiError, toastApiSuccess } from '../../../utils/apiToast';
import useFormHandleChange from '../../../hooks/useFormHandleChange';
import PageHeroHeader, { pageHeroHeaderStyles } from '../../../components/common/PageHeroHeader';
import { BaseModal } from '../../../components/common/modals';
import styles from '../../../assets/scss/pages/transaction/inwardpurchase.module.scss';
import { SkuLink } from '../../../hooks/useSkuModalAction';

const CONFIRM_TABLE_COLUMNS = [
  { title: 'No.', width: 50, render: (_, __, i) => i + 1 },
  { title: 'SKU', dataIndex: 'sku', width: 120, ellipsis: true, render: (text, record) => <SkuLink sku={text} record={record} /> },
  { title: 'Shape', dataIndex: 'shape', width: 90, render: (v) => v || '—' },
  {
    title: 'Carat',
    dataIndex: 'polishCarat',
    width: 80,
    align: 'right',
    render: (v) => (Number(v) || 0).toFixed(2),
  },
  { title: 'Color', dataIndex: 'color', width: 80, render: (v) => v || '—' },
  { title: 'Clarity', dataIndex: 'clarity', width: 80, render: (v) => v || '—' },
  { title: 'Lab', dataIndex: 'lab', width: 70, render: (v) => v || '—' },
  {
    title: 'Price',
    dataIndex: 'price',
    width: 90,
    align: 'right',
    render: (v) => (Number(v) || 0).toFixed(2),
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    width: 100,
    align: 'right',
    render: (v) => (Number(v) || 0).toFixed(2),
  },
];

const OUTWARD_TYPE_CONFIG = {
  lab: {
    title: 'GIA / Lab Outward Entry',
    type: 'lab',
    status: 'on_lab',
    returnPath: '/transaction/gia-memo',
    requireOnHand: true,
    confirmBeforeSubmit: true,
    confirmTitle: 'Confirm Lab Outward',
  },
  memo: {
    title: 'Out Memo Entry',
    type: 'memo',
    status: 'on_memo',
    returnPath: '/transaction/out-memo',
    requireOnHand: true,
  },
  sale: {
    title: 'Sale Entry',
    type: 'sale',
    status: 'on_sale',
    returnPath: '/transaction/sale',
    requireOnMemo: true,
    showSaleFields: true,
  },
  export: {
    title: 'Export Entry',
    type: 'export',
    status: 'on_export',
    returnPath: '/outward',
    requireOnHand: true,
  },
  consign: {
    title: 'Consignment Entry',
    type: 'consign',
    status: 'on_consign',
    returnPath: '/outward',
    requireOnHand: true,
  },
};

const INITIAL_LINE = {
  sku: '',
  productId: null,
  shape: '',
  color: '',
  clarity: '',
  lab: '',
  polishPcs: 0,
  polishCarat: 0,
  rapPrice: 0,
  disc: 0,
  price: 0,
  amount: 0,
  groupType: '',
};

function createLineItems(count = 1) {
  const base = Date.now();
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    ...INITIAL_LINE,
    key: base + i,
  }));
}

function recalcLine(item) {
  const carat = Number(item.polishCarat) || 0;
  const price = Number(item.price) || 0;
  const rap = Number(item.rapPrice) || 0;
  let disc = Number(item.disc) || 0;
  if (rap > 0 && price > 0) {
    disc = ((price * 100) / rap - 100);
  }
  const amount = Math.round(carat * price * 100) / 100;
  return { ...item, disc: +disc.toFixed(2), amount };
}

function buildLineFromProduct(row, p) {
  const price = Number(p.sell_price || p.price) || 0;
  const carat = Number(p.polish_carat) || 0;
  const rap = Number(p.rapnet_price || p.rap_price || 0);
  return recalcLine({
    ...row,
    sku: p.sku,
    productId: p.id,
    shape: p.shape || '',
    color: p.color || p.main_color || '',
    clarity: p.clarity || '',
    lab: p.lab || '',
    polishPcs: Number(p.polish_pcs) || 0,
    polishCarat: carat,
    rapPrice: rap,
    price,
    groupType: p.group_type || '',
  });
}

function getSkuValidationError(p, trimmed, config) {
  if (!p?.id) {
    return `SKU "${trimmed}" not found`;
  }
  const outward = String(p.outward || '').toLowerCase();
  if (config.requireOnHand && outward) {
    return `SKU ${trimmed} is already on ${p.outward}`;
  }
  if (config.requireOnMemo && outward !== 'memo') {
    return `SKU ${trimmed} must be on memo for sale`;
  }
  if (p.hold == 1) {
    return `SKU ${trimmed} is on hold`;
  }
  return null;
}

const OutwardEntryForm = ({ outwardType = 'memo' }) => {
  const config = OUTWARD_TYPE_CONFIG[outwardType] || OUTWARD_TYPE_CONFIG.memo;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const { form, items, setItems, addRow, removeRow, updateTableValue } = useFormHandleChange(
    {},
    createLineItems(1),
  );
  const partyId = Form.useWatch('party', form);

  const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
  const { data: incrementData } = useFetchApi('getIncrement', ENDPOINTS.common.increment);

  const companyOptions = useMemo(() => {
    const raw = companyData?.Data || companyData?.data || [];
    return Array.isArray(raw) ? raw.map((c) => ({ value: c.id, label: c.name })) : [];
  }, [companyData]);

  useEffect(() => {
    if (incrementData?.Data) {
      const d = incrementData.Data;
      form.setFieldsValue({
        entryno: d.outward,
        invoiceno: d.invoice != null ? String(d.invoice) : '',
        party: d.company,
        date: dayjs(),
        invoicedate: dayjs(),
        terms: config.showSaleFields ? 30 : undefined,
        duedate: config.showSaleFields ? dayjs().add(30, 'day') : undefined,
        type: config.type,
      });
    }
  }, [incrementData, form, config]);

  const handleValuesChange = (changed, all) => {
    if (!config.showSaleFields) return;
    if (changed.date !== undefined || changed.terms !== undefined) {
      const { date, terms } = all;
      if (date && terms != null) {
        form.setFieldsValue({ duedate: dayjs(date).add(Number(terms) || 0, 'day') });
      }
    }
  };

  const headerFields = useMemo(() => {
    const base = [
      { name: 'entryno', label: 'Outward No', span: 6, disabled: true },
      { name: 'type', label: 'Type', span: 6, type: 'select', disabled: true, options: [{ value: config.type, label: config.type.toUpperCase() }] },
      { name: 'reference', label: 'Reference', span: 6 },
      { name: 'invoiceno', label: 'Invoice No', span: 6 },
      { name: 'party', label: 'Party', span: 6, type: 'select', required: true, loading: isCompanyLoading, options: companyOptions },
      { name: 'date', label: 'Date', span: 6, type: 'date', required: true },
      { name: 'invoicedate', label: 'Invoice Date', span: 6, type: 'date' },
      { name: 'other_party', label: 'Other Party', span: 6, type: 'select', options: companyOptions },
    ];

    if (config.showSaleFields) {
      base.push(
        { name: 'terms', label: 'Terms (Days)', span: 6, type: 'number' },
        { name: 'duedate', label: 'Due Date', span: 6, type: 'date' },
        { name: 'lessPercent', label: 'Less %', span: 6, type: 'number' },
        { name: 'otherLessPercent', label: 'Other Less %', span: 6, type: 'number' },
        { name: 'extraCharge', label: 'Extra Charge', span: 6, type: 'number' },
        { name: 'narration', label: 'Narration', span: 6, type: 'text' },
      );
      return base;
    }
    base.push({ name: 'narration', label: 'Narration', span: 24, type: 'textarea' });
    return base;

    // if (config.showSaleFields) {
    //   base.push(
    //     { name: 'terms', label: 'Terms (Days)', span: 6, type: 'number' },
    //     { name: 'duedate', label: 'Due Date', span: 6, type: 'date' },
    //     { name: 'lessPercent', label: 'Less %', span: 6, type: 'number' },
    //     { name: 'otherLessPercent', label: 'Other Less %', span: 6, type: 'number' },
    //     { name: 'extraCharge', label: 'Extra Charge', span: 6, type: 'number' },
    //   );
    // }
    // base.push({ name: 'narration', label: 'Narration', span: 24, type: 'textarea' });
    // return base;
  }, [config, companyOptions, isCompanyLoading]);

  const lookupSku = useCallback(async (sku, rowKey) => {
    const trimmed = String(sku || '').trim();
    if (!trimmed) return;

    try {
      const data = await fetchProductDetail({ id: trimmed, by: 'p.sku' });
      const p = data?.Data;
      const validationError = getSkuValidationError(p, trimmed, config);
      if (validationError) {
        toastWarning(validationError);
        return;
      }

      setItems((prev) => prev.map((row) => {
        if (row.key !== rowKey) return row;
        return buildLineFromProduct({ ...row, sku: trimmed }, p);
      }));
    } catch (err) {
      if (err?.response?.status === 404) {
        toastWarning(`SKU "${trimmed}" not found for your company`);
        return;
      }
      toastApiError(err);
    }
  }, [config, setItems]);

  const handleCellChange = (key, field, value) => {
    updateTableValue(key, field, value, (item) => {
      const next = { ...item, [field]: value };
      if (field === 'sku') {
        return { ...next, productId: null };
      }
      if (['polishCarat', 'price', 'disc'].includes(field)) {
        if (field === 'disc') {
          const rap = Number(next.rapPrice) || 0;
          const disc = Number(value) || 0;
          const price = rap > 0 ? rap * (1 + disc / 100) : Number(next.price) || 0;
          return recalcLine({ ...next, price: +price.toFixed(2) });
        }
        return recalcLine(next);
      }
      return next;
    });
  };

  const filledLines = useMemo(
    () => items.filter((r) => r.productId && String(r.sku || '').trim()),
    [items],
  );

  const totalStats = useMemo(() => filledLines.reduce(
    (acc, row) => {
      acc.pcs += 1;
      acc.carats += Number(row.polishCarat) || 0;
      acc.amount += Number(row.amount) || 0;
      return acc;
    },
    { pcs: 0, carats: 0, amount: 0 },
  ), [filledLines]);

  const handleReset = () => {
    form.resetFields();
    setItems(createLineItems(1));
    setIsSubmitted(false);
    setConfirmModalOpen(false);
    if (incrementData?.Data) {
      const d = incrementData.Data;
      form.setFieldsValue({
        entryno: d.outward,
        invoiceno: d.invoice != null ? String(d.invoice) : '',
        party: d.company,
        date: dayjs(),
        invoicedate: dayjs(),
        type: config.type,
      });
    }
  };
  

  const buildPayload = useCallback(() => {
    const values = form.getFieldsValue();
    const totalAmount = totalStats.amount;
    const lessPct = Number(values.lessPercent) || 0;
    const otherLessPct = Number(values.otherLessPercent) || 0;
    const extra = Number(values.extraCharge) || 0;
    const lessAmt = totalAmount * lessPct / 100;
    const afterLess = totalAmount - lessAmt;
    const otherLessAmt = afterLess * otherLessPct / 100;
    const finalAmount = afterLess - otherLessAmt + extra;

    return {
      type: config.type,
      status: config.status,
      party: values.party,
      other_party: values.other_party,
      entryno: values.entryno,
      invoiceno: values.invoiceno,
      reference: values.reference || '',
      date: values.date?.format?.('YYYY-MM-DD'),
      invoicedate: values.invoicedate?.format?.('YYYY-MM-DD') ?? values.date?.format?.('YYYY-MM-DD'),
      terms: values.terms,
      duedate: values.duedate?.format?.('YYYY-MM-DD'),
      narration: values.narration || '',
      lessPercent: lessPct,
      lessAmount: +lessAmt.toFixed(2),
      otherLessPercent: otherLessPct,
      otherLessAmount: +otherLessAmt.toFixed(2),
      extraCharge: extra,
      finalAmount: +finalAmount.toFixed(2),
      products: filledLines.map((r) => ({
        id: r.productId,
        sku: r.sku,
        polishCarat: r.polishCarat,
        polishPcs: r.polishPcs,
        groupType: r.groupType,
        rapPrice: r.rapPrice,
        disc: r.disc,
        price: r.price,
        amount: r.amount,
      })),
    };
  }, [config, filledLines, form, totalStats.amount]);

  const executeSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await sendToOutward(buildPayload());
      if (!result?.status) {
        throw new Error(result?.message || 'Save failed');
      }
      toastApiSuccess(result);
      setConfirmModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['GetProductData'] });
      queryClient.invalidateQueries({ queryKey: ['getIncrement'] });
      navigate(config.returnPath);
    } catch (err) {
      if (err?.message) toast.error(err.message);
      else toastApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    try {
      await form.validateFields();
      if (!filledLines.length) {
        const hasPendingSku = items.some((r) => String(r.sku || '').trim());
        if (!hasPendingSku) {
          toast.error('Add at least one line with a valid SKU.');
        }
        return;
      }

      if (config.confirmBeforeSubmit) {
        setConfirmModalOpen(true);
        return;
      }

      await executeSubmit();
    } catch (err) {
      if (err?.message) toast.error(err.message);
      else if (err?.errorFields) {
        toast.error('Please fill all required header fields.');
      }
    }
  };

  const confirmPartyLabel = useMemo(
    () => companyOptions.find((c) => c.value === partyId)?.label || '—',
    [companyOptions, partyId],
  );

  const renderCell = (record, field, placeholder, type = 'text') => {
    const required = field === 'sku';
    const hasError = isSubmitted && required && !record.productId && String(record.sku || '').trim();
    if (type === 'number') {
      return (
        <InputNumber
          status={hasError ? 'error' : ''}
          value={record[field]}
          onChange={(v) => handleCellChange(record.key, field, v)}
          style={{ width: 90 }}
          min={0}
          step={field === 'polishCarat' || field === 'price' ? 0.01 : 1}
        />
      );
    }
    return (
      <Input
        status={hasError ? 'error' : ''}
        value={record[field]}
        onChange={(e) => handleCellChange(record.key, field, e.target.value)}
        onPressEnter={(e) => lookupSku(e.target.value, record.key)}
        onBlur={(e) => lookupSku(e.target.value, record.key)}
        placeholder={placeholder}
        style={{ width: 110 }}
      />
    );
  };

  const columns = [
    { title: 'No.', width: 50, render: (_, __, i) => i + 1 },
    { title: 'SKU', width: 120, render: (_, r) => renderCell(r, 'sku', 'SKU') },
    { title: 'Shape', width: 90, render: (_, r) => r.shape || '-' },
    { title: 'Carat', width: 100, render: (_, r) => renderCell(r, 'polishCarat', '', 'number') },
    { title: 'Color', width: 80, render: (_, r) => r.color || '-' },
    { title: 'Clarity', width: 80, render: (_, r) => r.clarity || '-' },
    { title: 'Price', width: 100, render: (_, r) => renderCell(r, 'price', '', 'number') },
    { title: 'Amount', width: 110, align: 'right', render: (_, r) => (Number(r.amount) || 0).toFixed(2) },
    {
      title: '',
      width: 50,
      fixed: 'right',
      render: (_, record) => (
        <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => removeRow(record.key)} />
      ),
    },
  ];

  return (
    <div className={`${styles.purchaseContainer} ${styles.purchaseContainerFixed}`}>
      <PageHeroHeader
        breadcrumb="TRANSACTION / STOCK"
        title={config.title}
        icon={<SwapOutlined />}
        actions={(
          <Button className={pageHeroHeaderStyles.actionBtn} icon={<RefreshCcw size={16} />} onClick={handleReset}>
            Reset
          </Button>
        )}
      />
      <Form form={form} layout="vertical" className={styles.formSection} onValuesChange={handleValuesChange}>
        <DynamicForm fields={headerFields} />
      </Form>
      <div className={`${styles.tableSection} ${styles.tableSectionScrollable}`}
      // style={{ '--inward-visible-rows': 1 }}
      >
        <Table
          columns={columns}
          dataSource={items}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content', y: 4 * 54 }}
        />
        <div className={`${styles.footerStats} ${styles.footerStatsBar}`}>
          <div className={styles.footerStatsTotals}>
            <div className={styles.statItem}><label>Stones</label><span>{totalStats.pcs}</span></div>
            <div className={styles.statItem}><label>Carats</label><span>{totalStats.carats.toFixed(2)}</span></div>
            <div className={styles.statItem}><label>Amount</label><span className={styles.amount}>${totalStats.amount.toLocaleString()}</span></div>
          </div>
          <div className={styles.footerStatsActions}>
            <Button type="dashed" onClick={() => addRow(INITIAL_LINE)} icon={<PlusCircle size={16} />} className={styles.addLineBtn}>
              Add Line
            </Button>
            <Button type="primary" loading={submitting} icon={<CheckCircle size={18} />} className={styles.submitBtn} onClick={handleSubmit}>
              Submit {config.type.toUpperCase()}
            </Button>
          </div>
        </div>
      </div>

      {config.confirmBeforeSubmit ? (
        <BaseModal
          title={config.confirmTitle || `Confirm ${config.type.toUpperCase()} Outward`}
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onSave={executeSubmit}
          saveBtnText="Confirm & Submit"
          cancelBtnText="Cancel"
          loading={submitting}
          width={920}
          content={(
            <div>
              <div className={styles.confirmSummary}>
                <span><strong>Outward No:</strong> {form.getFieldValue('entryno') || '—'}</span>
                <span><strong>Party:</strong> {confirmPartyLabel}</span>
                <span><strong>Invoice:</strong> {form.getFieldValue('invoiceno') || '—'}</span>
                <span><strong>Stones:</strong> {totalStats.pcs}</span>
                <span><strong>Carats:</strong> {totalStats.carats.toFixed(2)}</span>
                <span><strong>Amount:</strong> ${totalStats.amount.toLocaleString()}</span>
              </div>
              <Table
                columns={CONFIRM_TABLE_COLUMNS}
                dataSource={filledLines}
                rowKey="key"
                pagination={false}
                size="small"
                bordered
                scroll={{ x: 'max-content', y: 280 }}
              />
            </div>
          )}
        />
      ) : null}
    </div>
  );
};

export default OutwardEntryForm;
