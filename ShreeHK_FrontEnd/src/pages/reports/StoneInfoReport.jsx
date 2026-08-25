import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Card, Form, Input, Tag, Typography, Button, Tabs, Badge, Space, Switch, Row, Col, Divider, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Gem, FileText, MapPin, Calendar, DollarSign, Layers, Activity, FileUp, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { api } from '../../api/axiosInstance';
import { ENDPOINTS } from '../../constants/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import styles from '../../assets/scss/pages/report/stoneHistory.module.scss';
import { toastApiError } from '../../utils/apiToast';
import { toastSuccess, toastWarning } from '../../utils/toastNotify';
import { SkeletonDetail, SkeletonAwareTable } from '../../components/common/skeleton';
import { exportReportToExcel } from '../../utils/reportExcelExport';

const { Title, Text } = Typography;

const historyColumns = [
    { title: 'Sr.', key: 'srNo', width: 50, align: 'center', render: (_, __, index) => index + 1 },
    {
        title: 'Action',
        dataIndex: 'action',
        key: 'action',
        width: 120,
        render: (text) => {
            const act = (text || '').toLowerCase();
            let color = 'default';
            if (act.includes('memo')) color = 'orange';
            else if (act.includes('sale')) color = 'green';
            else if (act.includes('export')) color = 'blue';
            else if (act.includes('consign')) color = 'purple';
            return <Tag color={color} style={{ fontWeight: 600 }}>{(text || '').toUpperCase()}</Tag>;
        }
    },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Invoice / Ref', dataIndex: 'invoice', key: 'invoice', width: 120, render: (v) => <Text strong>{v || '-'}</Text> },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Pcs', dataIndex: 'pcs', key: 'pcs', width: 70, align: 'right' },
    { title: 'Carat', dataIndex: 'carat', key: 'carat', width: 80, align: 'right' },
    { title: 'Price / Rate', dataIndex: 'price', key: 'price', width: 110, align: 'right', render: (v) => (v != null ? `$${Number(v).toLocaleString()}` : '-') },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 120, align: 'right', render: (v) => (v != null ? `$${Number(v).toLocaleString()}` : '-') },
];

const generalColumns = [
    { title: 'Sr.', key: 'srNo', width: 50, align: 'center', render: (_, __, index) => index + 1 },
    {
        title: 'Action',
        dataIndex: 'action',
        key: 'action',
        width: 120,
        render: (text) => <Tag color="cyan" style={{ fontWeight: 600 }}>{(text || '').toUpperCase()}</Tag>
    },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Invoice', dataIndex: 'invoice', key: 'invoice', width: 110 },
    { title: 'Party', dataIndex: 'party_name', key: 'party_name', width: 160, render: (v) => v || '-' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Pcs', dataIndex: 'pcs', key: 'pcs', width: 70, align: 'right' },
    { title: 'Carat', dataIndex: 'carat', key: 'carat', width: 80, align: 'right' },
    { title: 'Price', dataIndex: 'price', key: 'price', width: 100, align: 'right', render: (v) => (v != null ? `$${Number(v).toLocaleString()}` : '-') },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 110, align: 'right', render: (v) => (v != null ? `$${Number(v).toLocaleString()}` : '-') },
];

