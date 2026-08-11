import React, { useMemo, useState, useRef } from 'react';
import { Select, DatePicker, Table, Typography, Button, message } from 'antd';
import { BookOutlined, TeamOutlined, CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import { FileUp } from 'lucide-react';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import PageHeroHeader from '../../components/common/PageHeroHeader';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import { exportReportToExcel } from '../../utils/reportExcelExport';
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

  const { data: bookData } = useFetchApi('accBooks', ENDPOINTS.accountingTxn.books);
  const { data: partyData } = useFetchApi('accPartyList', ENDPOINTS.partyWise.list, { limit: 500, offset: 0 });
  const { mutate: fetchTxn, isLoading } = usePostApiRequest(ENDPOINTS.accountingTxn.list, 'accPartyReport', { showToast: false });

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

  const selectedPartyName = useMemo(
    () => partyOptions.find((p) => p.value === partyId)?.label || '',
    [partyOptions, partyId],
  );

  const columns = [
    { title: 'No', dataIndex: 'no', key: 'no', width: 50, align: 'center' },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 100, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Account', dataIndex: 'account', key: 'account', width: 120 },
    { title: 'Party', dataIndex: 'party', key: 'party', width: 130 },
    { title: 'Other Party', dataIndex: 'otherParty', key: 'otherParty', width: 130 },
    { title: 'Cheque', dataIndex: 'cheque', key: 'cheque', width: 100 },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Credit', dataIndex: 'credit', key: 'credit', width: 100, align: 'right' },
    { title: 'Debit', dataIndex: 'debit', key: 'debit', width: 100, align: 'right' },
    {
      title: 'Balance', dataIndex: 'balance', key: 'balance', width: 110, align: 'right',
      render: (v) => <Text strong>{v}</Text>,
    },
  ];

  const handleSearch = () => {
    fetchTxn({
      book: selectedBook || undefined,
      party: selectedPartyName || undefined,
      fromDate: fromDate ? dayjs(fromDate).format('DD-MM-YYYY') : undefined,
      toDate: toDate ? dayjs(toDate).format('DD-MM-YYYY') : undefined,
    }, {
      onSuccess: (res) => setDataSource((res?.data || []).map((r, i) => ({ ...r, key: i }))),
    });
  };

  const handleExport = async () => {
    if (!dataSource.length) {
      message.warning('Run search first — no data to export.');
      return;
    }
    setExporting(true);
    try {
      await exportReportToExcel({
        headers: EXPORT_HEADERS,
        rows: dataSource,
        fileName: 'accounting_party_report',
        sheetName: 'Party Report',
      });
      message.success('Exported to Excel');
    } catch (err) {
      message.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleClearFilters = () => {
    setSelectedBook('');
    setPartyId('');
    setFromDate(null);
    setToDate(null);
  };

  const activeFilterCount = [selectedBook, partyId, fromDate, toDate].filter(Boolean).length;
  const tableRef = useRef(null);
  const tableHeight = useTableBodyScrollHeight(tableRef, [dataSource.length, isLoading]);

  return (
    <div className={styles.pageContainer}>
      {/* <PageHeroHeader
          breadcrumb="ACCOUNTING / REPORTS"
          title="Accounting Party Report"
          icon={<TeamOutlined />}
          actions={(
            <Button type="primary" icon={<FileUp size={16} />} loading={exporting} onClick={handleExport} disabled={!dataSource.length}>
              Export to Excel
            </Button>
          )}
        /> */}

      <AdvancedFilterPanel
        title="Filter Party Report"
        subtitle="Select accounting party (dai_party), book, and date range."
        activeCount={activeFilterCount}
        onClear={handleClearFilters}
        clearDisabled={!activeFilterCount}
        onSearch={handleSearch}
        searchLoading={isLoading}
        extraActions={(
          <>
            <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={isLoading}>
              Reload
            </Button>
            <Button type="primary" icon={<FileUp size={16} />} loading={exporting} onClick={handleExport} disabled={!dataSource.length} style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)", color: "#fff", padding: "18px" }}>
              Export to Excel
            </Button>
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
            style={{ padding: "7px" }}
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
            style={{ padding: "7px" }}
          />
        </FilterField>
        <FilterField label="From" icon={<CalendarOutlined />}>
          <DatePicker
            className={filterPanelStyles.filterControl}
            value={fromDate}
            onChange={setFromDate}
            format="DD-MM-YYYY"
          />
        </FilterField>
        <FilterField label="To" icon={<CalendarOutlined />}>
          <DatePicker
            className={filterPanelStyles.filterControl}
            value={toDate}
            onChange={setToDate}
            format="DD-MM-YYYY"
          />
        </FilterField>
      </AdvancedFilterPanel>

      <div ref={tableRef} className="erp-table-container">
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={isLoading}
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
