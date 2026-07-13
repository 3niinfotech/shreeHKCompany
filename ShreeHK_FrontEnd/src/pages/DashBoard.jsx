import { Card, Row, Col, Table, Typography, Tooltip, Spin } from 'antd';
import {
    Diamond,
    Tag,
    ChevronRight,
    Plus,
    PlusCircle,
    Receipt,
    FileText,
    FlaskConical,
    TrendingUp,
    Send,
    ClipboardList,
    BarChart3,
    CalendarDays,
    Wallet,
    Activity,
} from 'lucide-react';
const { Text, Title } = Typography;
import { toast } from 'sonner';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/Auth.Store';
import dayjs from 'dayjs';
import AIInsightCard from "../components/ai/AIInsightCard";
import { useFetchApi } from '../api/ApiFunction';
import { ENDPOINTS } from '../constants/endpoints';
import useThemeColors from '../hooks/useThemeColors';
import "../assets/scss/pages/dashboard.scss";

const fmtMoney = (value) =>
    `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const fmtCaratPcs = (carat, pcs) =>
    `${Number(carat || 0).toFixed(2)} (${Number(pcs || 0).toLocaleString()})`;

const fmtCompact = (value) => {
    const n = Number(value) || 0;
    if (n >= 1000) return `${(n / 1000).toFixed(2)}k`;
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const STAT_VARIANTS = ['emerald', 'sapphire', 'amber', 'violet'];

const StatSummaryCard = ({ title, subtitle, value, icon, footerText, link, isLoading, onNavigate, variant = 'emerald' }) => (
    <Card bordered={false} className={`stat-card stat-card--${variant}`} styles={{ body: { padding: 0, height: '100%' } }}>
        <div className="stat-card-shine" aria-hidden="true" />
        <div className="stat-card-body">
            <div className="stat-card-top">
                <div className="stat-icon">{icon}</div>
                <h3 className="stat-value">{isLoading ? <Spin size="small" /> : value}</h3>
            </div>
            <div className="stat-info">
                <p className="stat-title">{title}</p>
                <p className="stat-subtitle">{subtitle}</p>
            </div>
        </div>
        <button
            type="button"
            className="stat-card-footer"
            onClick={() => link && onNavigate(link)}
        >
            <span>{footerText}</span>
            <ChevronRight size={14} strokeWidth={2.5} />
        </button>
    </Card>
);

const columns = [
    {
        title: 'Party',
        dataIndex: 'party',
        key: 'party',
        render: (text) => <a>{text}</a>,
        width: 120,
    },
    {
        title: 'Entry',
        dataIndex: 'entry',
        key: 'entry',
        align: 'center',
        width: 120,
    },
    {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        width: 120,
        align: 'center',
        render: (v) => fmtMoney(v),
    },
    {
        title: 'Paid',
        dataIndex: 'paid',
        key: 'paid',
        align: 'center',
        width: 120,
        render: (v) => fmtMoney(v),
    },
    {
        title: 'Balance',
        dataIndex: 'balance',
        key: 'balance',
        align: 'center',
        width: 120,
        render: (v) => fmtMoney(v),
    },
];

const quickActionsForTheme = (t) => [
    { title: 'Add Inventory', subtitle: 'Add new stock', leftIcon: <Plus size={18} />, rightIcon: <PlusCircle size={22} />, leftColor: t.primary, rightColor: t.primary, link: '/inventory/my-inventory' },
    { title: 'Lab Entry', subtitle: 'Send to lab', leftIcon: <Send size={18} />, rightIcon: <FileText size={22} />, leftColor: t.danger, rightColor: t.danger, link: '/transaction/gia-memo' },
    { title: 'On Memo', subtitle: 'Send on memo', leftIcon: <ClipboardList size={18} />, rightIcon: <FileText size={22} />, leftColor: t.primaryMedium, rightColor: t.warning, link: '/outward' },
    { title: 'Sale Invoice', subtitle: 'Create invoice', leftIcon: <FileText size={18} />, rightIcon: <ClipboardList size={22} />, leftColor: t.primary, rightColor: t.violet, link: '/outward' },
    { title: 'Reports', subtitle: 'View reports', leftIcon: <BarChart3 size={18} />, rightIcon: <BarChart3 size={22} />, leftColor: t.primaryLight, rightColor: t.primaryLight, link: '/report/transaction' },
];

const txnMetaForTheme = (t) => ({
    'Sale Invoice': { icon: <Receipt size={18} />, iconColor: t.primary, iconBg: t.mintPale },
    Purchase: { icon: <FileText size={18} />, iconColor: t.warning, iconBg: t.warningLight || t.mintPale },
    default: { icon: <TrendingUp size={18} />, iconColor: t.primarySoft, iconBg: t.mint },
});

const DonutChart = ({ data: chartData, total, fallbackColor }) => {
    const safeData = chartData?.length ? chartData : [{ label: 'N/A', percentage: 100, count: 0, color: fallbackColor }];
    let cumulative = 0;
    const segments = safeData.map(item => {
        const start = cumulative;
        cumulative += item.percentage;
        return `${item.color} ${start}% ${cumulative}%`;
    });

    return (
        <div className="donut-chart-container">
            <div className="donut-chart" style={{ background: `conic-gradient(${segments.join(', ')})` }}>
                <div className="donut-hole">
                    <span className="donut-label">Total</span>
                    <span className="donut-value">{Number(total || 0).toLocaleString()}</span>
                </div>
            </div>
            <div className="donut-legend">
                {safeData.map((item, i) => (
                    <div key={i} className="legend-item">
                        <span className="legend-dot" style={{ backgroundColor: item.color }} />
                        <span className="legend-name">{item.label}</span>
                        <span className="legend-stats">{item.percentage}% ({item.count.toLocaleString()})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Dashboard = () => {
    const navigate = useNavigate();
    const theme = useThemeColors();
    const user = useAuthStore(state => state.user);
    const companyName = useAuthStore(state => state.companyName);
    const [taskInput, setTaskInput] = useState("");

    const { data: summaryRes, isLoading } = useFetchApi(
        'dashboardSummary',
        ENDPOINTS.dashboard.summary,
        {}
    );

    const summary = summaryRes?.Data;
    const widgets = summary?.widgets;
    const breakdowns = summary?.breakdowns;

    const statCards = useMemo(() => {
        if (!widgets) return [];
        return [
            {
                title: 'Total Stock Value',
                subtitle: `On hand: ${fmtCaratPcs(widgets.onHand?.carat, widgets.onHand?.pcs)}`,
                value: fmtMoney(widgets.onHand?.amount),
                icon: <Diamond size={22} strokeWidth={2} />,
                footerText: 'View Stock',
                link: '/inventory/my-inventory',
            },
            {
                title: 'Total In Lab',
                subtitle: 'Diamonds in laboratory',
                value: fmtCaratPcs(widgets.lab?.carat, widgets.lab?.pcs),
                icon: <FlaskConical size={22} strokeWidth={2} />,
                footerText: 'View Lab',
                link: '/transaction/gia-memo',
            },
            {
                title: 'Out On Memo / Consignment',
                subtitle: `${summary?.memoPercent || '0.00'}% of on-hand pcs`,
                value: fmtCaratPcs(widgets.memo?.carat, widgets.memo?.pcs),
                icon: <ClipboardList size={22} strokeWidth={2} />,
                footerText: 'View Memo',
                link: '/transaction/out-memo',
            },
            {
                title: 'Total Sale / Export',
                subtitle: 'Sale and export stock',
                value: fmtCompact(widgets.saleExport?.amount || widgets.saleExport?.carat),
                icon: <Tag size={22} strokeWidth={2} />,
                footerText: 'View Sales',
                link: '/transaction/sale',
            },
        ];
    }, [widgets, summary?.memoPercent]);

    const quickActions = useMemo(() => quickActionsForTheme(theme), [theme]);

    const duePayments = summary?.duePayments || [];
    const dueTotals = useMemo(() => duePayments.reduce(
        (acc, row) => ({
            entry: acc.entry + 1,
            total: acc.total + Number(row.total || 0),
            paid: acc.paid + Number(row.paid || 0),
            balance: acc.balance + Number(row.balance || 0),
        }),
        { entry: 0, total: 0, paid: 0, balance: 0 }
    ), [duePayments]);

    const recentTransactions = useMemo(() => {
        const TXN_META = txnMetaForTheme(theme);
        return (summary?.recentTransactions || []).map((txn) => {
        const meta = TXN_META[txn.type] || TXN_META.default;
        return {
            ...txn,
            ...meta,
            time: txn.date ? dayjs(txn.date).format('DD MMM YYYY') : '-',
            amount: txn.type === 'Purchase' ? fmtMoney(txn.amount) : fmtMoney(txn.amount),
            statusColor: theme.primaryMedium,
        };
    });
    }, [summary?.recentTransactions, theme]);

    const topParties = useMemo(() => (summary?.topParties || []).map((p) => ({
        name: p.name,
        amount: fmtMoney(p.amount),
    })), [summary?.topParties]);

    const taskHandler = () => {
        if (!taskInput.trim()) {
            toast.error("Validation Error", {
                description: "Please enter a task before adding.",
            });
            return;
        }
        toast.success("Task Added", {
            description: `New task: "${taskInput}" created successfully.`,
        });
        setTaskInput("");
    };

    const keyPressTaskHandler = (e) => {
        if (e.key === 'Enter') taskHandler();
    };

    return (
        <div className='dashboard-page'>
            <div className="dashboard-header">
                <div className="header-left">
                    <Title level={3} className="page-title">Inventory Dashboard</Title>
                    <Text className="welcome-text">
                        Welcome back, {companyName || user?.company_name || user?.username || user?.name || 'User'}
                    </Text>
                </div>
                <div className="header-right">
                    <span className="header-date">
                        <CalendarDays size={14} />
                        {dayjs().format('DD MMM, YYYY')}
                    </span>
                </div>
            </div>

            <div className='cardGroup dashboard-grid'>
                <Row gutter={[20, 20]} align="stretch">
                    {(statCards.length ? statCards : Array.from({ length: 4 })).map((item, index) => (
                        <Col xs={24} sm={12} lg={6} key={index} className="dashboard-grid__col">
                            {item?.title ? (
                                <StatSummaryCard
                                    {...item}
                                    variant={STAT_VARIANTS[index % STAT_VARIANTS.length]}
                                    isLoading={isLoading}
                                    onNavigate={navigate}
                                />
                            ) : (
                                <Card bordered={false} className="stat-card stat-card--loading" styles={{ body: { padding: 24, textAlign: 'center' } }}>
                                    <Spin />
                                </Card>
                            )}
                        </Col>
                    ))}
                </Row>
            </div>

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <AIInsightCard />
                </Col>
            </Row>

            <Row gutter={[20, 20]} className="middle-section dashboard-grid" align="stretch">
                <Col xs={24} xl={12} className="dashboard-grid__col">
                    <Card bordered={false} className="dashboard-card dashboard-card--luxury">
                        <div className="card-header">
                            <div className="card-title-group">
                                <span className="card-icon-badge card-icon-badge--danger">
                                    <Wallet size={18} />
                                </span>
                                <div>
                                    <span className="card-title-text">Sale Due Payments</span>
                                    <span className="card-subtitle-text">Outstanding within 7 days</span>
                                </div>
                            </div>
                            <a className="view-all-link" onClick={() => navigate('/report/outstanding')}>View All</a>
                        </div>
                        <div className="table-wrapper">
                            {isLoading ? (
                                <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
                            ) : duePayments.length > 0 ? (
                                <table className="inventory-table">
                                    <thead>
                                        <tr>
                                            {columns.map(col => (
                                                <th key={col.key} style={{ textAlign: col.align || 'left' }}>{col.title}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {duePayments.map((row, idx) => (
                                            <tr key={`${row.entry}-${idx}`}>
                                                <td>{row.party}</td>
                                                <td style={{ textAlign: 'center' }}>{row.entry}</td>
                                                <td style={{ textAlign: 'center' }}>{fmtMoney(row.total)}</td>
                                                <td style={{ textAlign: 'center' }}>{fmtMoney(row.paid)}</td>
                                                <td className="balance-cell" style={{ textAlign: 'center' }}>{fmtMoney(row.balance)}</td>
                                            </tr>
                                        ))}
                                        <tr className="total-row">
                                            <td><strong>Total</strong></td>
                                            <td style={{ textAlign: 'center' }}><strong>{dueTotals.entry}</strong></td>
                                            <td style={{ textAlign: 'center' }}><strong>{fmtMoney(dueTotals.total)}</strong></td>
                                            <td style={{ textAlign: 'center' }}><strong>{fmtMoney(dueTotals.paid)}</strong></td>
                                            <td className="balance-cell" style={{ textAlign: 'center' }}><strong>{fmtMoney(dueTotals.balance)}</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ padding: 16, color: theme.textMuted }}>No due payments in the next 7 days.</div>
                            )}
                        </div>
                    </Card>
                </Col>

                <Col xs={24} xl={12} className="dashboard-grid__col">
                    <Card bordered={false} className="dashboard-card dashboard-card--luxury">
                        <div className="card-header">
                            <div className="card-title-group">
                                <span className="card-icon-badge card-icon-badge--primary">
                                    <Activity size={18} />
                                </span>
                                <div>
                                    <span className="card-title-text">Recent Transactions</span>
                                    <span className="card-subtitle-text">Latest sale & purchase activity</span>
                                </div>
                            </div>
                            <div className="card-header-actions">
                                <a className="view-all-link" onClick={() => navigate('/accounting/account-transaction')}>View All</a>
                                <a className="add-new-link" onClick={() => navigate('/transaction/inward')}>
                                    <Plus size={14} /> Add New Transaction
                                </a>
                            </div>
                        </div>
                        <div className="transactions-list">
                            {isLoading ? (
                                <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>
                            ) : recentTransactions.length > 0 ? (
                                recentTransactions.map((txn, i) => (
                                    <div key={i} className="transaction-item">
                                        <div className="txn-icon" style={{ backgroundColor: txn.iconBg, color: txn.iconColor }}>
                                            {txn.icon}
                                        </div>
                                        <div className="txn-details">
                                            <span className="txn-type">{txn.type}</span>
                                            <span className="txn-ref">{txn.ref}</span>
                                        </div>
                                        <div className="txn-party">{txn.party}</div>
                                        <div className="txn-time">{txn.time}</div>
                                        <div className="txn-amount">{txn.amount}</div>
                                        <span className="txn-status" style={{
                                            color: txn.statusColor,
                                            backgroundColor: `${txn.statusColor}15`
                                        }}>
                                            {txn.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: 16, color: theme.textMuted }}>No recent transactions found.</div>
                            )}
                        </div>
                        <div className="input-container">
                            <Tooltip title="Click to add task" placement="top">
                                <Plus className='add-task' color={theme.primary} size={'18px'} onClick={taskHandler} />
                            </Tooltip>
                            <input
                                type="text"
                                name="taskData"
                                value={taskInput}
                                onChange={(e) => setTaskInput(e.target.value)}
                                onKeyDown={keyPressTaskHandler}
                                placeholder="Add a quick note..."
                            />
                        </div>
                    </Card>
                </Col>
            </Row>

            <div className="section-heading">
                <span className="section-heading__label">Analytics</span>
                <h2 className="section-heading__title">Stock Intelligence</h2>
            </div>

            <Row gutter={[20, 20]} className="charts-section dashboard-grid" align="stretch">
                <Col xs={24} sm={12} xl={6} className="dashboard-grid__col">
                    <Card bordered={false} className="dashboard-card chart-card chart-card--luxury">
                        <div className="card-header">
                            <span className="card-title-text">Stock by Shape</span>
                            <a className="view-report-link" onClick={() => navigate('/inventory/on-hand-stock')}>View Report</a>
                        </div>
                        <DonutChart data={breakdowns?.byShape} total={breakdowns?.total} fallbackColor={theme.muted} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6} className="dashboard-grid__col">
                    <Card bordered={false} className="dashboard-card chart-card chart-card--luxury">
                        <div className="card-header">
                            <span className="card-title-text">Stock by Color</span>
                            <a className="view-report-link" onClick={() => navigate('/inventory/on-hand-stock')}>View Report</a>
                        </div>
                        <DonutChart data={breakdowns?.byColor} total={breakdowns?.total} fallbackColor={theme.muted} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6} className="dashboard-grid__col">
                    <Card bordered={false} className="dashboard-card chart-card chart-card--luxury">
                        <div className="card-header">
                            <span className="card-title-text">Stock by Clarity</span>
                            <a className="view-report-link" onClick={() => navigate('/inventory/on-hand-stock')}>View Report</a>
                        </div>
                        <DonutChart data={breakdowns?.byClarity} total={breakdowns?.total} fallbackColor={theme.muted} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6} className="dashboard-grid__col">
                    <Card bordered={false} className="dashboard-card chart-card chart-card--luxury">
                        <div className="card-header">
                            <span className="card-title-text">Top Parties</span>
                            <a className="view-report-link" onClick={() => navigate('/report/outstanding')}>View Report</a>
                        </div>
                        <div className="top-parties-list">
                            {topParties.length ? topParties.map((party, i) => (
                                <div key={i} className="party-item">
                                    <span className="party-name">{party.name}</span>
                                    <span className="party-amount">{party.amount}</span>
                                </div>
                            )) : (
                                <div style={{ padding: 12, color: theme.textMuted }}>No party data yet.</div>
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>

            <div className="section-heading section-heading--compact">
                <span className="section-heading__label">Shortcuts</span>
                <h2 className="section-heading__title">Quick Actions</h2>
            </div>

            <div className="quick-actions-wrap">
                <div className="quick-actions">
                    {quickActions.map((action, i) => (
                        <div
                            key={i}
                            className={`quick-action-btn quick-action-btn--${i + 1}`}
                            onClick={() => navigate(action.link)}
                        >
                            <div className="quick-action-btn__shine" aria-hidden="true" />
                            <div className="action-left-icon" style={{ color: action.leftColor }}>
                                {action.leftIcon}
                            </div>
                            <div className="action-text">
                                <span className="action-title">{action.title}</span>
                                <span className="action-subtitle">{action.subtitle}</span>
                            </div>
                            <div className="action-right-icon" style={{ color: action.rightColor }}>
                                {action.rightIcon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
