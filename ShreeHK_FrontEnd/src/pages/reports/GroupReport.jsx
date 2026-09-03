import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Button, Card, Form, Select, DatePicker } from 'antd';
import { toastSuccess, toastError, toastWarning } from '../../utils/toastNotify';
import dayjs from 'dayjs';
import useFormHandleChange from '../../hooks/useFormHandleChange';
import { useFetchApi, usePostApiRequest } from '../../api/ApiFunction';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import { ReloadOutlined } from '@ant-design/icons';
import ExportExcelButton from '../../components/common/ExportExcelButton';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';
import styles from '../../assets/scss/pages/report/groupReport.module.scss';
import useTableBodyScrollHeight from '../../hooks/useTableBodyScrollHeight';
import { SkuLink } from '../../hooks/useSkuModalAction';

const REPORT_TYPES = [
    { value: 'memo', label: 'Memo' },
    { value: 'lab', label: 'Lab' },
    { value: 'sale', label: 'Sale' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'close_memo', label: 'Close Memo' },
    { value: 'close_sale', label: 'Close Sale' },
];

const GroupReport = () => {
    const { form } = useFormHandleChange();
    const [tableData, setTableData] = useState([]);
    const [exporting, setExporting] = useState(false);

    const { data: filterOpts } = useFetchApi('reportFilterOpts', ENDPOINTS.report.filterOptions);
    const { data: companyData } = useFetchApi('GetCompany', ENDPOINTS.company.options);
    const { mutate: fetchGroup, isPending: tableLoading } = usePostApiRequest(ENDPOINTS.report.group, 'groupReport', { showToast: false });

    const companyOptions = useMemo(() => {
        const list = companyData?.Data || [];
        return [{ value: '0', label: 'All Company' }, ...list.map((c) => ({ value: String(c.id), label: c.name }))];
    }, [companyData]);

    const mainGroupOptions = useMemo(() => {
        const list = filterOpts?.Data?.mainGroups || [];
        return [{ value: '', label: 'All Main Group' }, ...list];
    }, [filterOpts]);

    const subGroupOptions = useMemo(() => {
        const list = filterOpts?.Data?.subGroups || [];
        return [{ value: '', label: 'All Sub Group' }, ...list];
    }, [filterOpts]);

    const handleSearch = () => {
        const v = form.getFieldsValue();
        const payload = {
            report: v.reportType || 'memo',
            main_group: v.mainGroup || '',
            sub_group: v.subGroup || '',
            party: v.company || '0',
            cfrom: v.fromDate ? dayjs(v.fromDate).format('YYYY-MM-DD') : '',
            cto: v.toDate ? dayjs(v.toDate).format('YYYY-MM-DD') : '',
        };
        fetchGroup(payload, {
            onSuccess: (res) => setTableData((res?.Data || []).map((r, i) => ({ ...r, key: i }))),
        });
    };

    useEffect(() => {
        handleSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const columns = [
        { title: 'No', dataIndex: 'no', key: 'no', width: 60, align: 'center', fixed: 'left' },
        { title: 'Company', dataIndex: 'company', key: 'company', width: 240, fixed: 'left' },
        { title: 'Date', dataIndex: 'date', key: 'date', width: 100, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
        { title: 'Invoice', dataIndex: 'invoice', key: 'invoice', width: 120 },
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 100, render: (text, record) => <SkuLink sku={text} record={record} /> },
        { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 120 },
        { title: 'Report No', dataIndex: 'reportNo', key: 'reportNo', width: 120 },
        { title: 'P.pcs', dataIndex: 'pcs', key: 'pcs', align: 'center', width: 80 },
        { title: 'P.Carat', dataIndex: 'carat', key: 'carat', align: 'right', width: 100 },
        { title: 'Price', dataIndex: 'price', key: 'price', align: 'right', width: 100 },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', align: 'right', width: 120 },
        { title: 'Shape', dataIndex: 'shape', key: 'shape', width: 100 },
        { title: 'Color', dataIndex: 'color', key: 'color', width: 80 },
        { title: 'Clarity', dataIndex: 'clarity', key: 'clarity', width: 100 },
        { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 120 },
        { title: 'Main Group', dataIndex: 'mainGroup', key: 'mainGroup', width: 130 },
        { title: 'Sub Group', dataIndex: 'subGroup', key: 'subGroup', width: 130 },
    ];

    const handleClear = () => {
        form.resetFields();
        setTableData([]);
    };

    const getActiveCount = () => {
        const v = form.getFieldsValue();
        return [v.reportType, v.mainGroup, v.subGroup, v.company, v.fromDate, v.toDate].filter(Boolean).length;
    };

    const tableRef = useRef(null);
    const tableHeight = useTableBodyScrollHeight(tableRef, [tableData.length, tableLoading]);

    const toUsDate = (value) => {
        if (!value) return '';
        const s = String(value).trim();
        const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
        if (m) {
            const dd = m[1].padStart(2, '0');
            const mm = m[2].padStart(2, '0');
            const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
            return `${mm}-${dd}-${yyyy}`;
        }
        const d = dayjs(s);
        return d.isValid() ? d.format('MM-DD-YYYY') : s;
    };

    const exportHeaders = [
        { title: 'US Date', key: 'usDate', width: 12, accessor: (row) => toUsDate(row.date) },
        { title: 'Date', key: 'date', width: 12 },
        { title: 'Invoice', key: 'invoice', width: 12 },
        { title: 'Sku', key: 'sku', width: 16 },
        { title: 'Lab', key: 'lab', width: 8 },
        { title: 'Report No', key: 'reportNo', width: 16, accessor: (row) => (row.reportNo != null && row.reportNo !== '' ? String(row.reportNo) : '') },
        { title: 'P.Pcs', key: 'pcs', width: 8, type: 'n', total: true, decimals: 0 },
        { title: 'P.Carat', key: 'carat', width: 10, type: 'n', total: true, decimals: 3 },
        { title: 'Price', key: 'price', width: 12, type: 'n', total: true, decimals: 2 },
        { title: 'Amount', key: 'amount', width: 14, type: 'n', total: true, decimals: 2 },
        { title: 'Shape', key: 'shape', width: 12 },
        { title: 'Color', key: 'color', width: 10 },
        { title: 'Clarity', key: 'clarity', width: 10 },
        { title: 'Company', key: 'company', width: 36 },
        { title: 'Remark', key: 'remark', width: 16 },
        { title: 'Main Group', key: 'mainGroup', width: 14 },
        { title: 'Sub_group', key: 'subGroup', width: 16 },
    ];

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
                fileName: 'group_report',
                sheetName: 'Group',
                title: 'Group Report',
                totals: true,
            });
            toastSuccess('Exported to Excel');
        } catch (err) {
            toastError(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            {/* <PageHeroHeader
                breadcrumb="REPORTS"
                title="Group Report"
                icon={<BarChartOutlined />}
                actions={(
                    <Button type="primary" icon={<FileUp size={16} />} loading={exporting} onClick={handleExport} disabled={!tableData.length}>
                        Export to Excel
                    </Button>
                )}
            /> */}

            <AdvancedFilterPanel
                title="Group Report"
                // subtitle="Choose report type, groups, company, and date range."
                activeCount={getActiveCount()}
                onClear={handleClear}
                clearDisabled={!getActiveCount()}
                onSearch={handleSearch}
                searchLoading={tableLoading}
                extraActions={
                    <>
                        <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={tableLoading}>
                            Reload
                        </Button>
                        <ExportExcelButton
                            loading={exporting}
                            onClick={handleExport}
                            disabled={!tableData.length}
                        />
                    </>
                }
            >
                <div className={`${filterPanelStyles.filterInlineRow} ${styles.saleStockFilterForm}`}>
                    <Form form={form} initialValues={{ reportType: 'memo', company: '0' }}>
                        <div className={styles.filterFieldsFlex}>
                            <Form.Item name="reportType" className={styles.filterItem}>
                                <Select
                                    placeholder="Report Type"
                                    options={REPORT_TYPES}
                                    className={styles.fieldDate}
                                />
                            </Form.Item>
                            <Form.Item name="mainGroup" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder="All Main Group"
                                    options={mainGroupOptions}
                                    optionFilterProp="label"
                                    className={styles.fieldDate}
                                />
                            </Form.Item>
                            <Form.Item name="subGroup" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder="All Sub Group"
                                    options={subGroupOptions}
                                    optionFilterProp="label"
                                    className={styles.fieldDate}
                                />
                            </Form.Item>
                            <Form.Item name="company" className={styles.filterItem}>
                                <Select
                                    allowClear
                                    showSearch
                                    placeholder="All Company"
                                    options={companyOptions}
                                    optionFilterProp="label"
                                    className={styles.fieldDate}
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

            <Card className={styles.tableCard}>
                <div ref={tableRef} className="erp-table-container">
                    <SkeletonAwareTable
                        columns={columns}
                        dataSource={tableData}
                        loading={tableLoading}
                        pagination={{ pageSize: 50 }}
                        bordered
                        size="small"
                        scroll={{ x: "max-content", y: tableHeight }}
                        className={styles.customTable}
                    />
                </div>
            </Card>
        </div>
    );
};

export default GroupReport;
