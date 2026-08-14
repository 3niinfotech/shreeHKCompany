import { Card } from "antd";
import { SkeletonChart, SkeletonList } from "../common/skeleton";
import BreakdownDonut from "./BreakdownDonut";

const TopPartiesPanel = ({ parties, isLoading, onViewReport, textMuted }) => (
  <Card bordered={false} className="dashboard-card chart-card chart-card--luxury">
    <div className="card-header">
      <span className="card-title-text">Top Parties</span>
      <a className="view-report-link" onClick={onViewReport}>View Report</a>
    </div>
    <div className="top-parties-list">
      {isLoading ? (
        <SkeletonList rows={5} withAvatar={false} />
      ) : parties.length ? (
        parties.map((party, i) => (
          <div key={`${party.name}-${i}`} className="party-item">
            <span className="party-rank">{String(i + 1).padStart(2, "0")}</span>
            <span className="party-name">{party.name}</span>
            <span className="party-amount">{party.amount}</span>
          </div>
        ))
      ) : (
        <div style={{ padding: 12, color: textMuted }}>No party data yet.</div>
      )}
    </div>
  </Card>
);

export const StockBreakdownCard = ({
  title,
  data,
  total,
  isLoading,
  onViewReport,
  fallbackColor,
  colors,
}) => (
  <Card bordered={false} className="dashboard-card chart-card chart-card--luxury">
    <div className="card-header">
      <span className="card-title-text">{title}</span>
      <a className="view-report-link" onClick={onViewReport}>View Report</a>
    </div>
    {isLoading ? (
      <div style={{ padding: "12px 0" }}><SkeletonChart height={180} /></div>
    ) : (
      <BreakdownDonut
        data={data}
        total={total}
        fallbackColor={fallbackColor}
        colors={colors}
      />
    )}
  </Card>
);

export default TopPartiesPanel;
