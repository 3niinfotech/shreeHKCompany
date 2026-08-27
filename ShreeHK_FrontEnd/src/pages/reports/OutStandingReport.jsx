import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Button, Card, Form, Tag } from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import dayjs from 'dayjs';
import { cssVar } from '../../theme';
import debounce from 'lodash/debounce';
import { useLocation } from 'react-router-dom';
import { BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { ENDPOINTS } from '../../constants/endpoints';
import { FileUp, Search, Sparkles } from 'lucide-react';
import AIResultPanel from '../../components/ai/AIResultPanel';
import useAiSalesReport from '../../components/ai/useAiSalesReport';
import useFiltersFormFields from '../../hooks/useFiltersFormFields';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import OutstandingCalculationModal from './OutstandingcalculationModal';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import PageHeroHeader from '../../components/common/PageHeroHeader';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import styles from '../../assets/scss/pages/report/outStanding.module.scss';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';

const OutStandingReport = () => {
    const [tableData, setTableData] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [page, setPage] = useState(1);
    const [exporting, setExporting] = useState(false);
    const location = useLocation();
    const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: fetchData, isPending: isSubmitting } = usePostApiRequest(ENDPOINTS.report.outstanding, 'outstanding', { showToast: false });
    const {
        loading: aiReportLoading,
        result: aiReportResult,
        error: aiReportError,
        panelOpen: aiPanelOpen,
        setPanelOpen: setAiPanelOpen,
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
        if ('invoiceNo' in changed) {
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
        { title: 'Date', dataIndex: 'invoicedate', key: 'invoicedate', align: 'center', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
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
        { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', align: 'center', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
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
        { title: 'Entry No', key: 'entryno', width: 16, align: 'center' },
        { title: 'Company', key: 'name', width: 42, align: 'center', accessor: (row) => String(row.name || '').toUpperCase() },
        { title: 'Invoice', key: 'invoiceno', width: 12, align: 'center' },
        { title: 'Date', key: 'invoicedate', width: 14, align: 'center' },
        { title: 'Term', key: 'terms', width: 10, align: 'center' },
        { title: 'Due Date', key: 'due_date', width: 14, align: 'center' },
        { title: 'Pcs', key: 'pcs', width: 8, align: 'center', type: 'n', total: true, decimals: 0, accessor: (row) => Number(row.pcs) || 0 },
        { title: 'Carat', key: 'carat', width: 10, align: 'center', type: 'n', total: true, decimals: 3, accessor: (row) => Number(row.carat) || 0 },
        { title: 'Price', key: 'price', width: 10, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => {
            const carat = Number(row.carat) || 0;
            const amount = Number(row.final_amount) || 0;
            return carat > 0 ? Number((amount / carat).toFixed(2)) : 0;
        } },
        { title: 'Amount', key: 'final_amount', width: 14, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.final_amount) || 0 },
        { title: 'Reference', key: 'reference', width: 32, align: 'center' },
        { title: 'Paid Amt.', key: 'paid_amount', width: 12, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.paid_amount) || 0 },
        { title: 'Due Amt.', key: 'due_amount', width: 14, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.due_amount) || 0 },
    ];

    const handleExport = async () => {
        if (!tableData.length) {
            toastWarning('Run search first — no data to export.');
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
                title: 'Outstanding Report',
                totals: true,
            });
            toastSuccess('Exported to Excel');
        } catch (err) {
            toastError(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        const incomingRange = location.state?.dateRange;
        if (incomingRange && incomingRange.length === 2) {
            const rangeValue = [dayjs(incomingRange[0]), dayjs(incomingRange[1])];
            form.setFieldsValue({ dateRange: rangeValue });
            handleSearch({ ...form.getFieldsValue(), dateRange: rangeValue }, true);
            // state clear kar do taaki refresh/back par dobara na lage
            window.history.replaceState({}, document.title);
            return;
        }
        handleSearch(form.getFieldsValue(), true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [tableData.length, isSubmitting, page]);

    return (
        <div className={styles.pageContainer}>
            <AdvancedFilterPanel
                title="Outstanding Report"
                // subtitle="Filter by type, party, invoice, and date range."
                showClear={false}
                onSearch={() => handleSearch(form.getFieldsValue(), true)}
                searchLoading={isSubmitting}
                extraActions={(
                    <>
                        <Button
                            type="default"
                            icon={<ReloadOutlined />}
                            className={filterPanelStyles.btnClear}
                            onClick={() => handleSearch(form.getFieldsValue(), true)}
                            loading={isSubmitting}
                        >
                            Reload
                        </Button>
                        <Button
                            type="primary"
                            icon={<FileUp size={16} />}
                            className={styles.exportBtn}
                            loading={exporting}
                            onClick={handleExport}
                            disabled={!tableData.length}
                        >
                            Export to Excel
                        </Button>
                    </>
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
                    <SkeletonAwareTable
                        columns={columns}
                        dataSource={tableData}
                        pagination={{
                            current: page,
                            pageSize: 10,
                            onChange: (p) => {
                                setPage(p);
                                const values = form.getFieldsValue();
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
                    onSaved={() => {
                        closeModal();
                        handleSearch(form.getFieldsValue(), false);
                    }}
                />
            </Card>
        </div>
    );
};

export default OutStandingReport;
