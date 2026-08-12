import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Table, Tag, Button, message, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { ChevronUp, ChevronDown, CircleDot, ScanText, FileUp } from 'lucide-react';
import useFormHandleChange from '../../hooks/useFormHandleChange';
import DynamicForm from '../../hooks/DynamicFormField';
import { api } from '../../api/axiosInstance';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import { exportReportToExcel } from '../../utils/reportExcelExport';
import styles from '../../assets/scss/pages/report/stoneHistory.module.scss';
import { toastApiError } from '../../utils/apiToast';
import SkeletonAwareTable from '../../components/common/skeleton/SkeletonAwareTable';

const { Text } = Typography;

const formatHistoryDateTime = (row) => {
    if (row?.date_display) return row.date_display;
    if (!row?.date) return '—';
    const parsed = new Date(row.date);
    if (Number.isNaN(parsed.getTime())) return String(row.date);
    return parsed.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).replace(',', '');
};

const mapDetailToForm = (d) => ({
    mfgCode: d.mfg_code || '',
    sku: d.sku || '',
    lab: d.lab || '',
    pcs: d.polish_pcs || '',
    carat: d.polish_carat || '',
    fullColor: d.main_color || '',
    cost: d.cost || '',
    price: d.price || '',
    amount: d.amount || '',
    loc: d.location || '',
    remark: d.remark || '',
    main: d.main_group || '',
    sub: d.sub_group || '',
    inHouseCla: d.in_house_clarity || '',
    argyleColor: d.argyle_color || '',
    mining: d.mining || '',
    origin: d.origin || '',
    certificate: d.report_no || '',
    shape: d.shape || '',
    clarity: d.clarity || '',
    size: d.size || '',
    fluorescence: d.f_intensity || '',
    cut: d.cut || '',
    polish: d.polish || '',
    symm: d.symmentry || '',
    table: d.table_pc || '',
    depth: d.depth_pc || '',
    msurmnt: d.mesurment || '',
    girdle: d.gridle || '',
    intensity: d.intensity || '',
    overtone: d.overtone || '',
    color: d.color || '',
    package: d.package || '',
    stoneType: d.group_type || '',
    category: d.category || '',
});

