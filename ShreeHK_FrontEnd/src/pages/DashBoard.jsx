import { Row, Col } from "antd";
import {
  Diamond,
  Plus,
  Receipt,
  FileText,
  FlaskConical,
  TrendingUp,
  Send,
  ClipboardList,
  BarChart3,
  Tag as TagIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { useFetchApi } from "../api/ApiFunction";
import { ENDPOINTS } from "../constants/endpoints";
import useThemeColors from "../hooks/useThemeColors";
import { SkeletonStatCard } from "../components/common/skeleton";
import KpiCard from "../components/dashboard/KpiCard";
import StockValueTrendCard from "../components/dashboard/StockValueTrendCard";
import FlowBarCard from "../components/dashboard/FlowBarCard";
import DuePaymentsPanel from "../components/dashboard/DuePaymentsPanel";
import RecentTransactionsPanel from "../components/dashboard/RecentTransactionsPanel";
import QuickNotesCard from "../components/dashboard/QuickNotesCard";
import TopPartiesPanel, { StockBreakdownCard } from "../components/dashboard/TopPartiesPanel";
import QuickActionsBar from "../components/dashboard/QuickActionsBar";
import { fmtCaratPcs, fmtMoney } from "../components/dashboard/dashboardFormatters";
import "../assets/scss/pages/dashboard.scss";

const STAT_VARIANTS = ["emerald", "sapphire", "amber", "violet"];

const quickActionsForTheme = (t) => [
  { title: "Add Inventory", subtitle: "Add new stock", leftIcon: <Plus size={18} />, leftColor: t.primary, link: "/inventory/my-inventory" },
  { title: "Lab Entry", subtitle: "Send to lab", leftIcon: <Send size={18} />, leftColor: t.danger, link: "/transaction/gia-memo" },
  { title: "On Memo", subtitle: "Send on memo", leftIcon: <ClipboardList size={18} />, leftColor: t.warning, link: "/outward" },
  { title: "Sale Invoice", subtitle: "Create invoice", leftIcon: <FileText size={18} />, leftColor: t.primary, link: "/outward" },
  { title: "Reports", subtitle: "View reports", leftIcon: <BarChart3 size={18} />, leftColor: t.info, link: "/report/transaction" },
];

const txnMetaForTheme = (t) => ({
  "Sale Invoice": { icon: <Receipt size={18} />, iconColor: t.primary, iconBg: t.mintPale },
  Purchase: { icon: <FileText size={18} />, iconColor: t.warning, iconBg: t.warningLight || t.mintPale },
  default: { icon: <TrendingUp size={18} />, iconColor: t.primarySoft, iconBg: t.mint },
});

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useThemeColors();
  const [trendRange, setTrendRange] = useState("1m");

  const { data: summaryRes, isLoading } = useFetchApi(
    "dashboardSummary",
    ENDPOINTS.dashboard.summary,
    {}
  );
  const { data: trendsRes, isLoading: trendsLoading } = useFetchApi(
    "dashboardTrends",
    ENDPOINTS.dashboard.trends,
    { range: trendRange }
  );

  const summary = summaryRes?.Data;
  const widgets = summary?.widgets;
  const breakdowns = summary?.breakdowns;
  const duePayments = summary?.duePayments || [];
  const purchaseDuePayments = summary?.purchaseDuePayments || [];
  const trends = trendsRes?.Data;
  const stockSeries = trends?.stockValueSeries;
  const saleSeries = trends?.saleSeries || [];
  const labCaratSeries = trends?.labCaratSeries;
  const memoCaratSeries = trends?.memoCaratSeries;
  const usingStockFallback = !Array.isArray(stockSeries) || stockSeries.length < 2;
  const donutColors = [theme.success, theme.violet, theme.info, theme.warning, theme.danger];

  const statCards = useMemo(() => {
    if (!widgets) return [];
    return [
      {
        title: "Total Stock Value",
        subtitle: `On hand: ${fmtCaratPcs(widgets.onHand?.carat, widgets.onHand?.pcs)}`,
        value: fmtMoney(widgets.onHand?.amount),
        icon: <Diamond size={22} strokeWidth={2} />,
        footerText: "View Stock",
        link: "/inventory/my-inventory",
        trend: trends?.compare?.stock?.changePct != null
          ? { changePct: trends.compare.stock.changePct }
          : null,
        sparkline: usingStockFallback ? null : stockSeries,
        sparkColor: theme.primary,
      },
      {
        title: "Total In Lab",
        subtitle: "Diamonds in laboratory",
        value: fmtCaratPcs(widgets.lab?.carat, widgets.lab?.pcs),
        icon: <FlaskConical size={22} strokeWidth={2} />,
        footerText: "View Lab",
        link: "/transaction/gia-memo",
        trend: trends?.compare?.labCarat?.changePct != null
          ? { changePct: trends.compare.labCarat.changePct }
          : null,
        sparkline: labCaratSeries,
        sparkColor: theme.info,
        sparkKey: "carat",
      },
      {
        title: "Out On Memo / Consignment",
        subtitle: `${summary?.memoPercent || "0.00"}% of on-hand pcs`,
        value: fmtCaratPcs(widgets.memo?.carat, widgets.memo?.pcs),
        icon: <ClipboardList size={22} strokeWidth={2} />,
        footerText: "View Memo",
        link: "/transaction/out-memo",
        trend: trends?.compare?.memoCarat?.changePct != null
          ? { changePct: trends.compare.memoCarat.changePct }
          : null,
        sparkline: memoCaratSeries,
        sparkColor: theme.warning,
        sparkKey: "carat",
      },
      {
        title: "Total Sale / Export",
        subtitle: `${Number(widgets.saleExportLedger?.count || 0).toLocaleString()} sale / export invoices`,
        value: fmtMoney(widgets.saleExportLedger?.amount),
        icon: <TagIcon size={22} strokeWidth={2} />,
        footerText: "View Sales",
        link: "/transaction/sale",
        trend: trends?.compare?.sale
          ? { changePct: trends.compare.sale.changePct }
          : null,
        sparkline: saleSeries,
        sparkColor: theme.primaryMedium,
      },
    ];
  }, [
    widgets,
    summary?.memoPercent,
    trends,
    usingStockFallback,
    stockSeries,
    saleSeries,
    labCaratSeries,
    memoCaratSeries,
    theme.primary,
    theme.primaryMedium,
    theme.info,
    theme.warning,
  ]);

  const quickActions = useMemo(() => quickActionsForTheme(theme), [theme]);

  const dueTotals = useMemo(
    () =>
      duePayments.reduce(
        (acc, row) => ({
          entry: acc.entry + 1,
          total: acc.total + Number(row.total || 0),
          paid: acc.paid + Number(row.paid || 0),
          balance: acc.balance + Number(row.balance || 0),
        }),
        { entry: 0, total: 0, paid: 0, balance: 0 }
      ),
    [duePayments]
  );

  const purchaseDueTotals = useMemo(
    () =>
      purchaseDuePayments.reduce(
        (acc, row) => ({
          entry: acc.entry + 1,
          total: acc.total + Number(row.total || 0),
          paid: acc.paid + Number(row.paid || 0),
          balance: acc.balance + Number(row.balance || 0),
        }),
        { entry: 0, total: 0, paid: 0, balance: 0 }
      ),
    [purchaseDuePayments]
  );

  const recentTransactions = useMemo(() => {
    const TXN_META = txnMetaForTheme(theme);
    return (summary?.recentTransactions || []).map((txn) => {
      const meta = TXN_META[txn.type] || TXN_META.default;
      return {
        ...txn,
        ...meta,
        time: txn.date ? dayjs(txn.date).format("DD MMM YYYY") : "-",
        amount: fmtMoney(txn.amount),
        statusColor: theme.primaryMedium,
      };
    });
  }, [summary?.recentTransactions, theme]);

  const topParties = useMemo(
    () => (summary?.topParties || []).map((p) => ({
      name: p.name,
      amount: fmtMoney(p.amount),
    })),
    [summary?.topParties]
  );

  const openOnHand = () => navigate("/inventory/on-hand-stock");

  return (
    <div className="dashboard-page">
      <div className="cardGroup dashboard-grid">
        <Row gutter={[10, 10]} align="stretch">
          {(statCards.length ? statCards : Array.from({ length: 4 })).map((item, index) => (
            <Col xs={24} sm={12} lg={6} key={item?.title || index} className="dashboard-grid__col">
              {item?.title ? (
                <KpiCard
                  {...item}
                  variant={STAT_VARIANTS[index % STAT_VARIANTS.length]}
                  isLoading={isLoading}
                  onNavigate={navigate}
                />
              ) : (
                <SkeletonStatCard />
              )}
            </Col>
          ))}
        </Row>
      </div>

      <Row gutter={[10, 10]} className="charts-section dashboard-grid" align="stretch">
        <Col xs={24} lg={12} xl={9} className="dashboard-grid__col">
          <StockValueTrendCard
            series={stockSeries}
            fallbackSeries={saleSeries}
            usingFallback={usingStockFallback}
            isLoading={trendsLoading}
            range={trendRange}
            onRangeChange={setTrendRange}
            color={theme.primary}
            muted={theme.muted}
          />
        </Col>
        <Col xs={24} lg={12} xl={9} className="dashboard-grid__col">
          <FlowBarCard
            data={trends?.flow}
            isLoading={trendsLoading}
            range={trendRange}
            onRangeChange={setTrendRange}
            saleColor={theme.primary}
            purchaseColor={theme.info}
            memoColor={theme.warning}
            muted={theme.muted}
          />
        </Col>
        <Col xs={24} lg={24} xl={6} className="dashboard-grid__col">
          <TopPartiesPanel
            parties={topParties}
            isLoading={isLoading}
            onViewReport={() => navigate("/report/outstanding")}
            textMuted={theme.textMuted}
          />
        </Col>
      </Row>

      <Row gutter={[20, 20]} className="middle-section dashboard-grid" align="stretch">
        <Col xs={24} lg={12} xl={8} className="dashboard-grid__col">
          <DuePaymentsPanel
            duePayments={duePayments}
            purchaseDuePayments={purchaseDuePayments}
            dueTotals={dueTotals}
            purchaseDueTotals={purchaseDueTotals}
            isLoading={isLoading}
            onViewAll={() => navigate("/report/outstanding", {
              state: {
                dateRange: [dayjs().format("YYYY-MM-DD"), dayjs().add(7, "day").format("YYYY-MM-DD")],
              },
            })}
          />
        </Col>
        <Col xs={24} lg={12} xl={8} className="dashboard-grid__col">
          <RecentTransactionsPanel
            transactions={recentTransactions}
            isLoading={isLoading}
            onViewAll={() => navigate("/accounting/account-transaction")}
            onAddNew={() => navigate("/transaction/inward")}
          />
        </Col>
        <Col xs={24} lg={24} xl={8} className="dashboard-grid__col">
          <QuickNotesCard />
        </Col>
      </Row>

      <div className="section-heading">
        <span className="section-heading__label">Analytics</span>
        <h2 className="section-heading__title">Stock Intelligence</h2>
      </div>

      <Row gutter={[20, 20]} className="charts-section dashboard-grid" align="stretch">
        <Col xs={24} sm={12} xl={6} className="dashboard-grid__col">
          <StockBreakdownCard
            title="Stock by Shape"
            data={breakdowns?.byShape}
            total={breakdowns?.total}
            isLoading={isLoading}
            onViewReport={openOnHand}
            fallbackColor={theme.muted}
            colors={donutColors}
          />
        </Col>
        <Col xs={24} sm={12} xl={6} className="dashboard-grid__col">
          <StockBreakdownCard
            title="Stock by Color"
            data={breakdowns?.byColor}
            total={breakdowns?.total}
            isLoading={isLoading}
            onViewReport={openOnHand}
            fallbackColor={theme.muted}
            colors={donutColors}
          />
        </Col>
        <Col xs={24} sm={12} xl={6} className="dashboard-grid__col">
          <StockBreakdownCard
            title="Stock by Clarity"
            data={breakdowns?.byClarity}
            total={breakdowns?.total}
            isLoading={isLoading}
            onViewReport={openOnHand}
            fallbackColor={theme.muted}
            colors={donutColors}
          />
        </Col>
        <Col xs={24} sm={12} xl={6} className="dashboard-grid__col">
          <StockBreakdownCard
            title="Stock by Type"
            data={breakdowns?.byType}
            total={breakdowns?.total}
            isLoading={isLoading}
            onViewReport={openOnHand}
            fallbackColor={theme.muted}
            colors={donutColors}
          />
        </Col>
      </Row>

      <div className="section-heading section-heading--compact">
        <span className="section-heading__label">Shortcuts</span>
        <h2 className="section-heading__title">Quick Actions</h2>
      </div>

      <QuickActionsBar actions={quickActions} onNavigate={navigate} />
    </div>
  );
};

export default Dashboard;
