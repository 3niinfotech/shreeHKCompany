import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Table, Button, Card, Form, Tag, message } from 'antd';
import { FileUp, Search, Sparkles } from 'lucide-react';
import AIResultPanel from '../../components/ai/AIResultPanel';
import useAiSalesReport from '../../components/ai/useAiSalesReport';
import useFiltersFormFields from '../../hooks/useFiltersFormFields';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import debounce from 'lodash/debounce';
import OutstandingCalculationModal from './OutstandingcalculationModal';
import { cssVar } from '../../theme';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import PageHeroHeader from '../../components/common/PageHeroHeader';
import { BarChartOutlined } from '@ant-design/icons';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import styles from '../../assets/scss/pages/report/outStanding.module.scss';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';

const OutStandingReport = () => {
    const [tableData, setTableData] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);

    const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: fetchData, isPending: isSubmitting } = usePostApiRequest(ENDPOINTS.report.outstanding, 'outstanding', { showToast: false });
    const {
        loading: aiReportLoading,
        result: aiReportResult,
        error: aiReportError,
        panelOpen: aiPanelOpen,
        setPanelOpen: setAiPanelOpen,
        runSalesReport,
    } = useAiSalesReport();

    const companyOptions = useMemo(() => {
        const actualData = companyData?.Data || (Array.isArray(companyData) ? companyData : []);
        return [{ value: '', label: 'All Companies' }, ...actualData.map(item => ({
            value: String(item.id),
            label: item.name ? item.name.trim() : `Unknown (${item.id})`
        }))];
    }, [companyData]);

    const { renderFilters, form } = useFiltersFormFields(
        ['invoice', 'type', 'party', 'date'],
        {
            typeOptions: [{ value: 'sale', label: 'Sale Type' }, { value: 'purchase', label: 'Purchase Type' }],
            partyOptions: companyOptions,
            isPartyLoading: isCompanyLoading,
        }
    );

    const handleSearch = (currentValues, resetPage = false) => {
        const targetPage = resetPage ? 1 : page;
        if (resetPage) setPage(1);

        const payload = {
            from: currentValues.dateRange?.[0]?.format('YYYY-MM-DD') || "",
            to: currentValues.dateRange?.[1]?.format('YYYY-MM-DD') || "",
            invoiceno: currentValues.invoiceNo || "",
            party: currentValues.party || "",
            type: currentValues.type || "sale",
            page: targetPage
        };

        fetchData(payload, {
            onSuccess: (res) => {
                const rawData = res?.data || [];

                if (Array.isArray(rawData)) {
                    setTableData(rawData);
                } else {
                    setTableData([]);
                }
            }
        });
    };

    const debouncedSearchRef = useRef(null);
    if (!debouncedSearchRef.current) {
        debouncedSearchRef.current = debounce((values) => handleSearch(values, true), 600);
    }
    const debouncedSearch = debouncedSearchRef.current;
    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

    const onFilterChange = (changed, all) => {
        if (changed.hasOwnProperty('invoiceNo')) {
            const invoiceVal = all.invoiceNo || '';
            if (invoiceVal.length > 2 || invoiceVal.length === 0) debouncedSearch(all);
        } else {
            handleSearch(all, true);
        }
    };

    const columns = [
        {
            title: 'No',
            key: 'no',
            width: 60,
            align: 'center',
            render: (_, __, idx) => ((page - 1) * 10) + idx + 1
        },
        // { title: 'Entry No', dataIndex: 'entryno', key: 'entryno' },
        {
            title: 'Entry No',
            dataIndex: 'entryno',
            key: 'entryno',
            render: (text, record) => (
                <span
                    style={{ color: cssVar('color-text-link'), cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => openModal(record)}
                >
                    {text}
                </span>
            )
        },
        { title: 'Company', dataIndex: 'name', key: 'name', width: 250 },
        { title: 'Invoice', dataIndex: 'invoiceno', key: 'invoiceno' },
        { title: 'Date', dataIndex: 'invoicedate', key: 'invoicedate', align: 'center' },
        {
            title: 'Paid Amount',
            dataIndex: 'paid_amount',
            key: 'paid_amount',
            align: 'right',
            render: (val) => <span style={{ color: cssVar('color-success') }}>{Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        },
        {
            title: 'Term',
            dataIndex: 'terms',
            key: 'terms',
            align: 'center',
            render: (val) => <Tag color="blue">{val || 0} Days</Tag>
        },
        { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', align: 'center' },
        { title: 'Reference', dataIndex: 'reference', key: 'reference' },
        {
            title: 'Due Amount',
            dataIndex: 'due_amount',
            key: 'due_amount',
            align: 'right',
            render: (val) => <span style={{ color: cssVar('color-error') }}>{Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        },
        {
            title: 'Final Amount',
            dataIndex: 'final_amount',
            key: 'final_amount',
            align: 'right',
            render: (val) => <b>{Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
        },
    ];

    const openModal = (record) => {
        setSelectedRow(record);
        setOpen(true);
    };

    const closeModal = () => {
        setOpen(false);
        setSelectedRow(null);
    };

    const exportHeaders = [
        { title: 'No', key: 'no', width: 8 },
        { title: 'Entry No', key: 'entryno', width: 12 },
        { title: 'Company', key: 'name', width: 20 },
        { title: 'Invoice', key: 'invoiceno', width: 14 },
        { title: 'Date', key: 'invoicedate', width: 12 },
        { title: 'Paid Amount', key: 'paid_amount', width: 14 },
        { title: 'Term', key: 'terms', width: 10 },
        { title: 'Due Date', key: 'due_date', width: 12 },
        { title: 'Reference', key: 'reference', width: 14 },
        { title: 'Due Amount', key: 'due_amount', width: 14 },
        { title: 'Final Amount', key: 'final_amount', width: 14 },
    ];

    const handleExport = async () => {
        if (!tableData.length) {
            message.warning('Run search first — no data to export.');
            return;
        }
        setExporting(true);
        try {
            const rows = tableData.map((row, idx) => ({ ...row, no: ((page - 1) * 10) + idx + 1 }));
            await exportReportToExcel({
                headers: exportHeaders,
                rows,
                fileName: 'outstanding_report',
                sheetName: 'Outstanding',
            });
            message.success('Exported to Excel');
        } catch (err) {
            message.error(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [tableData.length, isSubmitting, page]);

    return (
        <div className={styles.pageContainer}>
            <PageHeroHeader
                breadcrumb="REPORTS"
                title="Outstanding Report"
                icon={<BarChartOutlined />}
                actions={(
                    <>
                        <Button
                            icon={<Sparkles size={16} />}
                            onClick={() => runSalesReport(tableData)}
                            loading={aiReportLoading}
                        >
                            Generate AI Report
                        </Button>
                        <Button type="primary" icon={<FileUp />} className={styles.exportBtn} loading={exporting} onClick={handleExport} disabled={!tableData.length}>Export to Excel</Button>
                    </>
                )}
            />

            <AdvancedFilterPanel
                title="Filter Outstanding Report"
                subtitle="Filter by type, party, invoice, and date range."
                showClear={false}
                onSearch={() => handleSearch(form.getFieldsValue(), true)}
                searchLoading={isSubmitting}
                extraActions={(
                    <Button
                        type="default"
                        icon={<Search />}
                        className={filterPanelStyles.btnClear}
                        onClick={() => handleSearch(form.getFieldsValue(), true)}
                        loading={isSubmitting}
                    >
                        Reload
                    </Button>
                )}
            >
                <div className={filterPanelStyles.filterInlineRow}>
                    <Form form={form} onValuesChange={onFilterChange}>
                        {renderFilters()}
                    </Form>
                </div>
            </AdvancedFilterPanel>

            <AIResultPanel
                title="AI Sales Report"
                loading={aiReportLoading}
                result={aiReportResult}
                error={aiReportError}
                open={aiPanelOpen}
                onOpenChange={setAiPanelOpen}
            />

            <Card styles={{ body: { padding: 0 } }} className={styles.tableCard}>
                <div ref={tableRef} className="erp-table-container">
                <Table
                    columns={columns}
                    dataSource={tableData}
                    pagination={{
                        current: page,
                        pageSize: 10,
                        onChange: (p) => {
                            setPage(p);
                            const values = form.getFieldsValue();
                            const payload = { ...values, page: p };
                            handleSearch(values, false);
                        },
                        showTotal: (total) => `Total ${total} items`
                    }}
                    bordered
                    size="small"
                    loading={isSubmitting}
                    rowKey="id"
                    scroll={{ x: "max-content", y: tableHeight }}
                />
                </div>

                <OutstandingCalculationModal
                    open={open}
                    data={selectedRow}
                    onClose={closeModal}
                />
            </Card>
        </div>
    );
};

export default OutStandingReport;