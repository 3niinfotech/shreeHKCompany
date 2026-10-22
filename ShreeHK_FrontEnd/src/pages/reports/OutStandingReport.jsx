import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button, Card, Form, Tag } from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import dayjs from 'dayjs';
import { cssVar } from '../../theme';
import { useLocation } from 'react-router-dom';
import { ReloadOutlined } from '@ant-design/icons';
import { ENDPOINTS } from '../../api/endpoints';
import AIResultPanel from '../../components/ai/AIResultPanel';
import useAiSalesReport from '../../components/ai/useAiSalesReport';
import useFiltersFormFields from '../../components/common/filters/FilterFormFields';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import OutstandingCalculationModal from './OutstandingcalculationModal';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import ExportExcelButton from '../../components/common/ExportExcelButton';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import styles from '../../assets/scss/pages/report/outStanding.module.scss';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';

const OutStandingReport = () => {
    const [tableData, setTableData] = useState([]);
    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
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

    const selectedType = Form.useWatch('type', form) || 'sale';
    const isPurchase = selectedType === 'purchase';

    const handleSearch = (currentValues) => {
        const payload = {
            from: currentValues.dateRange?.[0]?.format('YYYY-MM-DD') || "",
            to: currentValues.dateRange?.[1]?.format('YYYY-MM-DD') || "",
            invoiceno: currentValues.invoiceNo || "",
            party: currentValues.party || "",
            type: currentValues.type || "sale",
        };

        fetchData(payload, {
            onSuccess: (res) => {
                const rawData = res?.Data || res?.data || [];

                if (Array.isArray(rawData)) {
                    setTableData(rawData);
                } else {
                    setTableData([]);
                }
            }
        });
    };

    const columns = [
        {
            title: 'No',
            key: 'no',
            width: 50,
            align: 'center',
            render: (_, __, idx) => idx + 1
        },
        {
            title: 'Entry No',
            dataIndex: 'entryno',
            key: 'entryno',
            align: 'center',
            render: (text, record) => (
                <span
                    style={{ color: cssVar('color-text-link'), cursor: 'pointer', fontWeight: 500 }}
                    onClick={() => openModal(record)}
                >
                    {text}
                </span>
            )
        },
        { title: 'Company', dataIndex: 'name', key: 'name', width: 220, align: 'center' },
        { title: 'Invoice', dataIndex: 'invoiceno', key: 'invoiceno', align: 'center' },
        { title: 'Date', dataIndex: 'invoicedate', key: 'invoicedate', align: 'center', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        {
            title: 'Term',
            dataIndex: 'terms',
            key: 'terms',
            align: 'center',
            render: (val) => <Tag color="blue">{val || 0} Days</Tag>
        },
        { title: 'Due Date', dataIndex: 'due_date', key: 'due_date', align: 'center', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        {
            title: 'Pcs',
            dataIndex: 'pcs',
            key: 'pcs',
            align: 'right',
            render: (val) => Number(val || 0).toLocaleString()
        },
        {
            title: 'Carat',
            dataIndex: 'carat',
            key: 'carat',
            align: 'right',
            render: (val) => Number(val || 0).toFixed(3)
        },
        { title: 'Reference', dataIndex: 'reference', key: 'reference', align: 'center' },
        {
            title: 'Amount',
            dataIndex: 'final_amount',
            key: 'amount',
            align: 'right',
            render: (val, record) => (
                <b style={{ color: cssVar('color-primary-dark') }}>
                    {Number(val ?? record?.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </b>
            ),
        },
        {
            title: isPurchase ? 'Paid Amount' : 'Received Amount',
            dataIndex: 'paid_amount',
            key: isPurchase ? 'paid_amount' : 'received_amount',
            align: 'right',
            render: (val, record) => (
                <span style={{ color: cssVar('color-success') }}>
                    {Number(val ?? record?.received_amount ?? record?.paid_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
            )
        },
        {
            title: 'Due Amount',
            dataIndex: 'due_amount',
            key: 'due_amount',
            align: 'right',
            render: (val) => <span style={{ color: cssVar('color-error') }}>{Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
        {
            title: 'Price', key: 'price', width: 10, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => {
                const carat = Number(row.carat) || 0;
                const amount = Number(row.final_amount) || 0;
                return carat > 0 ? Number((amount / carat).toFixed(2)) : 0;
            }
        },
        { title: 'Amount', key: 'final_amount', width: 14, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.final_amount) || 0 },
        { title: 'Reference', key: 'reference', width: 32, align: 'center' },
        { title: isPurchase ? 'Paid Amt.' : 'Received Amt.', key: 'paid_amount', width: 14, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.paid_amount ?? row.received_amount) || 0 },
        { title: 'Due Amt.', key: 'due_amount', width: 14, align: 'center', type: 'n', total: true, decimals: 2, accessor: (row) => Number(row.due_amount) || 0 },
    ];

    const handleExport = async () => {
        if (!tableData.length) {
            toastWarning('Run search first — no data to export.');
            return;
        }
        setExporting(true);
        try {
            const rows = tableData.map((row, idx) => ({ ...row, no: idx + 1 }));
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

    // Prefill filters from navigation state only — do not auto-fetch.
    useEffect(() => {
        const incomingRange = location.state?.dateRange;
        if (incomingRange && incomingRange.length === 2) {
            form.setFieldsValue({
                dateRange: [dayjs(incomingRange[0]), dayjs(incomingRange[1])],
            });
            window.history.replaceState({}, document.title);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [tableData.length, isSubmitting]);

    return (
        <div className={styles.pageContainer}>
            <AdvancedFilterPanel
                title="Outstanding Report"
                // subtitle="Filter by type, party, invoice, and date range."
                showClear={false}
                onSearch={() => handleSearch(form.getFieldsValue())}
                searchLoading={isSubmitting}
                extraActions={(
                    <>
                        <Button
                            type="default"
                            icon={<ReloadOutlined />}
                            className={filterPanelStyles.btnClear}
                            onClick={() => handleSearch(form.getFieldsValue())}
                            loading={isSubmitting}
                        >
                            Reload
                        </Button>
                        <ExportExcelButton
                            loading={exporting}
                            onClick={handleExport}
                            disabled={!tableData.length}
                        />
                    </>
                )}
            >
                <div className={filterPanelStyles.filterInlineRow}>
                    <Form form={form}>
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
                        pagination={false}
                        bordered
                        size="small"
                        loading={isSubmitting}
                        rowKey="id"
                        scroll={{ x: "max-content", y: tableHeight }}
                        className={styles.customTable}
                    />
                </div>

                <OutstandingCalculationModal
                    open={open}
                    data={selectedRow}
                    onClose={closeModal}
                    onSaved={() => {
                        closeModal();
                        handleSearch(form.getFieldsValue());
                    }}
                />
            </Card>
        </div>
    );
};

export default OutStandingReport;
