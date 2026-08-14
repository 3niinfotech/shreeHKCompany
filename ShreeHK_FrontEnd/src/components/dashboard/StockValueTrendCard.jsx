import { Card, Select } from "antd";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import dayjs from "dayjs";
import { SkeletonChart } from "../common/skeleton";
import { fmtAxisAmount, fmtMoney, RANGE_OPTIONS } from "./dashboardFormatters";

const StockValueTrendCard = ({
  series,
  fallbackSeries,
  usingFallback,
  isLoading,
  range,
  onRangeChange,
  color,
  muted,
}) => {
  const data = (series?.length ? series : fallbackSeries) || [];
  const title = usingFallback ? "Sale Value Trend" : "Stock Value Trend";

  return (
    <Card bordered={false} className="dashboard-card dashboard-card--luxury chart-card chart-card--luxury chart-card--wide">
      <div className="card-header">
        <div className="card-title-group">
          <div>
            <span className="card-title-text">{title}</span>
            <span className="card-subtitle-text">
              {usingFallback ? "Daily sale & export totals" : "On-hand value reconstructed from stock movement"}
            </span>
          </div>
        </div>
        <Select
          size="small"
          value={range}
          onChange={onRangeChange}
          options={RANGE_OPTIONS}
          className="chart-range-select"
          popupMatchSelectWidth={false}
        />
      </div>
      {isLoading ? (
        <div style={{ padding: "12px 0" }}>
          <SkeletonChart height={220} />
        </div>
      ) : data.length ? (
        <div className="chart-plot">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="stockTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={muted} vertical={false} />
              <XAxis
                dataKey="period"
                tickFormatter={(value) => dayjs(value).format("DD MMM")}
                tick={{ fontSize: 11, fill: muted }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={fmtAxisAmount}
                tick={{ fontSize: 11, fill: muted }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                formatter={(value) => [fmtMoney(value), usingFallback ? "Sales" : "Stock value"]}
                labelFormatter={(label) => dayjs(label).format("DD MMM YYYY")}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={color}
                strokeWidth={2}
                fill="url(#stockTrendFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card-empty-fill">No trend data for this period.</div>
      )}
    </Card>
  );
};

export default StockValueTrendCard;
