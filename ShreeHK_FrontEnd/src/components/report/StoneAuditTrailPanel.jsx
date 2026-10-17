import React from 'react';
import { Tag, Table, Empty } from 'antd';
import {
    ShieldCheck, Calendar, User, FileText, ArrowRight, CheckCircle2,
    Clock, Activity, AlertCircle
} from 'lucide-react';
import styles from '../../assets/scss/pages/report/stoneHistory.module.scss';

const formatLogDateTime = (dateVal) => {
    if (!dateVal) return '—';
    const parsed = new Date(dateVal);
    if (Number.isNaN(parsed.getTime())) return String(dateVal);
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

const getActionColor = (action) => {
    const a = String(action || '').toUpperCase().trim();
    if (a === 'CREATE' || a === 'INSERT') return 'green';
    if (a === 'UPDATE') return 'blue';
    if (a === 'DELETE') return 'red';
    if (a === 'PRICE_CHANGE' || a === 'CHANGE_PRICE') return 'gold';
    if (a === 'HOLD') return 'orange';
    if (a === 'UNHOLD') return 'cyan';
    return 'default';
};

const safeParseJson = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch {
        return null;
    }
};

const StoneAuditTrailPanel = ({ activityLogs }) => {
    const logs = Array.isArray(activityLogs) ? activityLogs : [];

    const columns = [
        {
            title: 'Date & Time',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 140,
            render: (val) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}>
                    <Clock size={12} style={{ color: '#94a3b8' }} />
                    <span>{formatLogDateTime(val)}</span>
                </div>
            ),
        },
        {
            title: 'Action',
            dataIndex: 'action_type',
            key: 'action_type',
            width: 100,
            render: (act) => (
                <Tag color={getActionColor(act)} style={{ fontWeight: 600, fontSize: '11px' }}>
                    {String(act || 'ACTION').toUpperCase()}
                </Tag>
            ),
        },
        {
            title: 'Module',
            dataIndex: 'module_name',
            key: 'module_name',
            width: 140,
            render: (mod) => (
                <span style={{ fontWeight: 600, color: '#334155' }}>
                    {mod || 'System'}
                </span>
            ),
        },
        {
            title: 'Updated By',
            dataIndex: 'user_name',
            key: 'user_name',
            width: 150,
            render: (user, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <User size={12} style={{ color: '#0284c7' }} />
                    <span style={{ fontWeight: 600 }}>{user || 'SYSTEM'}</span>
                    {row.user_role ? (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>({row.user_role})</span>
                    ) : null}
                </div>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (desc, row) => {
                const changed = safeParseJson(row.changed_fields);
                const hasChangedList = Array.isArray(changed) && changed.length > 0;
                return (
                    <div>
                        <div style={{ color: '#0f172a' }}>{desc || '—'}</div>
                        {hasChangedList ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Modified:</span>
                                {changed.map((f) => (
                                    <Tag key={f} color="cyan" style={{ fontSize: '10px', margin: 0, padding: '0 4px' }}>
                                        {f}
                                    </Tag>
                                ))}
                            </div>
                        ) : null}
                    </div>
                );
            },
        },
    ];

    const expandedRowRender = (record) => {
        const oldVal = safeParseJson(record.old_value);
        const newVal = safeParseJson(record.new_value);
        const changedList = safeParseJson(record.changed_fields);

        if (!oldVal && !newVal) {
            return (
                <div style={{ padding: '8px 12px', color: '#64748b', fontSize: '12px' }}>
                    No field diff snapshot available for this event.
                </div>
            );
        }

        // Determine fields to compare
        let fields = [];
        if (Array.isArray(changedList) && changedList.length > 0) {
            fields = changedList;
        } else {
            const allKeys = new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal || {})]);
            fields = [...allKeys].filter((k) => !['requestPath', 'requestMethod', 'pageContext', 'token', 'pass'].includes(k));
        }

        return (
            <div className={styles.auditDiffWrap}>
                <div className={styles.diffTitle}>Field Changes Snapshot</div>
                <div className={styles.diffTableWrap}>
                    <table className={styles.diffTable}>
                        <thead>
                            <tr>
                                <th>Field</th>
                                <th>Previous Value</th>
                                <th>New Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map((f) => {
                                const o = oldVal?.[f] != null ? String(oldVal[f]) : '—';
                                const n = newVal?.[f] != null ? String(newVal[f]) : '—';
                                const isDiff = o !== n;
                                return (
                                    <tr key={f} className={isDiff ? styles.diffRowActive : ''}>
                                        <td className={styles.diffFieldCol}>
                                            <code>{f}</code>
                                        </td>
                                        <td className={styles.diffOldCol}>{o}</td>
                                        <td className={styles.diffNewCol}>{n}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.auditPanelWrap}>
            <div className={styles.auditHeader}>
                <div className={styles.auditTitleWrap}>
                    <div className={styles.auditIconWrap}>
                        <ShieldCheck size={18} />
                    </div>
                    <div>
                        <div className={styles.auditHeading}>
                            Audit Trail & Modification History
                        </div>
                        <div className={styles.auditSubheading}>
                            Immutable audit trail of all stone updates, SKU renames, price modifications, and user transactions.
                        </div>
                    </div>
                </div>
                <Tag color="blue" style={{ fontWeight: 600, padding: '3px 8px' }}>
                    {logs.length} Total Event(s)
                </Tag>
            </div>

            {logs.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No audit logs recorded for this stone yet."
                    style={{ margin: '30px 0' }}
                />
            ) : (
                <div className={styles.auditTableScroll}>
                    <Table
                        columns={columns}
                        dataSource={logs.map((l, i) => ({ ...l, key: l.id || i }))}
                        size="small"
                        bordered
                        pagination={logs.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
                        expandable={{
                            expandedRowRender,
                            rowExpandable: (record) => Boolean(record.old_value || record.new_value),
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default StoneAuditTrailPanel;
