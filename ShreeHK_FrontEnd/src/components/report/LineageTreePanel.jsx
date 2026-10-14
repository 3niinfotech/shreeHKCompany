import React, { useState, useMemo } from 'react';
import { Tag, Button, Input, Table, Tooltip, Empty } from 'antd';
import {
    Network, Box, Boxes, Layers, Gem, ArrowDown, ArrowRight,
    ExternalLink, Search, RefreshCw, GitCommit, CheckCircle2,
    Calendar, User, Tag as TagIcon, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import styles from '../../assets/scss/pages/report/stoneHistory.module.scss';

const formatNum = (val, dp = 3) => {
    if (val == null || val === '') return '—';
    const n = Number(val);
    if (!Number.isFinite(n)) return String(val);
    if (Number.isInteger(n)) return String(n);
    return String(Number(n.toFixed(dp)));
};

const getStatusColor = (status) => {
    const s = String(status || '').toLowerCase().trim();
    if (!s || s === 'available') return 'green';
    if (s === 'sale' || s === 'export') return 'magenta';
    if (s === 'memo' || s === 'consign') return 'orange';
    if (s === 'lab') return 'purple';
    return 'blue';
};

const getGroupTypeBadge = (groupType) => {
    const gt = String(groupType || 'single').toLowerCase().trim();
    if (gt === 'box') {
        return (
            <span className={`${styles.groupTypePill} ${styles.groupTypeBox}`}>
                <Boxes size={12} /> Box Container
            </span>
        );
    }
    if (gt === 'parcel') {
        return (
            <span className={`${styles.groupTypePill} ${styles.groupTypeParcel}`}>
                <Layers size={12} /> Parcel Container
            </span>
        );
    }
    return (
        <span className={`${styles.groupTypePill} ${styles.groupTypeSingle}`}>
            <Gem size={12} /> Single Diamond
        </span>
    );
};

const LineageTreePanel = ({ lineage, currentDetail, onNavigateSku }) => {
    const [childSearch, setChildSearch] = useState('');

    const parent = lineage?.parent || null;
    const current = lineage?.current || currentDetail || {};
    const rawChildren = lineage?.children || [];
    const siblings = lineage?.siblings || [];
    const pair = lineage?.pair || null;
    const transformations = lineage?.transformations || [];

    const filteredChildren = useMemo(() => {
        if (!childSearch.trim()) return rawChildren;
        const q = childSearch.trim().toLowerCase();
        return rawChildren.filter((c) =>
            String(c.sku || '').toLowerCase().includes(q) ||
            String(c.shape || '').toLowerCase().includes(q) ||
            String(c.color || '').toLowerCase().includes(q) ||
            String(c.clarity || '').toLowerCase().includes(q) ||
            String(c.status || '').toLowerCase().includes(q)
        );
    }, [rawChildren, childSearch]);

    const childColumns = [
        {
            title: 'Child SKU',
            dataIndex: 'sku',
            key: 'sku',
            width: 130,
            render: (sku, row) => (
                <button
                    type="button"
                    className={styles.treeLinkBtn}
                    onClick={() => onNavigateSku(sku)}
                    title="View child stone history"
                >
                    <span>{sku}</span>
                    <ArrowUpRight size={12} />
                </button>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'group_type',
            key: 'group_type',
            width: 90,
            render: (gt) => getGroupTypeBadge(gt),
        },
        {
            title: 'Shape / Spec',
            key: 'spec',
            width: 160,
            render: (_, r) => {
                const parts = [r.shape, r.color, r.clarity].filter(Boolean);
                return parts.length ? parts.join(' · ') : '—';
            },
        },
        {
            title: 'Pcs',
            dataIndex: 'polish_pcs',
            key: 'polish_pcs',
            width: 70,
            align: 'right',
            render: (v) => formatNum(v, 0),
        },
        {
            title: 'Carat',
            dataIndex: 'polish_carat',
            key: 'polish_carat',
            width: 80,
            align: 'right',
            render: (v) => formatNum(v),
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            width: 80,
            align: 'right',
            render: (v) => formatNum(v, 2),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            width: 90,
            align: 'right',
            render: (v) => formatNum(v, 2),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 95,
            render: (st) => (
                <Tag color={getStatusColor(st)} style={{ margin: 0, fontWeight: 600 }}>
                    {st || 'AVAILABLE'}
                </Tag>
            ),
        },
    ];

    const isContainer = current.group_type === 'box' || current.group_type === 'parcel' || rawChildren.length > 0;

    return (
        <div className={styles.lineagePanelWrap}>
            {/* Top Bar Summary */}
            <div className={styles.lineageTopBar}>
                <div className={styles.lineageTitleMeta}>
                    <div className={styles.lineageIconWrap}>
                        <Network size={18} />
                    </div>
                    <div>
                        <div className={styles.lineageHeading}>
                            Stone Lineage & Hierarchy Tree
                        </div>
                        <div className={styles.lineageSubheading}>
                            Complete lineage showing Box, Parcel, Single transformations, parent containers, and child stones.
                        </div>
                    </div>
                </div>
                <div className={styles.lineageBadgeRow}>
                    {getGroupTypeBadge(current.group_type)}
                    <Tag color={getStatusColor(current.outward || current.status)} style={{ fontWeight: 600, padding: '2px 8px' }}>
                        {current.outward ? String(current.outward).toUpperCase() : 'AVAILABLE'}
                    </Tag>
                    {rawChildren.length > 0 ? (
                        <Tag color="cyan" style={{ fontWeight: 600 }}>
                            {rawChildren.length} Child Stones
                        </Tag>
                    ) : null}
                    {parent ? (
                        <Tag color="geekblue" style={{ fontWeight: 600 }}>
                            Part of Box/Parcel {parent.sku}
                        </Tag>
                    ) : null}
                </div>
            </div>

            {/* Visual Tree Section */}
            <div className={styles.visualTreeContainer}>
                <div className={styles.treeSectionTitle}>
                    <Network size={14} />
                    <span>Visual Hierarchy Flow</span>
                </div>

                <div className={styles.treeFlowWrap}>
                    {/* Level 1: Parent Container (if stone is a child of a box or parcel) */}
                    {parent ? (
                        <div className={styles.treeNodeGroup}>
                            <div className={`${styles.treeCard} ${styles.treeCardParent}`}>
                                <div className={styles.treeCardHeader}>
                                    <div className={styles.treeNodeRole}>
                                        <Boxes size={14} />
                                        <span>Parent Container ({parent.group_type.toUpperCase()})</span>
                                    </div>
                                    <Tag color={getStatusColor(parent.status)}>{parent.status}</Tag>
                                </div>
                                <div className={styles.treeCardMain}>
                                    <div className={styles.treeSkuText}>{parent.sku}</div>
                                    <div className={styles.treeMetricsLine}>
                                        <span>{parent.polish_carat} ct</span> · <span>{parent.polish_pcs} pcs</span>
                                        {parent.shape ? <span> · {parent.shape}</span> : null}
                                    </div>
                                </div>
                                <div className={styles.treeCardAction}>
                                    <button
                                        type="button"
                                        className={styles.treeActionBtn}
                                        onClick={() => onNavigateSku(parent.sku)}
                                    >
                                        <span>Open Parent History</span>
                                        <ExternalLink size={12} />
                                    </button>
                                </div>
                            </div>
                            <div className={styles.treeConnectorDown}>
                                <div className={styles.treeLineVertical} />
                                <div className={styles.connectorBadge}>
                                    <ArrowDown size={12} />
                                    <span>Contains this constituent stone</span>
                                </div>
                                <div className={styles.treeLineVertical} />
                            </div>
                        </div>
                    ) : null}

                    {/* Level 2: Current Stone (Active Focus Node) */}
                    <div className={styles.treeNodeGroup}>
                        <div className={`${styles.treeCard} ${styles.treeCardCurrent}`}>
                            <div className={styles.currentActivePill}>
                                <CheckCircle2 size={12} />
                                <span>CURRENT STONE FOCUS</span>
                            </div>
                            <div className={styles.treeCardHeader}>
                                <div className={styles.treeNodeRole}>
                                    {getGroupTypeBadge(current.group_type)}
                                </div>
                                <Tag color={getStatusColor(current.outward || current.status)} style={{ fontWeight: 700 }}>
                                    {current.outward ? String(current.outward).toUpperCase() : 'AVAILABLE'}
                                </Tag>
                            </div>
                            <div className={styles.treeCardMain}>
                                <div className={styles.treeSkuLarge}>{current.sku}</div>
                                <div className={styles.treeSpecsGrid}>
                                    <div className={styles.treeSpecItem}>
                                        <span className={styles.treeSpecLabel}>Carat</span>
                                        <span className={styles.treeSpecVal}>{current.polish_carat} ct</span>
                                    </div>
                                    <div className={styles.treeSpecItem}>
                                        <span className={styles.treeSpecLabel}>Pcs</span>
                                        <span className={styles.treeSpecVal}>{current.polish_pcs} pcs</span>
                                    </div>
                                    <div className={styles.treeSpecItem}>
                                        <span className={styles.treeSpecLabel}>Price</span>
                                        <span className={styles.treeSpecVal}>${current.price || 0}</span>
                                    </div>
                                    <div className={styles.treeSpecItem}>
                                        <span className={styles.treeSpecLabel}>Amount</span>
                                        <span className={styles.treeSpecVal}>${current.amount || 0}</span>
                                    </div>
                                </div>
                                {current.shape || current.color || current.clarity ? (
                                    <div className={styles.treeAttributePills}>
                                        {current.shape ? <span className={styles.attrPill}>{current.shape}</span> : null}
                                        {current.color ? <span className={styles.attrPill}>{current.color}</span> : null}
                                        {current.clarity ? <span className={styles.attrPill}>{current.clarity}</span> : null}
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* If current stone contains children */}
                        {rawChildren.length > 0 ? (
                            <div className={styles.treeConnectorDown}>
                                <div className={styles.treeLineVertical} />
                                <div className={styles.connectorBadge}>
                                    <ArrowDown size={12} />
                                    <span>Contains {rawChildren.length} Constituent Child Stones</span>
                                </div>
                                <div className={styles.treeLineVertical} />
                            </div>
                        ) : null}
                    </div>

                    {/* Level 3: Children Stones (if current is Box or Parcel container) */}
                    {rawChildren.length > 0 ? (
                        <div className={styles.treeChildrenCard}>
                            <div className={styles.childrenCardHeader}>
                                <div>
                                    <div className={styles.childrenTitle}>
                                        Constituent Stones ({rawChildren.length})
                                    </div>
                                    <div className={styles.childrenSubtitle}>
                                        Stones packaged inside this {current.group_type}. Click any child SKU to open its individual history.
                                    </div>
                                </div>
                                <div className={styles.childrenSearchWrap}>
                                    <Input
                                        placeholder="Search child by SKU, shape, color..."
                                        prefix={<Search size={13} style={{ color: '#94a3b8' }} />}
                                        value={childSearch}
                                        onChange={(e) => setChildSearch(e.target.value)}
                                        allowClear
                                        size="small"
                                        style={{ width: 240, borderRadius: 6 }}
                                    />
                                </div>
                            </div>
                            <Table
                                columns={childColumns}
                                dataSource={filteredChildren.map((c, i) => ({ ...c, key: c.id || i }))}
                                size="small"
                                pagination={{ pageSize: 8, showSizeChanger: false }}
                                bordered
                                className={styles.childTable}
                            />
                        </div>
                    ) : null}
                </div>

                {/* Sibling Stones Section (if in same box/parcel) */}
                {siblings.length > 0 ? (
                    <div className={styles.siblingsBlock}>
                        <div className={styles.siblingsTitle}>
                            <span>Fellow Sibling Stones in Parent {parent?.sku} ({siblings.length})</span>
                        </div>
                        <div className={styles.siblingsChipsRow}>
                            {siblings.map((sib) => (
                                <button
                                    key={sib.id || sib.sku}
                                    type="button"
                                    className={styles.siblingChip}
                                    onClick={() => onNavigateSku(sib.sku)}
                                >
                                    <Gem size={11} />
                                    <span>{sib.sku}</span>
                                    <span className={styles.siblingCarat}>{sib.polish_carat} ct</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Paired Stone Section */}
                {pair ? (
                    <div className={styles.pairBlock}>
                        <div className={styles.pairTitle}>Matched Pair Partner</div>
                        <div className={styles.pairCard}>
                            <Gem size={14} />
                            <span className={styles.pairSku}>{pair.sku}</span>
                            <span className={styles.pairMeta}>{pair.polish_carat} ct · {pair.status}</span>
                            <button
                                type="button"
                                className={styles.treeActionBtn}
                                onClick={() => onNavigateSku(pair.sku)}
                            >
                                <span>Open Pair History</span>
                                <ArrowUpRight size={12} />
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Transformation & Life Cycle Timeline */}
            {transformations.length > 0 ? (
                <div className={styles.timelineSection}>
                    <div className={styles.treeSectionTitle}>
                        <GitCommit size={14} />
                        <span>Stone Transformation & Life Cycle Timeline</span>
                    </div>
                    <div className={styles.timelineFlow}>
                        {transformations.map((t, idx) => (
                            <div key={t.id || idx} className={styles.timelineItem}>
                                <div className={styles.timelineMarker}>
                                    <div className={`${styles.timelineDot} ${t.is_from_memo ? styles.dotMemo : ''}`} />
                                    {idx < transformations.length - 1 ? <div className={styles.timelineConnectorLine} /> : null}
                                </div>
                                <div className={styles.timelineContentCard}>
                                    <div className={styles.timelineHeader}>
                                        <div className={styles.timelineTypeBadge}>
                                            <Tag color={getActionTagColor(t.action)} style={{ fontWeight: 600 }}>
                                                {t.type_label}
                                            </Tag>
                                            {t.is_from_memo ? (
                                                <Tag color="gold" style={{ fontSize: '11px', fontWeight: 700 }}>
                                                    From Memo
                                                </Tag>
                                            ) : null}
                                        </div>
                                        <div className={styles.timelineDate}>
                                            <Calendar size={12} />
                                            <span>{t.date}</span>
                                        </div>
                                    </div>
                                    <div className={styles.timelineDesc}>
                                        {t.description || 'Action performed on stone.'}
                                    </div>
                                    <div className={styles.timelineMetaRow}>
                                        {t.party ? <span><b>Party</b>: {t.party}</span> : null}
                                        {t.invoice ? <span><b>Invoice</b>: {t.invoice}</span> : null}
                                        {t.carat ? <span><b>Movement</b>: {t.carat} ct ({t.pcs || 0} pcs)</span> : null}
                                        {t.balance_carat ? <span><b>Balance</b>: {t.balance_carat} ct</span> : null}
                                        {t.updated_by && t.updated_by !== '—' ? (
                                            <span className={styles.timelineUser}>
                                                <User size={11} /> {t.updated_by}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

const getActionTagColor = (action) => {
    const a = String(action || '').toLowerCase().trim();
    if (a === 'memo_return' || a === 'consign_return') return 'cyan';
    if (a === 'sale_return' || a === 'lab_return' || a === 'purchase_return') return 'green';
    if (a === 'memo' || a === 'consign') return 'orange';
    if (a === 'sale' || a === 'export') return 'magenta';
    if (a === 'box_add' || a === 'to_box' || a === 'boxing') return 'geekblue';
    if (a === 'unboxing' || a === 'from_box') return 'purple';
    if (a === 'parcel_add') return 'volcano';
    if (a === 'sku_change') return 'gold';
    return 'blue';
};

export default LineageTreePanel;
