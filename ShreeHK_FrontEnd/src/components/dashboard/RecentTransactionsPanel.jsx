import { Card } from "antd";
import { Activity, Plus } from "lucide-react";
import { SkeletonList } from "../common/skeleton";

const RecentTransactionsPanel = ({
  transactions,
  isLoading,
  onViewAll,
  onAddNew,
}) => (
  <Card bordered={false} className="dashboard-card dashboard-card--luxury recent-txn-card dashboard-fill-card">
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
        <a className="view-all-link" onClick={onViewAll}>View All</a>
        <a className="add-new-link" onClick={onAddNew}>
          <Plus size={14} /> Add New
        </a>
      </div>
    </div>
    <div className="transactions-list">
      {isLoading ? (
        <div style={{ padding: "8px 4px" }}>
          <SkeletonList rows={5} withAvatar />
        </div>
      ) : transactions.length > 0 ? (
        transactions.map((txn, i) => (
          <div key={`${txn.ref}-${i}`} className="transaction-item">
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
            <span
              className="txn-status"
              style={{
                color: txn.statusColor,
                backgroundColor: `${txn.statusColor}15`,
              }}
            >
              {txn.status}
            </span>
          </div>
        ))
      ) : (
        <div className="card-empty-fill">No recent transactions found.</div>
      )}
    </div>
  </Card>
);

export default RecentTransactionsPanel;