const StoneHistory = () => {
    const [searchParams] = useSearchParams();
    const [showForm, setShowForm] = useState(false);
    const [generalOpen, setGeneralOpen] = useState(true);
    const [advancedOpen, setAdvancedOpen] = useState(true);
    const [historyRows, setHistoryRows] = useState([]);
    const [status, setStatus] = useState('');
    const [lastUpdated, setLastUpdated] = useState('');
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [searchForm] = Form.useForm();
    const { form, resetAll } = useFormHandleChange();

    const topFields = [
        { name: 'mfgCode', label: 'Mfg.Code', span: 6, disabled: true },
        { name: 'sku', label: 'Sku', span: 6, disabled: true },
        { name: 'lab', label: 'Lab', span: 6, disabled: true },
        { name: 'pcs', label: 'Pcs', span: 6, disabled: true },
        { name: 'carat', label: 'Carat', span: 6, disabled: true },
        { name: 'fullColor', label: 'Full Color', span: 6, disabled: true },
        { name: 'cost', label: 'Cost', span: 6, disabled: true },
        { name: 'price', label: 'Price', span: 6, disabled: true },
        { name: 'amount', label: 'Amount', span: 6, disabled: true },
        { name: 'loc', label: 'LOC', span: 6, disabled: true },
        { name: 'remark', label: 'Remark', span: 6, disabled: true },
        { name: 'main', label: 'Main', span: 6, disabled: true },
        { name: 'sub', label: 'Sub', span: 6, disabled: true },
        { name: 'inHouseCla', label: 'In House Cla', span: 6, disabled: true },
        { name: 'argyleColor', label: 'Argyle Color', span: 6, disabled: true },
        { name: 'mining', label: 'Mining', span: 6, disabled: true },
        { name: 'origin', label: 'Origin', span: 6, disabled: true },
    ];

    const bottomFields = [
        { name: 'certificate', label: 'Certificate.', span: 6, disabled: true },
        { name: 'shape', label: 'Shape', span: 6, disabled: true },
        { name: 'clarity', label: 'Clarity', span: 6, disabled: true },
        { name: 'size', label: 'Size', span: 6, disabled: true },
        { name: 'fluorescence', label: 'Fluorescence', span: 6, disabled: true },
        { name: 'cut', label: 'Cut', span: 6, disabled: true },
        { name: 'polish', label: 'Polish', span: 6, disabled: true },
        { name: 'symm', label: 'Symm', span: 6, disabled: true },
        { name: 'table', label: 'Table', span: 6, disabled: true },
        { name: 'depth', label: 'Depth', span: 6, disabled: true },
        { name: 'msurmnt', label: 'Msurmnt', span: 6, disabled: true },
        { name: 'girdle', label: 'Girdle', span: 6, disabled: true },
        { name: 'intensity', label: 'Intensity', span: 6, disabled: true },
        { name: 'overtone', label: 'Overtone', span: 6, disabled: true },
        { name: 'color', label: 'Color', span: 6, disabled: true },
        { name: 'package', label: 'Package', span: 6, disabled: true },
        { name: 'stoneType', label: 'Stone Type', span: 6, disabled: true },
        { name: 'category', label: 'Category', span: 6, disabled: true },
    ];

    const historyColumns = [
        { title: 'Action', dataIndex: 'action_label', key: 'action', width: 120 },
        {
            title: 'Date & Time',
            dataIndex: 'date_display',
            key: 'date_display',
            width: 170,
            render: (_, row) => formatHistoryDateTime(row),
        },
        {
            title: 'Updated By',
            dataIndex: 'updated_by',
            key: 'updated_by',
            width: 120,
            render: (value) => value || '—',
        },
        { title: 'Party', dataIndex: 'party_name', key: 'party', width: 140 },
        { title: 'Invoice', dataIndex: 'invoice', key: 'invoice', width: 100 },
        { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
        { title: 'Pcs', dataIndex: 'pcs', key: 'pcs', width: 70, align: 'center' },
        { title: 'Carat', dataIndex: 'carat', key: 'carat', width: 80, align: 'right' },
        { title: 'Price', dataIndex: 'price', key: 'price', width: 90, align: 'right' },
        { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' },
    ];

    const handleSearch = async () => {
        const skuValue = (searchForm.getFieldValue('searchSku') || '').trim();
        if (!skuValue) return;
        setLoading(true);
        try {
            const res = await api.get(ENDPOINTS.report.stoneDetail, { params: { sku: skuValue } });
            const { detail, history, status: st } = res.data || {};
            if (!detail) {
                toastApiError({ response: { data: res.data } });
                return;
            }
            form.setFieldsValue(mapDetailToForm(detail));
            setHistoryRows((history || []).map((h, i) => ({ ...h, key: i })));
            setStatus(st || '');
            setLastUpdated(detail?.last_updated_display || '');
            setShowForm(true);
        } catch (err) {
            toastApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!historyRows.length) {
            message.warning('Search for a SKU first — no history to export.');
            return;
        }
        setExporting(true);
        try {
            await exportReportToExcel({
                headers: historyColumns.map((c) => ({
                    title: c.title,
                    key: c.dataIndex || c.key,
                    width: 14,
                })),
                rows: historyRows.map((row) => ({
                    ...row,
                    date_display: formatHistoryDateTime(row),
                })),
                fileName: 'stone_history',
                sheetName: 'History',
            });
            message.success('Exported to Excel');
        } catch (err) {
            message.error(err.message || 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        const skuFromUrl = (searchParams.get('sku') || '').trim();
        if (!skuFromUrl) return;
        searchForm.setFieldsValue({ searchSku: skuFromUrl });
        const run = async () => {
            setLoading(true);
            try {
                const res = await api.get(ENDPOINTS.report.stoneDetail, { params: { sku: skuFromUrl } });
                const { detail, history, status: st } = res.data || {};
                if (!detail) return;
                form.setFieldsValue(mapDetailToForm(detail));
                setHistoryRows((history || []).map((h, i) => ({ ...h, key: i })));
                setStatus(st || '');
                setLastUpdated(detail?.last_updated_display || '');
                setShowForm(true);
            } catch (err) {
                toastApiError(err);
            } finally {
                setLoading(false);
            }
        };
        run();
    }, [searchParams, searchForm, form]);

    const handleReset = () => {
        searchForm.resetFields();
        resetAll();
        setHistoryRows([]);
        setStatus('');
        setLastUpdated('');
        setShowForm(false);
    };

    const searchSku = Form.useWatch('searchSku', searchForm);

    return (
        <div className={styles.pageContainer}>
            <AdvancedFilterPanel
                // title="Filter Stone History"
                title="Stone History"
                // subtitle="Enter stone ID or SKU to load detail and transaction history."
                activeCount={searchSku ? 1 : 0}
                onClear={handleReset}
                clearLabel="Reset"
                onSearch={handleSearch}
                searchLoading={loading}
                extraActions={(
                    <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={loading}>
                        Reload
                    </Button>
                )}
            >
                <div className={styles.stoneSearchRow}>
                    {/* <label className={styles.searchLabel} htmlFor="stone-history-sku">
                        Stone Id / SKU :
                    </label> */}
                    <Form form={searchForm} className={styles.searchForm} layout="inline">
                        <Form.Item name="searchSku" className={styles.searchFieldItem}>
                            <Input
                                id="stone-history-sku"
                                placeholder="DKG-010"
                                className={`${filterPanelStyles.filterControl} ${styles.skuSearchInput}`}
                                onPressEnter={handleSearch}
                                allowClear
                                autoComplete="off"
                            />
                        </Form.Item>
                    </Form>
                </div>
            </AdvancedFilterPanel>

            {showForm && (
                <div className={styles.sectionsWrap}>
                    {status ? (
                        <Card size="small" style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                                <span>
                                    Status: <Tag color="blue">{status}</Tag>
                                </span>
                                {lastUpdated ? (
                                    <Text type="secondary">
                                        Last Updated: <Text strong>{lastUpdated}</Text>
                                    </Text>
                                ) : null}
                            </div>
                        </Card>
                    ) : null}
                    <Card className={styles.detailsCard}>
                        <button type="button" className={styles.sectionHeader} onClick={() => setGeneralOpen((v) => !v)}>
                            <span className={styles.sectionHeaderLeft}>
                                <CircleDot size={14} />
                                <span>General Information</span>
                            </span>
                            {generalOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                        {generalOpen ? (
                            <Form form={form} className={styles.customFormDesign}>
                                <DynamicForm fields={topFields} />
                            </Form>
                        ) : null}
                    </Card>

                    <Card className={styles.detailsCard}>
                        <button type="button" className={styles.sectionHeader} onClick={() => setAdvancedOpen((v) => !v)}>
                            <span className={styles.sectionHeaderLeft}>
                                <ScanText size={14} />
                                <span>Advanced Information</span>
                            </span>
                            {advancedOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                        {advancedOpen ? (
                            <Form form={form} className={styles.customFormDesign}>
                                <DynamicForm fields={bottomFields} />
                            </Form>
                        ) : null}
                    </Card>
                </div>
            )}

            <Card
                className={`${styles.detailsCard} ${styles.historyTableCard}`}
                title="Transaction History"
                extra={(
                    <Button type="primary" size="small" icon={<FileUp size={14} />} loading={exporting} onClick={handleExport} disabled={!historyRows.length}>
                        Export
                    </Button>
                )}
            >
                <SkeletonAwareTable
                    columns={historyColumns}
                    dataSource={historyRows}
                    loading={loading}
                    size="small"
                    bordered
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>
        </div>
    );
};

export default StoneHistory;
