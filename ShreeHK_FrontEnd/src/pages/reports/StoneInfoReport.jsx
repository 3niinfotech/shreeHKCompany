import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Card, Form, Input, Tag, Typography, Button, Tabs, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Layers, Activity, RefreshCw } from 'lucide-react';
import { api } from '../../api/client/axiosInstance';
import { ENDPOINTS } from '../../api/endpoints';
import AdvancedFilterPanel, { filterPanelStyles } from '../../components/common/filters/AdvancedFilterPanel';
import styles from '../../assets/scss/pages/report/stoneInfo.module.scss';
import { toastApiError } from '../../utils/toastNotify';
import { toastSuccess, toastWarning } from '../../utils/toastNotify';
import { SkeletonDetail, SkeletonAwareTable } from '../../components/common/skeleton';
import ExportExcelButton from '../../components/common/ExportExcelButton';
import { exportReportToExcel } from '../../utils/reportExcelExport';

const { Text } = Typography;

const formatActionLabel = (text) => String(text || '').replace(/_/g, ' ').toUpperCase().trim();

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
            else if (act.includes('import') || act.includes('inward') || act.includes('purchase')) color = 'cyan';
            return <Tag color={color} style={{ fontWeight: 600 }}>{formatActionLabel(text)}</Tag>;
        }
    },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Invoice / Ref', dataIndex: 'invoice', key: 'invoice', width: 120, render: (v) => <Text strong>{v || '-'}</Text> },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Pcs', dataIndex: 'pcs', key: 'pcs', width: 70, align: 'right' },
    { title: 'Carat', dataIndex: 'carat', key: 'carat', width: 80, align: 'right' },
    {
        title: 'Price / Rate',
        dataIndex: 'price',
        key: 'price',
        width: 110,
        align: 'right',
        render: (v) => (v != null ? <span style={{ color: 'var(--color-success-dark)' }}>${Number(v).toLocaleString()}</span> : '-'),
    },
    {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        align: 'right',
        render: (v) => (v != null ? <span style={{ color: 'var(--color-primary-dark)' }}>${Number(v).toLocaleString()}</span> : '-'),
    },
];

