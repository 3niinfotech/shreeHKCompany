import React, { useMemo, useState, useRef, useCallback } from 'react';
import { Select, DatePicker, Typography, Button } from 'antd';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';
import {
    BookOutlined,
    TeamOutlined,
    CalendarOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../api/endpoints';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import ExportExcelButton from '../../components/common/ExportExcelButton';
import { exportPartyReportToExcel } from '../../utils/reportExcelExport';
import { toastSuccess, toastWarning, toastError } from '../../utils/toastNotify';
import styles from '../../assets/scss/pages/accountings/transaction.module.scss';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';

const { Option } = Select;
const { Text } = Typography;

const Transaction = () => {
    const [selectedBook, setSelectedBook] = useState('');
    const [party, setParty] = useState('');
    const [otherParty, setOtherParty] = useState('');
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [dataSource, setDataSource] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [exporting, setExporting] = useState(false);

    const { data: bookData } = useFetchApi('accBooks', ENDPOINTS.accountingTxn.books);
    const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: fetchTxn, isPending: mutationLoading } = usePostApiRequest(ENDPOINTS.accountingTxn.list, 'accTransaction', { showToast: false });

    const isTableLoading = mutationLoading;

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
        const list = companyData?.Data || [];
        return list.map((c) => ({ value: c.name, label: c.name }));
    }, [companyData]);

    const partyNameById = useMemo(() => {
        const map = new Map();
        (companyData?.Data || []).forEach((c) => {
            if (c?.id != null) map.set(String(c.id), c.name);
            if (c?.name) map.set(String(c.name), c.name);
        });
        return map;
    }, [companyData]);

    const resolvePartyName = (val) => {
        if (val == null || val === '') return '-';
        return partyNameById.get(String(val)) || String(val);
    };

    const columns = [
        { title: 'No', dataIndex: 'no', key: 'no', width: 50, align: 'center' },
        { title: 'Date', dataIndex: 'date', key: 'date', width: 120, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        { title: 'Account', dataIndex: 'account', key: 'account', width: 230 },
        { title: 'Party', dataIndex: 'party', key: 'party', width: 275, render: (v) => resolvePartyName(v) },
        { title: 'Other Party', dataIndex: 'otherParty', key: 'otherParty', width: 120, render: (v) => resolvePartyName(v) },
        { title: 'Cheque', dataIndex: 'cheque', key: 'cheque', width: 160 },
        { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
        { title: 'Credit', dataIndex: 'credit', key: 'credit', width: 100, align: 'right', className: 'text-success' },
        { title: 'Debit', dataIndex: 'debit', key: 'debit', width: 100, align: 'right', className: 'text-danger' },
        {
            title: 'Balance', dataIndex: 'balance', key: 'balance', width: 110, align: 'right',
            render: (v) => <Text strong>{v}</Text>
        },
    ];

    const handleSearch = useCallback((overrideFilters) => {
        const isOverride = overrideFilters && typeof overrideFilters === 'object' && !overrideFilters.nativeEvent && !overrideFilters.target && !overrideFilters._reactName;
        const filters = isOverride ? overrideFilters : {
            book: selectedBook || undefined,
            party: party || undefined,
            otherParty: otherParty || undefined,
            fromDate: fromDate ? dayjs(fromDate).format('DD-MM-YYYY') : undefined,
            toDate: toDate ? dayjs(toDate).format('DD-MM-YYYY') : undefined,
        };

        setHasSearched(true);
        fetchTxn(filters, {
            onSuccess: (res) => setDataSource((res?.data || []).map((r, i) => ({ ...r, key: i }))),
        });
    }, [fetchTxn, selectedBook, party, otherParty, fromDate, toDate]);

    const handleExport = async () => {
        if (!dataSource.length) {
            toastWarning('Run search first — no data to export.');
            return;
        }
        setExporting(true);
        try {
            const firstRow = dataSource[0] || {};
            const firstParty = resolvePartyName(firstRow.party);
            const firstOtherParty = resolvePartyName(firstRow.otherParty);
            const titleSource = party
                || otherParty
                || (firstParty !== '-' ? firstParty : '')
                || (firstOtherParty !== '-' ? firstOtherParty : '')
                || '';
            const title = titleSource ? `${titleSource} Report` : 'Transaction Report';
            const fileName = titleSource
                ? `${titleSource.replace(/[^a-zA-Z0-9_-]/g, '_')}_Report`
                : 'Transaction_Report';
            const exportRows = dataSource.map((row) => ({
                ...row,
                party: resolvePartyName(row.party),
                otherParty: resolvePartyName(row.otherParty),
            }));
            await exportPartyReportToExcel({
                rows: exportRows,
                title,
                fileName,
                sheetName: titleSource || 'Transaction Report',
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
        setParty('');
        setOtherParty('');
        setFromDate(null);
        setToDate(null);
        setDataSource([]);
        setHasSearched(false);
    };

    const activeFilterCount = [
        selectedBook,
        party,
        otherParty,
        fromDate,
        toDate,
    ].filter(Boolean).length;

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(
        tableRef,
        [dataSource.length, isTableLoading, hasSearched],
        { hasPagination: false }
    );

    return (
        <div className={styles.pageContainer}>
            <AdvancedFilterPanel
                title="Filter Transactions"
                subtitle=""
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

                <FilterField label="Party" icon={<TeamOutlined />}>
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        placeholder="Select party"
                        className={filterPanelStyles.filterControl}
                        value={party || undefined}
                        onChange={setParty}
                        virtual
                    >
                        {partyOptions.map((p) => (
                            <Option key={p.value} value={p.value}>{p.label}</Option>
                        ))}
                    </Select>
                </FilterField>

                <FilterField label="Other Party" icon={<TeamOutlined />}>
                    <Select
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        placeholder="Select other party"
                        className={filterPanelStyles.filterControl}
                        value={otherParty || undefined}
                        onChange={setOtherParty}
                    >
                        {partyOptions.map((p) => (
                            <Option key={`o-${p.value}`} value={p.value}>{p.label}</Option>
                        ))}
                    </Select>
                </FilterField>

                <FilterField label="From Date" icon={<CalendarOutlined />}>
                    <DatePicker
                        format="DD-MM-YYYY"
                        value={fromDate}
                        onChange={setFromDate}
                        className={filterPanelStyles.filterControl}
                        placeholder="From date"
                    />
                </FilterField>

                <FilterField label="To Date" icon={<CalendarOutlined />}>
                    <DatePicker
                        format="DD-MM-YYYY"
                        value={toDate}
                        onChange={setToDate}
                        className={filterPanelStyles.filterControl}
                        placeholder="To date"
                    />
                </FilterField>
            </AdvancedFilterPanel>

            <div className={styles.tableWrap}>
                <div
                    ref={tableRef}
                    className={`${styles.tableBodyArea} erp-table-container`}
                    style={{ '--table-scroll-y': `${tableHeight}px` }}
                >
                    <SkeletonAwareTable
                        dataSource={dataSource}
                        columns={columns}
                        loading={isTableLoading}
                        locale={{
                            emptyText: hasSearched
                                ? 'No transactions found'
                                : 'Select filters and click Search to load transactions',
                        }}
                        pagination={false}
                        bordered
                        size="small"
                        scroll={{ x: 'max-content', y: tableHeight }}
                        className={styles.customTable}
                    />
                </div>
            </div>
        </div>
    );
};

export default Transaction;
