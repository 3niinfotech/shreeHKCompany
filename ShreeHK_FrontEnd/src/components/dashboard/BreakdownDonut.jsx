import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const BreakdownDonut = ({ data, total, fallbackColor, colors = [] }) => {
  const safeData = data?.length
    ? data
    : [{ label: "N/A", percentage: 100, count: 0, color: fallbackColor }];

  const chartData = safeData.map((item, index) => ({
    ...item,
    value: Number(item.count) || 0,
    fill: item.color || colors[index % colors.length] || fallbackColor,
  }));

  const centerTotal = Number(total || 0);

  return (
    <div className="donut-chart-container">
      <div className="donut-chart donut-chart--recharts">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={chartData.length > 1 ? 1.5 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`${entry.label}-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-hole donut-hole--overlay">
          <span className="donut-label">Total</span>
          <span className="donut-value">{centerTotal.toLocaleString()}</span>
        </div>
      </div>
      <div className="donut-legend">
        {safeData.map((item, i) => (
          <div key={`${item.label}-${i}`} className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: item.color || colors[i % colors.length] || fallbackColor }}
            />
            <span className="legend-name">{item.label}</span>
            <span className="legend-stats">
              {item.percentage}% ({Number(item.count || 0).toLocaleString()})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BreakdownDonut;
