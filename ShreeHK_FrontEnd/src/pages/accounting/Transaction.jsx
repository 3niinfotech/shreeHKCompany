import React, { useMemo, useState, useRef } from 'react';
import { Select, DatePicker, Table, Typography, Button } from 'antd';
import {
    BookOutlined,
    TeamOutlined,
    CalendarOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
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

    const { data: bookData } = useFetchApi('accBooks', ENDPOINTS.accountingTxn.books);
    const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: fetchTxn, isLoading } = usePostApiRequest(ENDPOINTS.accountingTxn.list, 'accTransaction', { showToast: false });

    const bookOptions = bookData?.Data || [];
    const partyOptions = useMemo(() => {
        const list = companyData?.Data || [];
        return list.map((c) => ({ value: c.name, label: c.name }));
    }, [companyData]);

    const columns = [
        { title: 'No', dataIndex: 'no', key: 'no', width: 50, align: 'center' },
        { title: 'Date', dataIndex: 'date', key: 'date', width: 100, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        { title: 'Account', dataIndex: 'account', key: 'account', width: 120 },
        { title: 'Party', dataIndex: 'party', key: 'party', width: 130 },
        { title: 'Other Party', dataIndex: 'otherParty', key: 'otherParty', width: 130 },
        { title: 'Cheque', dataIndex: 'cheque', key: 'cheque', width: 100 },
        { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
        { title: 'Credit', dataIndex: 'credit', key: 'credit', width: 100, align: 'right', className: 'text-success' },
        { title: 'Debit', dataIndex: 'debit', key: 'debit', width: 100, align: 'right', className: 'text-danger' },
        {
            title: 'Balance', dataIndex: 'balance', key: 'balance', width: 110, align: 'right',
            render: (v) => <Text strong>{v}</Text>
        },
    ];

    const handleSearch = () => {
        fetchTxn({
            book: selectedBook || undefined,
            party: party || undefined,
            otherParty: otherParty || undefined,
            fromDate: fromDate ? dayjs(fromDate).format('DD-MM-YYYY') : undefined,
            toDate: toDate ? dayjs(toDate).format('DD-MM-YYYY') : undefined,
        }, {
            onSuccess: (res) => setDataSource((res?.data || []).map((r, i) => ({ ...r, key: i }))),
        });
    };

    const handleClearFilters = () => {
        setSelectedBook('');
        setParty('');
        setOtherParty('');
        setFromDate(null);
        setToDate(null);
    };

    const activeFilterCount = [
        selectedBook,
        party,
        otherParty,
        fromDate,
        toDate,
    ].filter(Boolean).length;

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [dataSource.length, isLoading]);

    return (
        <div className={styles.pageContainer}>
            <AdvancedFilterPanel
                title="Filter Transactions"
                subtitle="Select book, party, and date range to load account transactions."
                activeCount={activeFilterCount}
                onClear={handleClearFilters}
                clearDisabled={!activeFilterCount}
                onSearch={handleSearch}
                searchLoading={isLoading}
                extraActions={(
                    <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={isLoading}>
                        Reload
                    </Button>
                )}
            >
                <FilterField label="Book" icon={<BookOutlined />}>
                    <Select
                        allowClear
                        placeholder="Select book"
                        className={filterPanelStyles.filterControl}
                        value={selectedBook || undefined}
                        onChange={(v) => setSelectedBook(v || '')}
                    >
                        {bookOptions.map((b) => (
                            <Option key={b.value} value={b.value}>{b.label}</Option>
                        ))}
                    </Select>
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

            <div ref={tableRef} className={`${styles.tableWrap} erp-table-container`}>
            <Table
                dataSource={dataSource}
                columns={columns}
                loading={isLoading}
                pagination={{ pageSize: 50 }}
                bordered
                size="small"
                scroll={{ x: 'max-content', y: tableHeight }}
                className={styles.customTable}
            />
            </div>
        </div>
    );
};

export default Transaction;