const generalColumns = [
    { title: 'Sr.', key: 'srNo', width: 50, align: 'center', render: (_, __, index) => index + 1 },
    {
        title: 'Action',
        dataIndex: 'action',
        key: 'action',
        width: 120,
        render: (text) => <Tag color="cyan" style={{ fontWeight: 600 }}>{formatActionLabel(text)}</Tag>
    },
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format('DD-MM-YYYY') : (v || '-')) },
    { title: 'Invoice', dataIndex: 'invoice', key: 'invoice', width: 110 },
    { title: 'Party', dataIndex: 'party_name', key: 'party_name', width: 160, render: (v) => v || '-' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Pcs', dataIndex: 'pcs', key: 'pcs', width: 70, align: 'right' },
    { title: 'Carat', dataIndex: 'carat', key: 'carat', width: 80, align: 'right' },
    {
        title: 'Price',
        dataIndex: 'price',
        key: 'price',
        width: 100,
        align: 'right',
        render: (v) => (v != null ? <span style={{ color: 'var(--color-success-dark)' }}>${Number(v).toLocaleString()}</span> : '-'),
    },
    {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        width: 110,
        align: 'right',
        render: (v) => (v != null ? <span style={{ color: 'var(--color-primary-dark)' }}>${Number(v).toLocaleString()}</span> : '-'),
    },
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

    const activePartyBlocks = (byParty || []).filter(
        (block) => (block.memoHistory?.length > 0) || (block.saleHistory?.length > 0)
    );

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
                        <ExportExcelButton
                            loading={exporting}
                            onClick={handleExportExcel}
                            disabled={!detail}
                        />
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
                <Card className={styles.loadingCard}>
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
                <Card className={styles.dossier}>
                    <div className={styles.attrGrid}>
                        <div className={styles.attrCol}>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Status</span>
                                <span className={styles.attrValue}>
                                    <span className={`${styles.statusBadge} ${getStatusClass(status)}`}>
                                        {String(status || 'Available')
                                          .toLowerCase()
                                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </span>
                                </span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Lab</span>
                                <span className={styles.attrValue}>{(detail.lab || '').toString().toUpperCase() || '-'}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Pcs</span>
                                <span className={styles.attrValue}>{detail.polish_pcs ?? 0}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Argyle Color</span>
                                <span className={styles.attrValue}>{detail.argyle_color || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Rap</span>
                                <span className={`${styles.attrValue} ${styles.attrValueRap}`}>
                                    {Number(detail.rap_price || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Amount</span>
                                <span className={`${styles.attrValue} ${styles.attrValueAmount}`}>
                                    {Number(detail.amount || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Cut</span>
                                <span className={styles.attrValue}>{detail.cut || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Table</span>
                                <span className={styles.attrValue}>{detail.table_pc || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Girdle</span>
                                <span className={styles.attrValue}>{detail.gridle || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Intensity</span>
                                <span className={styles.attrValue}>{detail.intensity || ''}</span>
                            </div>
                        </div>

                        <div className={styles.attrCol}>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>SKU</span>
                                <span className={styles.attrValue}>
                                    <span className={styles.skuBadge}>{detail.sku || '-'}</span>
                                </span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Certificate</span>
                                <span className={styles.attrValue}>{detail.report_no || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Carat</span>
                                <span className={styles.attrValue}>{detail.polish_carat ?? 0}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>In House Cla</span>
                                <span className={styles.attrValue}>{detail.in_house_clarity || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Cost</span>
                                <span className={`${styles.attrValue} ${styles.attrValueCost}`}>
                                    {Number(detail.cost || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Size</span>
                                <span className={styles.attrValue}>{detail.size || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Polish</span>
                                <span className={styles.attrValue}>{detail.polish || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Depth</span>
                                <span className={styles.attrValue}>{detail.depth_pc || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Mining</span>
                                <span className={styles.attrValue}>{detail.mining || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Overtone</span>
                                <span className={styles.attrValue}>{detail.overtone || ''}</span>
                            </div>
                        </div>

                        <div className={styles.attrCol}>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Type</span>
                                <span className={styles.attrValue}>{detail.group_type || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Shape</span>
                                <span className={styles.attrValue}>{detail.shape || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Full Color</span>
                                <span className={styles.attrValue}>{detail.main_color || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Clarity</span>
                                <span className={styles.attrValue}>{detail.clarity || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Price</span>
                                <span className={`${styles.attrValue} ${styles.attrValueGreen}`}>
                                    {Number(detail.price || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Fluorescence</span>
                                <span className={styles.attrValue}>{detail.f_intensity || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Symm</span>
                                <span className={styles.attrValue}>{detail.symmentry || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Measurement</span>
                                <span className={styles.attrValue}>{detail.mesurment || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Origin</span>
                                <span className={styles.attrValue}>{detail.origin || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Color</span>
                                <span className={styles.attrValue}>{detail.color || ''}</span>
                            </div>
                        </div>

                        <div className={styles.attrCol}>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>LOC</span>
                                <span className={styles.attrValue}>{detail.location || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Eye Clean</span>
                                <span className={styles.attrValue}>{detail.eyeclean || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Remark</span>
                                <span className={styles.attrValue}>{detail.remark || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Package</span>
                                <span className={styles.attrValue}>{detail.package || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Group</span>
                                <span className={styles.attrValue}>{detail.main_group || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>BGM</span>
                                <span className={styles.attrValue}>{detail.bgm || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Sub Group</span>
                                <span className={styles.attrValue}>{detail.sub_group || ''}</span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Site Upload</span>
                                <span className={styles.attrValue}>
                                    <span className={`${styles.uploadValueBadge} ${detail.site_upload ? styles.uploadValueOn : styles.uploadValueOff}`}>
                                        {detail.site_upload ? 'Yes' : 'No'}
                                    </span>
                                </span>
                            </div>
                            <div className={styles.attrRow}>
                                <span className={styles.attrLabel}>Rapnet Upload</span>
                                <span className={styles.attrValue}>
                                    <span className={`${styles.uploadValueBadge} ${detail.rapnet_upload ? styles.uploadValueOn : styles.uploadValueOff}`}>
                                        {detail.rapnet_upload ? 'Yes' : 'No'}
                                    </span>
                                </span>
                            </div>
                            {detail.pair ? (
                                <div className={styles.attrRow}>
                                    <span className={styles.attrLabel}>Pair</span>
                                    <span className={styles.attrValue}>
                                        <button
                                            type="button"
                                            className={styles.pairLink}
                                            onClick={() => {
                                                form.setFieldsValue({ searchSku: detail.pair });
                                                handleSearch();
                                            }}
                                        >
                                            {detail.pair}
                                        </button>
                                    </span>
                                </div>
                            ) : null}
                            {detail.hold > 0 ? (
                                <div className={styles.attrRow}>
                                    <span className={styles.attrLabel}>Hold</span>
                                    <span className={styles.attrValue}>Yes ({detail.hold})</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className={styles.historySection}>
                        <Tabs
                            className={styles.detailTabs}
                            defaultActiveKey={activePartyBlocks.length > 0 ? 'partyHistory' : 'allHistory'}
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
                                                <div className={styles.emptyHistory}>
                                                    No party-wise memo or sale history records found for this stone.
                                                </div>
                                            ) : (
                                                activePartyBlocks.map((block) => {
                                                    const hasMemo = block.memoHistory && block.memoHistory.length > 0;
                                                    const hasSale = block.saleHistory && block.saleHistory.length > 0;

                                                    return (
                                                        <div key={block.party_id} className={styles.partyBlock}>
                                                            <div className={styles.partyBlockTitle}>
                                                                <Activity size={16} />
                                                                <span>Party: {block.party_name || `Party ID: ${block.party_id}`}</span>
                                                            </div>

                                                            {hasMemo ? (
                                                                <div style={{ marginBottom: 12 }}>
                                                                    <span className={`${styles.historySubTitle} ${styles.historySubTitleMemo}`}>
                                                                        Memo / Consign History
                                                                    </span>
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
                                                            ) : null}

                                                            {hasSale ? (
                                                                <div>
                                                                    <span className={`${styles.historySubTitle} ${styles.historySubTitleSale}`}>
                                                                        Sale / Export History
                                                                    </span>
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
                                                            ) : null}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    ),
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
                                    ),
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
                                    ),
                                }] : []),
                            ]}
                        />
                    </div>
                </Card>
            )}
        </div>
    );
};

export default StoneInfoReport;
