import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Select, DatePicker, Typography, Button } from 'antd';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import { BookOutlined, TeamOutlined, CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../api/endpoints';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import ExportExcelButton from '../../components/common/ExportExcelButton';
import { exportPartyReportToExcel } from '../../utils/reportExcelExport';
import styles from '../../assets/scss/pages/accountings/transaction.module.scss';

const { Text } = Typography;

const EXPORT_HEADERS = [
  { title: 'No', key: 'no', width: 8 },
  { title: 'Date', key: 'date', width: 12 },
  { title: 'Account', key: 'account', width: 14 },
  { title: 'Party', key: 'party', width: 16 },
  { title: 'Other Party', key: 'otherParty', width: 16 },
  { title: 'Cheque', key: 'cheque', width: 12 },
  { title: 'Description', key: 'description', width: 24 },
  { title: 'Credit', key: 'credit', width: 12 },
  { title: 'Debit', key: 'debit', width: 12 },
  { title: 'Balance', key: 'balance', width: 12 },
];

const AccPartyReport = () => {
  const [selectedBook, setSelectedBook] = useState('');
  const [partyId, setPartyId] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [dataSource, setDataSource] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const { data: bookData } = useFetchApi('accBooks', ENDPOINTS.accountingTxn.books);
  const { data: partyData } = useFetchApi('accPartyList', ENDPOINTS.partyWise.list, { limit: 500, offset: 0 });
  const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
  const { mutate: fetchTxn, isPending: mutationLoading } = usePostApiRequest(ENDPOINTS.accountingTxn.list, 'accPartyReport', { showToast: false });

  const isTableLoading = initialLoading || mutationLoading;

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

  const resolvePartyName = (val) => {
    if (val == null || val === '') return '-';
    return partyNameById.get(String(val)) || String(val);
  };

  const selectedPartyName = useMemo(
    () => partyOptions.find((p) => p.value === partyId)?.label || '',
    [partyOptions, partyId],
  );

  const columns = [
    { title: 'No', dataIndex: 'no', key: 'no', width: 50, align: 'center' },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 100, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Account', dataIndex: 'account', key: 'account', width: 90 },
    { title: 'Party', dataIndex: 'party', key: 'party', width: 260, render: (v) => resolvePartyName(v) },
    { title: 'Other Party', dataIndex: 'otherParty', key: 'otherParty', width: 260, render: (v) => resolvePartyName(v) },
    { title: 'Cheque', dataIndex: 'cheque', key: 'cheque', width: 150 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Credit', dataIndex: 'credit', key: 'credit', width: 100, align: 'right' },
    { title: 'Debit', dataIndex: 'debit', key: 'debit', width: 100, align: 'right' },
    {
      title: 'Balance', dataIndex: 'balance', key: 'balance', width: 110, align: 'right',
      render: (v) => <Text strong>{v}</Text>,
    },
  ];

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
  const tableHeight = useTableBodyScrollHeight(tableRef, [dataSource.length, isTableLoading]);

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

      <div ref={tableRef} className="erp-table-container">
        <SkeletonAwareTable
          columns={columns}
          dataSource={dataSource}
          loading={isTableLoading}
          scroll={{ x: 1100, y: tableHeight }}
          pagination={{ pageSize: 50, showSizeChanger: true }}
          size="small"
          bordered
        />
      </div>
    </div>
  );
};

export default AccPartyReport;
