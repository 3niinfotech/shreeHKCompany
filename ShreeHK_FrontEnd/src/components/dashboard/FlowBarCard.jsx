import { Card, Select } from "antd";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import { SkeletonChart } from "../common/skeleton";
import { fmtAxisAmount, fmtMoney, RANGE_OPTIONS } from "./dashboardFormatters";

const FlowBarCard = ({
  data,
  isLoading,
  range,
  onRangeChange,
  saleColor,
  purchaseColor,
  memoColor,
  muted,
}) => {
  const rows = Array.isArray(data) ? data : [];

  return (
    <Card bordered={false} className="dashboard-card dashboard-card--luxury chart-card chart-card--luxury chart-card--wide">
      <div className="card-header">
        <div className="card-title-group">
          <div>
            <span className="card-title-text">Sales vs Purchase vs Out Memo</span>
            <span className="card-subtitle-text">Transaction amounts for the selected period</span>
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
      ) : rows.length ? (
        <div className="chart-plot">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
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
                formatter={(value, name) => [fmtMoney(value), name]}
                labelFormatter={(label) => dayjs(label).format("DD MMM YYYY")}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="purchase" name="Purchase" fill={purchaseColor} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
              <Bar dataKey="sale" name="Sale" fill={saleColor} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
              <Bar dataKey="memo" name="Out Memo" fill={memoColor} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card-empty-fill">No transaction flow for this period.</div>
      )}
    </Card>
  );
};

export default FlowBarCard;
