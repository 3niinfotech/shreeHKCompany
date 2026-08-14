import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
    Table, Button, Card, Typography, Checkbox, Form, Select, Input, DatePicker,
} from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import { SearchOutlined, BarChartOutlined, ReloadOutlined } from '@ant-design/icons';
import { FileUp, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import AIResultPanel from '../../components/ai/AIResultPanel';
import useAiSalesReport from '../../components/ai/useAiSalesReport';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import useFormHandleChange from '../../hooks/useFormHandleChange';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import PageHeroHeader from '../../components/common/PageHeroHeader';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import styles from '../../assets/scss/pages/report/TransactionReport.module.scss';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';

const { Text } = Typography;
const SALE_STATUS_OPTIONS = [
    { value: 'close', label: 'Close Sale' },
    { value: 'open', label: 'Open Sale' },
];

const TransactionReport = () => {
    const { form } = useFormHandleChange();
    const [tableData, setTableData] = useState([]);
    const [exporting, setExporting] = useState(false);

    const { data: companyData, isLoading: isCompanyLoading } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: fetchTransaction, isPending: tableLoading } = usePostApiRequest(ENDPOINTS.report.transaction, 'transactionReport', { showToast: false });

    const companyOptions = useMemo(() => {
        const actualData = Array.isArray(companyData)
            ? companyData?.Data
            : (companyData?.Data || []);

        if (actualData.length === 0) {
            return [{ value: 'all', label: 'All Companies' }];
        }

        const apiOptions = actualData.map(item => ({
            value: String(item.id),
            label: item.name ? item.name.trim() : `Unknown (${item.id})`
        }));

        return [{ value: 'all', label: 'All Companies' }, ...apiOptions];
    }, [companyData]);

    const {
        loading: aiReportLoading,
        result: aiReportResult,
        error: aiReportError,
        panelOpen: aiPanelOpen,
        setPanelOpen: setAiPanelOpen,
    } = useAiSalesReport();

    const handleSearch = () => {
        const v = form.getFieldsValue();
        const company = v.company && v.company !== 'all' ? v.company : '0';

        fetchTransaction({
            type: 'party',
            saleStatus: v.saleStatus || 'close',
            party: company,
            company,
            invoice: (v.invoiceNo || '').trim(),
            cfrom: v.fromDate ? dayjs(v.fromDate).format('YYYY-MM-DD') : '',
            cto: v.toDate ? dayjs(v.toDate).format('YYYY-MM-DD') : '',
            gia: v.gia || false,
            nonGia: v.nonGia || false,
            limit: 500,
        }, {
            onSuccess: (res) => {
                setTableData((res?.Data || []).map((row, i) => ({ ...row, key: row.key ?? i + 1 })));
            },
        });
    };

    useEffect(() => {
        handleSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const columns = [
        { title: 'No', dataIndex: 'no', key: 'no', width: 60, align: 'center' },
        { title: 'Invoice', dataIndex: 'invoice', key: 'invoice' },
        { title: 'Date', dataIndex: 'date', key: 'date', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        { title: 'Company', dataIndex: 'company', key: 'company' },
        { title: 'Pcs', dataIndex: 'pcs', key: 'pcs', align: 'center' },
        { title: 'Carat', dataIndex: 'carat', key: 'carat', align: 'right' },
        { title: 'Price', dataIndex: 'price', key: 'price', align: 'right' },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right' },
        { title: 'Term', dataIndex: 'term', key: 'term', align: 'center' },
        { title: 'Due Date', dataIndex: 'dueDate', key: 'dueDate', render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        { title: 'Reference', dataIndex: 'reference', key: 'reference' },
    ];

    const exportHeaders = columns.map((c) => ({ title: c.title, key: c.key, width: 14 }));

    const handleExport = async () => {
        if (!tableData.length) {
            toastWarning('Run search first — no data to export.');
            return;
        }
        setExporting(true);
        try {
            await exportReportToExcel({
                headers: exportHeaders,
                rows: tableData,
                fileName: 'transaction_report',
                sheetName: 'Transaction',
            });
            toastSuccess('Exported to Excel');
        } catch (err) {
            toastError(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [tableData.length, tableLoading]);

    return (
        <div className={styles.pageContainer}>
            {/* <PageHeroHeader
                breadcrumb="REPORTS"
                title="Transaction Report"
                icon={<BarChartOutlined />}
                actions={(
                    <>
                        <Button
                            icon={<Sparkles size={16} />}
                            onClick={() => runSalesReport(tableData)}
                            loading={aiReportLoading}
                            disabled={!tableData.length}
                        >
                            Generate AI Report
                        </Button>
                        <Button type="primary" icon={<FileUp />} className={styles.exportBtn} loading={exporting} onClick={handleExport} disabled={!tableData.length}>
                            Export to Excel
                        </Button>
                    </>
                )}
            /> */}

            <AdvancedFilterPanel
                // title="Filter Transaction Report"
                title="Transaction Report"
                // subtitle="Refine by sale status, company, location, invoice, and dates."
                showClear={false}
                onSearch={handleSearch}
                searchLoading={tableLoading}
                extraActions={
                    <>
                        {/* <Button
                            icon={<Sparkles size={16} />}
                            onClick={() => runSalesReport(tableData)}
                            loading={aiReportLoading}
                            disabled={!tableData.length}
                        >
                            Generate AI Report
                        </Button> */}
                        <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={tableLoading}>
                            Reload
                        </Button>
                        <Button type="primary" icon={<FileUp />} className={styles.exportBtn} loading={exporting} onClick={handleExport} disabled={!tableData.length} style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)", color: "#fff" }}>
                            Export to Excel
                        </Button>
                    </>
                }
            >
                <div className={`${filterPanelStyles.filterInlineRow} ${styles.transactionFilterForm}`}>
                    <Form
                        form={form}
                        initialValues={{ saleStatus: 'close', company: 'all', location: 'all', gia: false, nonGia: false }}
                    >
                        <div className={styles.filterFieldsFlex}>
                            <Form.Item name="saleStatus" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    placeholder="Sale Status"
                                    options={SALE_STATUS_OPTIONS}
                                    className={styles.fieldMd}
                                />
                            </Form.Item>

                            <Form.Item name="company" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder="All Companies"
                                    options={companyOptions}
                                    loading={isCompanyLoading}
                                    optionFilterProp="label"
                                    virtual
                                    className={styles.fieldLg}
                                />
                            </Form.Item>

                            <Form.Item name="location" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder="Location"
                                    options={companyOptions}
                                    loading={isCompanyLoading}
                                    optionFilterProp="label"
                                    className={styles.fieldLg}
                                />
                            </Form.Item>

                            <div className={styles.giaChecks}>
                                <Form.Item name="gia" valuePropName="checked" noStyle>
                                    <Checkbox>GIA</Checkbox>
                                </Form.Item>
                                <Form.Item name="nonGia" valuePropName="checked" noStyle>
                                    <Checkbox>N-GIA</Checkbox>
                                </Form.Item>
                            </div>

                            <Form.Item name="invoiceNo" className={styles.filterItem}>
                                <Input
                                    allowClear
                                    placeholder="Invoice No..."
                                    prefix={<SearchOutlined />}
                                    className={styles.fieldLg}
                                    onPressEnter={handleSearch}
                                />
                            </Form.Item>

                            <Form.Item name="fromDate" className={styles.filterItem}>
                                <DatePicker placeholder="From Date" className={styles.fieldDate} />
                            </Form.Item>

                            <Form.Item name="toDate" className={styles.filterItem}>
                                <DatePicker placeholder="To Date" className={styles.fieldDate} />
                            </Form.Item>
                        </div>
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

            <Card className={styles.tableCard}>
                <div ref={tableRef} className="erp-table-container">
                    <SkeletonAwareTable
                        columns={columns}
                        dataSource={tableData}
                        loading={tableLoading}
                        pagination={{ pageSize: 50 }}
                        bordered
                        size="small"
                        className={styles.customTable}
                        scroll={{ x: "max-content", y: tableHeight }}
                        summary={(pageData) => {
                            let totalPcs = 0;
                            let totalAmount = 0;
                            pageData.forEach(({ pcs, amount }) => {
                                totalPcs += Number(pcs) || 0;
                                totalAmount += Number(amount) || 0;
                            });
                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row className={styles.summaryRow}>
                                        <Table.Summary.Cell index={0} colSpan={4}>
                                            <Text strong>Total</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="center">
                                            <Text strong>{totalPcs}</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} colSpan={3} />
                                        <Table.Summary.Cell index={3} align="right">
                                            <Text strong>{totalAmount.toFixed(2)}</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={4} colSpan={2} />
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                    />
                </div>
            </Card>
        </div>
    );
};

export default TransactionReport;
