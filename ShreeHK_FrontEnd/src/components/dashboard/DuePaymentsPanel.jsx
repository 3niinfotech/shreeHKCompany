import { Card, Tabs } from "antd";
import { Wallet } from "lucide-react";
import { SkeletonBlock } from "../common/skeleton";
import { dueStatusFromRow, fmtMoney } from "./dashboardFormatters";

const DUE_COLUMNS = [
  { title: "Party", key: "party", align: "left" },
  { title: "Entry", key: "entry", align: "center" },
  { title: "Total", key: "total", align: "center" },
  { title: "Paid", key: "paid", align: "center" },
  { title: "Balance", key: "balance", align: "center" },
  { title: "Status", key: "status", align: "center" },
];

const DueTableSkeleton = () => (
  <table className="inventory-table" aria-hidden="true">
    <thead>
      <tr>
        {DUE_COLUMNS.map((col) => (
          <th key={col.key} style={{ textAlign: col.align }}>{col.title}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {Array.from({ length: 5 }).map((_, rowIdx) => (
        <tr key={rowIdx}>
          {DUE_COLUMNS.map((col, colIdx) => (
            <td key={col.key} style={{ textAlign: col.align }}>
              <SkeletonBlock
                variant="text"
                width={`${58 + ((rowIdx + colIdx) % 4) * 8}%`}
                height={12}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const DueTable = ({ rows, totals, emptyText, isLoading }) => {
  if (isLoading) return <DueTableSkeleton />;
  if (!rows.length) {
    return <div className="card-empty-fill">{emptyText}</div>;
  }

  return (
    <table className="inventory-table">
      <thead>
        <tr>
          {DUE_COLUMNS.map((col) => (
            <th key={col.key} style={{ textAlign: col.align }}>{col.title}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => {
          const status = dueStatusFromRow(row);
          return (
            <tr key={`${row.entry}-${idx}`}>
              <td>{row.party}</td>
              <td style={{ textAlign: "center" }}>{row.entry}</td>
              <td style={{ textAlign: "center" }}>{fmtMoney(row.total)}</td>
              <td style={{ textAlign: "center" }}>{fmtMoney(row.paid)}</td>
              <td className="balance-cell" style={{ textAlign: "center" }}>
                {fmtMoney(row.balance)}
              </td>
              <td style={{ textAlign: "center" }}>
                <span className={`due-status due-status--${status.toLowerCase()}`}>
                  {status}
                </span>
              </td>
            </tr>
          );
        })}
        <tr className="total-row">
          <td><strong>Total</strong></td>
          <td style={{ textAlign: "center" }}><strong>{totals.entry}</strong></td>
          <td style={{ textAlign: "center" }}><strong>{fmtMoney(totals.total)}</strong></td>
          <td style={{ textAlign: "center" }}><strong>{fmtMoney(totals.paid)}</strong></td>
          <td className="balance-cell" style={{ textAlign: "center" }}>
            <strong>{fmtMoney(totals.balance)}</strong>
          </td>
          <td />
        </tr>
      </tbody>
    </table>
  );
};

const DuePaymentsPanel = ({
  duePayments,
  purchaseDuePayments,
  dueTotals,
  purchaseDueTotals,
  isLoading,
  onViewAll,
}) => (
  <Card bordered={false} className="dashboard-card dashboard-card--luxury due-payments-card dashboard-fill-card">
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
      <a className="view-all-link" onClick={onViewAll}>View All</a>
    </div>
    <Tabs
      defaultActiveKey="sale"
      items={[
        {
          key: "sale",
          label: "Sale Due Payments",
          children: (
            <div className="table-wrapper due-payments-table-wrapper">
              <DueTable
                rows={duePayments}
                totals={dueTotals}
                isLoading={isLoading}
                emptyText="No due payments in the next 7 days."
              />
            </div>
          ),
        },
        {
          key: "purchase",
          label: "Purchase Due Payments",
          children: (
            <div className="table-wrapper due-payments-table-wrapper">
              <DueTable
                rows={purchaseDuePayments}
                totals={purchaseDueTotals}
                isLoading={isLoading}
                emptyText="No purchase due payments in the next 7 days."
              />
            </div>
          ),
        },
      ]}
    />
  </Card>
);

export default DuePaymentsPanel;