const StoneInfoReport = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [detail, setDetail] = useState(null);
    const [byParty, setByParty] = useState([]);
    const [history, setHistory] = useState([]);
    const [transfer, setTransfer] = useState([]);
    const [status, setStatus] = useState('');

    const handleSearch = async () => {
        const sku = (form.getFieldValue('searchSku') || '').trim();
        if (!sku) {
            toastWarning('Please enter a Stone ID or SKU.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(ENDPOINTS.report.stoneInfo, { params: { sku } });
            const data = res.data?.Data;
            if (!data?.detail) {
                toastApiError({ response: { data: res.data } });
                setDetail(null);
                setByParty([]);
                setHistory([]);
                setTransfer([]);
                setStatus('');
                return;
            }
            setDetail(data.detail);
            setByParty(data.byParty || []);
            setHistory(data.history || []);
            setTransfer(data.transfer || []);
            setStatus(data.status || 'AVAILABLE');
        } catch (err) {
            toastApiError(err);
            setDetail(null);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        form.resetFields();
        setDetail(null);
        setByParty([]);
        setHistory([]);
        setTransfer([]);
        setStatus('');
    };

    const handleExportExcel = async () => {
        if (!detail) return;
        setExporting(true);
        try {
            const exportRows = [];
            (byParty || []).forEach(p => {
                (p.memoHistory || []).forEach(m => {
                    exportRows.push({ party: p.party_name || '-', category: 'Memo / Consign', ...m });
                });
                (p.saleHistory || []).forEach(s => {
                    exportRows.push({ party: p.party_name || '-', category: 'Sale / Export', ...s });
                });
            });
            if (!exportRows.length && history.length) {
                history.forEach(h => exportRows.push({ party: h.party_name || '-', category: 'General History', ...h }));
            }
            if (!exportRows.length && transfer.length) {
                transfer.forEach(t => exportRows.push({ party: t.party_name || '-', category: 'Transfer History', ...t }));
            }

            const headers = [
                { title: 'Party', key: 'party', width: 22 },
                { title: 'Category', key: 'category', width: 18 },
                { title: 'Action', key: 'action', width: 14 },
                { title: 'Date', key: 'date', accessor: (r) => (r.date && dayjs(r.date).isValid() ? dayjs(r.date).format('DD-MM-YYYY') : r.date || '-'), width: 12 },
                { title: 'Invoice / Ref', key: 'invoice', width: 14 },
                { title: 'Description', key: 'description', width: 30 },
                { title: 'Pcs', key: 'pcs', width: 8 },
                { title: 'Carat', key: 'carat', width: 10 },
                { title: 'Price', key: 'price', width: 12 },
                { title: 'Amount', key: 'amount', width: 14 },
            ];

            await exportReportToExcel({
                headers,
                rows: exportRows.length ? exportRows : [
                    { party: '-', category: 'Stone Detail', action: status, invoice: detail.report_no || '-', description: `Shape: ${detail.shape || '-'} | Color: ${detail.main_color || '-'}`, pcs: detail.polish_pcs, carat: detail.polish_carat, price: detail.price, amount: detail.amount }
                ],
                fileName: `Stone_Info_${detail.sku}`,
                sheetName: 'Stone Info',
            });
            toastSuccess('Exported Stone Info to Excel');
        } catch (err) {
            console.error(err);
        } finally {
            setExporting(false);
        }
    };

    const searchSku = Form.useWatch('searchSku', form);
    const activeCount = searchSku ? 1 : 0;

    const getStatusClass = (st) => {
        const s = (st || '').toUpperCase();
        if (s.includes('SALE') || s.includes('SOLD')) return styles.status_sale;
        if (s.includes('MEMO') || s.includes('CONSIGN')) return styles.status_memo;
        if (s.includes('LAB')) return styles.status_lab;
        return styles.status_available;
    };

    return (
        <div className={styles.pageContainer}>
            <AdvancedFilterPanel
                title="Stone Info"
                activeCount={activeCount}
                onClear={handleClear}
                clearDisabled={!activeCount}
                onSearch={handleSearch}
                searchLoading={loading}
                clearLabel="Reset"
                extraActions={(
                    <Space wrap>
                        <Button
                            icon={<FileUp size={15} color="white" />}
                            loading={exporting}
                            onClick={handleExportExcel}
                            disabled={!detail}
                            style={{ background: "var(--color-btn-save-bg)", borderColor: "var(--color-btn-save-bg)", color: "#fff" }}
                        >
                            Export to Excel
                        </Button>
                        <Button type="default" icon={<ReloadOutlined />} className={filterPanelStyles.btnClear} onClick={handleSearch} loading={loading}>
                            Reload
                        </Button>
                    </Space>
                )}
            >
                <div className={styles.stoneSearchRow}>
                    <label className={styles.searchLabel} htmlFor="stone-info-sku">
                        Stone Id / SKU :
                    </label>
                    <Form form={form} className={styles.searchForm} layout="inline">
                        <Form.Item name="searchSku" className={styles.searchFieldItem}>
                            <Input
                                id="stone-info-sku"
                                placeholder="Enter SKU / Stone ID"
                                className={`${filterPanelStyles.filterControl} ${styles.skuSearchInput}`}
                                onPressEnter={handleSearch}
                                allowClear
                                autoComplete="off"
                            />
                        </Form.Item>
                    </Form>
                </div>
            </AdvancedFilterPanel>

            {loading && !detail && (
                <Card className={styles.detailsCard}>
                    <div style={{ padding: 8 }}>
                        <SkeletonDetail fields={6} />
                        <div style={{ marginTop: 16 }}>
                            <SkeletonAwareTable
                                size="small"
                                columns={historyColumns}
                                dataSource={[]}
                                loading
                                pagination={false}
                                bordered
                                skeletonRows={5}
                            />
                        </div>
                    </div>
                </Card>
            )}

            {detail && (
                <Card className={styles.detailsCard}>
                    <div className={styles.extraWrap}>
                        {/* Side Status & Flag Badges */}
                        <div className={styles.extraSide}>
                            <div className={`${styles.statusBadge} ${getStatusClass(status)}`}>
                                <Gem size={16} />
                                <span>{(status || 'AVAILABLE').toUpperCase()}</span>
                            </div>

                            {detail.pair && (
                                <button className={styles.pairBtn} onClick={() => { form.setFieldsValue({ searchSku: detail.pair }); handleSearch(); }}>
                                    <Sparkles size={14} />
                                    <span>Pair: {detail.pair}</span>
                                </button>
                            )}

                            {detail.hold > 0 && (
                                <div className={styles.holdAlert}>
                                    <div className={styles.holdAlertTitle}>
                                        <AlertCircle size={14} />
                                        <span>On Hold ({detail.hold})</span>
                                    </div>
                                    <p>Stone is currently held.</p>
                                </div>
                            )}

                            <div className={styles.flagRow} style={{ gridTemplateColumns: '1fr' }}>
                                <div className={`${styles.flagTile} ${detail.site_upload ? styles.flagTileOn : ''}`}>
                                    <span>Site Upload</span>
                                    <CheckCircle size={14} color={detail.site_upload ? 'var(--color-primary)' : '#8c8c8c'} />
                                </div>
                                <div className={`${styles.flagTile} ${detail.rapnet_upload ? styles.flagTileOn : ''}`}>
                                    <span>Rapnet Upload</span>
                                    <CheckCircle size={14} color={detail.rapnet_upload ? 'var(--color-primary)' : '#8c8c8c'} />
                                </div>
                            </div>
                        </div>

                        {/* Main Specs & Metrics */}
                        <div className={styles.extraMain}>
                            <div className={styles.labLine}>
                                <div className={styles.labBadge}>
                                    <FileText size={14} />
                                    <span>Lab: {detail.lab || 'NONE'}</span>
                                </div>
                                {detail.report_no && (
                                    <span className={styles.labCert}>
                                        Report #: {detail.report_no}
                                    </span>
                                )}
                                <Tag color="blue" style={{ fontWeight: 600 }}>
                                    SKU: {detail.sku}
                                </Tag>
                                {detail.location && (
                                    <Tag icon={<MapPin size={12} />} color="geekblue">
                                        <span style={{  marginLeft: "5px" }}>{detail.location}</span>
                                    </Tag>
                                )}
                                {detail.group_type && (
                                    <Tag color="purple">Type: {detail.group_type}</Tag>
                                )}
                            </div>

                            <div className={styles.metricRow}>
                                {/* Current Stock Metrics */}
                                <div className={`${styles.metricGroup} ${styles.metricGroupCurrent}`}>
                                    <div className={styles.metricGroupTitle}>Current Stock Metrics</div>
                                    <div className={styles.metricGrid}>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>{detail.polish_pcs ?? 0}</span>
                                            <span className={styles.metricLabel}>Pcs</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>{detail.polish_carat ?? 0}</span>
                                            <span className={styles.metricLabel}>Carat</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>${Number(detail.price || 0).toLocaleString()}</span>
                                            <span className={styles.metricLabel}>Price / Crt</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>${Number(detail.amount || 0).toLocaleString()}</span>
                                            <span className={styles.metricLabel}>Total Amount</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>${Number(detail.cost || 0).toLocaleString()}</span>
                                            <span className={styles.metricLabel}>Cost</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>{detail.location || 'HK'}</span>
                                            <span className={styles.metricLabel}>Location</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Purchase Metrics */}
                                <div className={`${styles.metricGroup} ${styles.metricGroupPurchase}`}>
                                    <div className={styles.metricGroupTitle}>Purchase Metrics</div>
                                    <div className={styles.metricGrid}>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>{detail.purchase_pcs ?? 0}</span>
                                            <span className={styles.metricLabel}>P. Pcs</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>{detail.purchase_carat ?? 0}</span>
                                            <span className={styles.metricLabel}>P. Carat</span>
                                        </div>
                                        <div className={styles.metric}>
                                            <span className={styles.metricValue}>${Number(detail.purchase_price || 0).toLocaleString()}</span>
                                            <span className={styles.metricLabel}>P. Rate</span>
                                        </div>
                                        <div className={styles.metric} style={{ gridColumn: 'span 3' }}>
                                            <span className={styles.metricValue}>${Number(detail.purchase_amount || 0).toLocaleString()}</span>
                                            <span className={styles.metricLabel}>Purchase Amount</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Attributes Highlights */}
                            <div className={styles.shapeLine}>
                                <span><b>Shape:</b> {detail.shape || '-'}</span>
                                <Divider type="vertical" />
                                <span><b>Color:</b> {detail.main_color || '-'}</span>
                                <Divider type="vertical" />
                                <span><b>Measurement:</b> {detail.mesurment || '-'}</span>
                                {detail.last_updated_display && (
                                    <>
                                        <Divider type="vertical" />
                                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                            Updated: {detail.last_updated_display}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <Divider className={styles.formDivider} style={{ margin: '16px 0 8px' }} />

                    {/* Transaction & Party History Tabs */}
                    {(() => {
                        const activePartyBlocks = (byParty || []).filter(
                            (block) => (block.memoHistory?.length > 0) || (block.saleHistory?.length > 0)
                        );

                        return (
                            <Tabs
                                className={styles.detailTabs}
                                defaultActiveKey={activePartyBlocks.length > 0 ? "partyHistory" : "allHistory"}
                                items={[
                                    {
                                        key: 'partyHistory',
                                        label: (
                                            <span className={styles.tabLabel}>
                                                <Layers size={15} />
                                                Party-Wise History ({activePartyBlocks.length})
                                            </span>
                                        ),
                                        children: (
                                            <div className={styles.historyTabContent}>
                                                {activePartyBlocks.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)' }}>
                                                        No party-wise memo or sale history records found for this stone.
                                                    </div>
                                                ) : (
                                                    activePartyBlocks.map((block) => {
                                                        const hasMemo = block.memoHistory && block.memoHistory.length > 0;
                                                        const hasSale = block.saleHistory && block.saleHistory.length > 0;

                                                        return (
                                                            <div key={block.party_id} className={styles.oldHistoryBlock}>
                                                                <div className={styles.tabSectionTitle}>
                                                                    <Activity size={16} />
                                                                    <span>Party: {block.party_name || `Party ID: ${block.party_id}`}</span>
                                                                </div>

                                                                {hasMemo && (
                                                                    <div style={{ marginBottom: 12 }}>
                                                                        <Text strong style={{ color: 'var(--color-warning)', fontSize: 12, marginBottom: 6, display: 'inline-block' }}>
                                                                            Memo / Consign History
                                                                        </Text>
                                                                        <SkeletonAwareTable
                                                                            size="small"
                                                                            columns={historyColumns}
                                                                            dataSource={block.memoHistory.map((r, i) => ({ ...r, key: `memo-${i}` }))}
                                                                            loading={loading}
                                                                            pagination={false}
                                                                            bordered
                                                                            rowKey="key"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {hasSale && (
                                                                    <div>
                                                                        <Text strong style={{ color: 'var(--color-success)', fontSize: 12, marginBottom: 6, display: 'inline-block' }}>
                                                                            Sale / Export History
                                                                        </Text>
                                                                        <SkeletonAwareTable
                                                                            size="small"
                                                                            columns={historyColumns}
                                                                            dataSource={block.saleHistory.map((r, i) => ({ ...r, key: `sale-${i}` }))}
                                                                            loading={loading}
                                                                            pagination={false}
                                                                            bordered
                                                                            rowKey="key"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )
                                    },
                                    {
                                        key: 'allHistory',
                                        label: (
                                            <span className={styles.tabLabel}>
                                                <Activity size={15} />
                                                All History ({history.length})
                                            </span>
                                        ),
                                        children: (
                                            <div className={styles.historyTabContent}>
                                                <SkeletonAwareTable
                                                    size="small"
                                                    columns={generalColumns}
                                                    dataSource={history.map((r, i) => ({ ...r, key: `his-${i}` }))}
                                                    loading={loading}
                                                    pagination={false}
                                                    bordered
                                                    rowKey="key"
                                                />
                                            </div>
                                        )
                                    },
                                    ...(transfer.length > 0 ? [{
                                        key: 'transferHistory',
                                        label: (
                                            <span className={styles.tabLabel}>
                                                <RefreshCw size={15} />
                                                Transfer History ({transfer.length})
                                            </span>
                                        ),
                                        children: (
                                            <div className={styles.historyTabContent}>
                                                <SkeletonAwareTable
                                                    size="small"
                                                    columns={generalColumns}
                                                    dataSource={transfer.map((r, i) => ({ ...r, key: `trf-${i}` }))}
                                                    loading={loading}
                                                    pagination={false}
                                                    bordered
                                                    rowKey="key"
                                                />
                                            </div>
                                        )
                                    }] : [])
                                ]}
                            />
                        );
                    })()}
                </Card>
            )}
        </div>
    );
};

export default StoneInfoReport;
