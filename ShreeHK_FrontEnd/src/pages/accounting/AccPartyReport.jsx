import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Select, DatePicker, Typography, Button, Tooltip } from 'antd';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import { BookOutlined, TeamOutlined, CalendarOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../api/endpoints';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import ExportExcelButton from '../../components/common/ExportExcelButton';
import { exportPartyReportToExcel } from '../../utils/reportExcelExport';
import AdvanceAssignedInvoiceModal from '../../components/pages/Advance/AdvanceAssignedInvoiceModal';
import styles from '../../assets/scss/pages/accountings/transaction.module.scss';

const { Text } = Typography;

const ROW_LIMIT_OPTIONS = [
  { value: 100, label: '100' },
  { value: 200, label: '200' },
  { value: 500, label: '500' },
  { value: 'all', label: 'All' },
];

const isPaymentAccount = (record) => {
  const account = String(record?.account || '').trim().toUpperCase();
  const book = String(record?.book || '').trim().toUpperCase();
  return account === 'PAYMENT' || book === 'PAYMENT';
};

const getInvoiceRecord = (record) => {
  const invoiceId = record?.invoice_id || record?.invoice || record?.sale_id || record?.purchase_id || '';
  if (!invoiceId) return null;
  return {
    ...record,
    invoice_id: invoiceId,
    invoice: invoiceId,
    type: record?.invoice_type || record?.type || (record?.sale_id ? 'outward' : 'inward'),
    party_name: record?.party,
  };
};

const AccPartyReport = () => {
  const [selectedBook, setSelectedBook] = useState('');
  const [partyId, setPartyId] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [dataSource, setDataSource] = useState([]);
  const [rowLimit, setRowLimit] = useState(100);
  const [limitLoading, setLimitLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [invoiceModal, setInvoiceModal] = useState({ open: false, record: null });
  const limitLoadTimerRef = useRef(null);

  const { data: bookData } = useFetchApi('accBooks', ENDPOINTS.accountingTxn.books);
  const { data: partyData } = useFetchApi('accPartyList', ENDPOINTS.partyWise.list, { limit: 500, offset: 0 });
  const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
  const { mutate: fetchTxn, isPending: mutationLoading } = usePostApiRequest(ENDPOINTS.accountingTxn.list, 'accPartyReport', { showToast: false });

  const isTableLoading = initialLoading || mutationLoading || limitLoading;

  const handleRowLimitChange = useCallback((value) => {
    const heavy = value === 'all' || Number(value) >= 500;
    if (limitLoadTimerRef.current) {
      window.clearTimeout(limitLoadTimerRef.current);
      limitLoadTimerRef.current = null;
    }
    if (!heavy) {
      setRowLimit(value);
      return;
    }
    setLimitLoading(true);
    // Let skeleton paint first, then apply heavy rows
    limitLoadTimerRef.current = window.setTimeout(() => {
      setRowLimit(value);
      limitLoadTimerRef.current = window.setTimeout(() => {
        setLimitLoading(false);
        limitLoadTimerRef.current = null;
      }, 120);
    }, 40);
  }, []);

  useEffect(() => () => {
    if (limitLoadTimerRef.current) window.clearTimeout(limitLoadTimerRef.current);
  }, []);

  const bookOptions = useMemo(() => {
    const list = bookData?.Data || [];
    return list.map((b) => {
      if (b && typeof b === 'object' && b.value != null) {
        return { value: String(b.value), label: String(b.label ?? b.value) };
      }
      const name = b?.name ?? String(b);
      return { value: name, label: name };
    });
  }, [bookData]);

  const partyOptions = useMemo(() => {
    const list = partyData?.Data || [];
    return list.map((p) => ({ value: String(p.id), label: p.name }));
  }, [partyData]);

  const partyNameById = useMemo(() => {
    const map = new Map();
    (partyData?.Data || []).forEach((p) => {
      if (p?.id != null) map.set(String(p.id), p.name);
      if (p?.name) map.set(String(p.name), p.name);
    });
    (companyData?.Data || []).forEach((c) => {
      if (c?.id != null) map.set(String(c.id), c.name);
      if (c?.name) map.set(String(c.name), c.name);
    });
    return map;
  }, [partyData, companyData]);

  const resolvePartyName = useCallback((val) => {
    if (val == null || val === '') return '-';
    return partyNameById.get(String(val)) || String(val);
  }, [partyNameById]);

  const selectedPartyName = useMemo(
    () => partyOptions.find((p) => p.value === partyId)?.label || '',
    [partyOptions, partyId],
  );

  const openInvoiceModal = useCallback((record) => {
    const invoiceRecord = getInvoiceRecord(record);
    if (!invoiceRecord) {
      toastWarning('No invoice linked to this payment.');
      return;
    }
    setInvoiceModal({ open: true, record: invoiceRecord });
  }, []);

  const columns = useMemo(() => [
    { title: 'No', dataIndex: 'no', key: 'no', width: 50, align: 'center' },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 100, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Account', dataIndex: 'account', key: 'account', width: 190 },
    {
      title: 'Party',
      dataIndex: 'party',
      key: 'party',
      width: 300,
      render: (v, record) => {
        const name = resolvePartyName(v);
        if (!isPaymentAccount(record)) return name;
        const canOpen = Boolean(record?.invoice_id || record?.invoice || record?.sale_id || record?.purchase_id);
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Tooltip title={canOpen ? 'View invoice' : 'No invoice linked'}>
              <EyeOutlined
                style={{
                  color: canOpen ? '#0284c7' : '#94a3b8',
                  cursor: canOpen ? 'pointer' : 'not-allowed',
                  fontSize: 16,
                  flexShrink: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canOpen) openInvoiceModal(record);
                  else toastWarning('No invoice linked to this payment.');
                }}
              />
            </Tooltip>
            <span>{name}</span>
          </span>
        );
      },
    },
    { title: 'Other Party', dataIndex: 'otherParty', key: 'otherParty', width: 200, render: (v) => resolvePartyName(v) },
    { title: 'Book', dataIndex: 'book', key: 'book', width: 140, render: (v) => v || '-' },
    { title: 'Cheque', dataIndex: 'cheque', key: 'cheque', width: 120 },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 320 },
    {
      title: 'Credit',
      dataIndex: 'credit',
      key: 'credit',
      width: 100,
      align: 'right',
      className: 'text-success',
      render: (v) => (v != null && v !== '' && Number(v) !== 0 ? <Text className="text-success">{v}</Text> : (v ?? '-')),
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      width: 100,
      align: 'right',
      className: 'text-danger',
      render: (v) => (v != null && v !== '' && Number(v) !== 0 ? <Text className="text-danger">{v}</Text> : (v ?? '-')),
    },
    {
      title: 'Balance', dataIndex: 'balance', key: 'balance', width: 110, align: 'right',
      render: (v) => <Text strong>{v}</Text>,
    },
  ], [resolvePartyName, openInvoiceModal]);

  const handleSearch = useCallback((overrideFilters) => {
    const isOverride = overrideFilters && typeof overrideFilters === 'object' && !overrideFilters.nativeEvent && !overrideFilters.target && !overrideFilters._reactName;
    const filters = isOverride ? overrideFilters : {
      book: selectedBook || undefined,
      party: selectedPartyName || undefined,
      partyId: partyId || undefined,
      fromDate: fromDate ? dayjs(fromDate).format('DD-MM-YYYY') : undefined,
      toDate: toDate ? dayjs(toDate).format('DD-MM-YYYY') : undefined,
    };

    fetchTxn(filters, {
      onSuccess: (res) => setDataSource((res?.data || []).map((r, i) => ({ ...r, key: i }))),
      onSettled: () => setInitialLoading(false),
    });
  }, [fetchTxn, selectedBook, selectedPartyName, partyId, fromDate, toDate]);

  // Load default data on page mount
  useEffect(() => {
    fetchTxn({}, {
      onSuccess: (res) => setDataSource((res?.data || []).map((r, i) => ({ ...r, key: i }))),
      onSettled: () => setInitialLoading(false),
    });
  }, [fetchTxn]);

  const tableRows = useMemo(() => {
    if (rowLimit === 'all') return dataSource;
    return dataSource.slice(0, Number(rowLimit) || 100);
  }, [dataSource, rowLimit]);

  const handleExport = async () => {
    if (!dataSource.length) {
      toastWarning('Run search first — no data to export.');
      return;
    }
    setExporting(true);
    try {
      const titleParts = [selectedPartyName, selectedBook].filter(Boolean);
      const title = titleParts.length > 0 ? `${titleParts.join(' ')} Report` : 'Party Report';
      const fileName = titleParts.length > 0
        ? `${titleParts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_')}_Report`
        : 'Party_Report';

      const exportRows = dataSource.map((r) => ({
        ...r,
        party: resolvePartyName(r.party),
        otherParty: resolvePartyName(r.otherParty),
      }));

      await exportPartyReportToExcel({
        rows: exportRows,
        title,
        fileName,
        sheetName: 'Party Report',
        omitColumns: ['cheque'],
      });
      toastSuccess('Exported to Excel');
    } catch (err) {
      toastError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedBook('');
    setPartyId('');
    setFromDate(null);
    setToDate(null);
    fetchTxn({}, {
      onSuccess: (res) => setDataSource((res?.data || []).map((r, i) => ({ ...r, key: i }))),
    });
  };

  const activeFilterCount = [selectedBook, partyId, fromDate, toDate].filter(Boolean).length;
  const tableRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(160);

  // Use only the flex-allocated body area height (no viewport overshoot),
  // so all rowLimit rows remain scrollable and none are clipped.
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;

    const updateHeight = () => {
      const header = el.querySelector('.ant-table-header');
      const stickyScroll = el.querySelector('.ant-table-sticky-scroll');
      const headerH = header instanceof HTMLElement ? header.offsetHeight : 0;
      const stickyH = stickyScroll instanceof HTMLElement ? stickyScroll.offsetHeight : 0;
      const next = Math.floor(el.clientHeight - headerH - stickyH);
      setTableHeight(next > 160 ? next : 160);
    };

    updateHeight();
    const timer = window.setTimeout(updateHeight, 120);
    const rafId = window.requestAnimationFrame(updateHeight);
    window.addEventListener('resize', updateHeight);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(el);
      const wrap = el.parentElement;
      if (wrap) resizeObserver.observe(wrap);
    }

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.clearTimeout(timer);
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
    };
  }, [tableRows.length, isTableLoading, dataSource.length, rowLimit]);

  return (
    <div className={styles.pageContainer}>
      <AdvancedFilterPanel
        title="Filter Party Report"
        subtitle="Select accounting party (dai_party), book, and date range."
        activeCount={activeFilterCount}
        onClear={handleClearFilters}
        clearDisabled={!activeFilterCount}
        onSearch={() => handleSearch()}
        searchLoading={isTableLoading}
        extraActions={(
          <>
            <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={() => handleSearch()} loading={isTableLoading}>
              Reload
            </Button>
            <ExportExcelButton
              loading={exporting}
              onClick={handleExport}
              disabled={!dataSource.length}
            />
          </>
        )}
      >
        <FilterField label="Party" icon={<TeamOutlined />}>
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Select party"
            className={filterPanelStyles.filterControl}
            value={partyId || undefined}
            onChange={(v) => setPartyId(v || '')}
            options={partyOptions}
            virtual
          />
        </FilterField>
        <FilterField label="Book" icon={<BookOutlined />}>
          <Select
            allowClear
            placeholder="Select book"
            className={filterPanelStyles.filterControl}
            value={selectedBook || undefined}
            onChange={(v) => setSelectedBook(v || '')}
            options={bookOptions}
          />
        </FilterField>
        <FilterField label="From" icon={<CalendarOutlined />} className={filterPanelStyles.keepFieldLabel}>
          <DatePicker
            className={filterPanelStyles.filterControl}
            value={fromDate}
            onChange={setFromDate}
            format="DD-MM-YYYY"
          />
        </FilterField>
        <FilterField label="To" icon={<CalendarOutlined />} className={filterPanelStyles.keepFieldLabel}>
          <DatePicker
            className={filterPanelStyles.filterControl}
            value={toDate}
            onChange={setToDate}
            format="DD-MM-YYYY"
          />
        </FilterField>
      </AdvancedFilterPanel>

      <div className={styles.tableWrap}>
        <div ref={tableRef} className={`${styles.tableBodyArea} erp-table-container`}>
          <SkeletonAwareTable
            columns={columns}
            dataSource={tableRows}
            loading={isTableLoading}
            scroll={{ x: 'max-content', y: tableHeight }}
            pagination={false}
            size="small"
            bordered
            tableLayout="auto"
          />
        </div>
        <div className={styles.tableFooterBar}>
          <Text type="secondary" className={styles.tableFooterText}>
            Showing <b>{tableRows.length}</b> of <b>{dataSource.length}</b>
          </Text>
          <Select
            size="small"
            value={rowLimit}
            onChange={handleRowLimitChange}
            options={ROW_LIMIT_OPTIONS}
            className={styles.tableFooterSelect}
            popupMatchSelectWidth={false}
            loading={limitLoading}
            disabled={limitLoading}
          />
        </div>
      </div>

      <AdvanceAssignedInvoiceModal
        open={invoiceModal.open}
        record={invoiceModal.record}
        onClose={() => setInvoiceModal({ open: false, record: null })}
        resolvePartyName={resolvePartyName}
      />
    </div>
  );
};

export default AccPartyReport;
