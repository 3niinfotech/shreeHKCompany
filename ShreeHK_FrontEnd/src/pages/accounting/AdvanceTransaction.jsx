import React, { useMemo, useState, useRef } from 'react';
import { Select, DatePicker, Table, Typography, Button } from 'antd';
import { TeamOutlined, CalendarOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { FilterField, filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import { cssVar } from '../../theme';
import styles from '../../assets/scss/pages/accountings/advanceTransaction.module.scss';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';

const { Option } = Select;
const { Text } = Typography;

const AdvanceTransaction = () => {
    const [party, setParty] = useState('');
    const [book, setBook] = useState('');
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [dataSource, setDataSource] = useState([]);

    const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: fetchReport, isLoading } = usePostApiRequest(ENDPOINTS.accountingTxn.advanceReport, 'advanceTxnReport', { showToast: false });

    const partyOptions = useMemo(() => {
        const list = companyData?.Data || [];
        return [{ value: '', label: 'All Party' }, ...list.map((c) => ({ value: c.name, label: c.name }))];
    }, [companyData]);

    const columns = [
        { title: 'No', dataIndex: 'no', key: 'no', width: 50, align: 'center' },
        { title: 'Date', dataIndex: 'date', key: 'date', width: 100, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        { title: 'Account', dataIndex: 'account', key: 'account', width: 120 },
        { title: 'Party', dataIndex: 'party', key: 'party', width: 150 },
        { title: 'Cheque', dataIndex: 'cheque', key: 'cheque', width: 90 },
        { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
        {
            title: 'Credit', dataIndex: 'credit', key: 'credit', width: 110, align: 'right',
            render: (val) => <Text strong style={{ color: cssVar('color-success') }}>{val}</Text>
        },
        {
            title: 'Debit', dataIndex: 'debit', key: 'debit', width: 110, align: 'right',
            render: (val) => <Text strong style={{ color: cssVar('color-error') }}>{val}</Text>
        },
        {
            title: 'Balance', dataIndex: 'balance', key: 'balance', width: 110, align: 'right',
            render: (val) => <Text strong>{val}</Text>
        },
    ];

    const handleSearch = () => {
        fetchReport({
            party: party || undefined,
            book: book || undefined,
            fromDate: fromDate ? dayjs(fromDate).format('DD-MM-YYYY') : undefined,
            toDate: toDate ? dayjs(toDate).format('DD-MM-YYYY') : undefined,
        }, {
            onSuccess: (res) => setDataSource((res?.data || []).map((r, i) => ({ ...r, key: i }))),
        });
    };

    const handleClearFilters = () => {
        setParty('');
        setBook('');
        setFromDate(null);
        setToDate(null);
    };

    const activeFilterCount = [party, book, fromDate, toDate].filter(Boolean).length;
    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [dataSource.length, isLoading]);

    return (
        <div className={styles.container}>
            <AdvancedFilterPanel
                title="Advance Transactions"
                // subtitle="Select party, book, and date range to load advance transaction records."
                subtitle=""
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
                <FilterField label="Party" icon={<TeamOutlined />}>
                    <Select
                        placeholder="Select party"
                        className={filterPanelStyles.filterControl}
                        value={party || undefined}
                        onChange={setParty}
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        virtual
                        style={{ borderRadius: "8px" }}
                    >
                        {partyOptions.map((p) => (
                            <Option key={p.value || 'all'} value={p.value}>{p.label}</Option>
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

            <div ref={tableRef} className={`${styles.transactionTableWrap} erp-table-container`}>
                <Table
                    dataSource={dataSource}
                    columns={columns}
                    loading={isLoading}
                    pagination={{ pageSize: 50 }}
                    bordered
                    size="small"
                    className={styles.transactionTable}
                    scroll={{ x: 'max-content', y: tableHeight }}
                />
            </div>
        </div>
    );
};

export default AdvanceTransaction;
