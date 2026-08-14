import { Card } from "antd";
import { ChevronRight } from "lucide-react";
import { SkeletonBlock } from "../common/skeleton";
import KpiSparkline from "./KpiSparkline";

const KpiCard = ({
  title,
  subtitle,
  value,
  icon,
  footerText,
  link,
  isLoading,
  onNavigate,
  variant = "emerald",
  trend,
  sparkline,
  sparkColor,
  sparkKey,
}) => {
  const changePct = trend?.changePct;
  const hasTrend = changePct != null && Number.isFinite(Number(changePct));
  const isUp = Number(changePct) >= 0;

  return (
    <Card bordered={false} className={`stat-card stat-card--${variant}`} styles={{ body: { height: "100%" } }}>
      <div className="stat-card-shine" aria-hidden="true" />
      <div className="stat-card-body">
        <div className="stat-card-top">
          <div className="stat-icon">{icon}</div>
          <div className="stat-info">
            <p className="stat-title">{title}</p>
          </div>
        </div>
        <h3 className="stat-value">
          {isLoading ? <SkeletonBlock variant="heading" width={88} height={24} shape="round" /> : value}
        </h3>
        <p className="stat-subtitle">{subtitle}</p>
        {(hasTrend || sparkline?.length > 1) && (
          <div className="stat-trend-row">
            {hasTrend ? (
              <span className={`stat-trend ${isUp ? "stat-trend--up" : "stat-trend--down"}`}>
                {isUp ? "▲" : "▼"} {Math.abs(Number(changePct)).toFixed(1)}% vs last period
              </span>
            ) : (
              <span className="stat-trend-spacer" />
            )}
            {sparkline?.length > 1 ? (
              <KpiSparkline data={sparkline} color={sparkColor} id={variant} dataKey={sparkKey} />
            ) : null}
          </div>
        )}
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
};

export default KpiCard;
