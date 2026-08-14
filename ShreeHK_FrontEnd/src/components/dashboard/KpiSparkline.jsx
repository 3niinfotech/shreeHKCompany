import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
} from "recharts";

/**
 * Recharts defaults an area chart to a [0, dataMax] domain, which renders a
 * near-constant series as a solid block. Padding the domain around the real
 * min/max keeps a flat series looking flat and keeps spikes off the edges.
 */
const buildDomain = (values) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span === 0) {
    const pad = Math.abs(max) * 0.2 || 1;
    return [min - pad, max + pad];
  }
  return [min - span * 0.18, max + span * 0.22];
};

const KpiSparkline = ({
  data = [],
  color,
  id = "kpi",
  height = 40,
  dataKey = "amount",
}) => {
  const points = (Array.isArray(data) ? data : [])
    .filter((row) => row != null && Number.isFinite(Number(row[dataKey])))
    .map((row) => ({ period: row.period, value: Number(row[dataKey]) }));

  if (points.length < 2) return null;

  const [low, high] = buildDomain(points.map((row) => row.value));
  const gradientId = `kpiSpark-${id}`;
  const lastIndex = points.length - 1;

  const renderDot = ({ cx, cy, index }) => {
    if (index !== lastIndex || !Number.isFinite(cx) || !Number.isFinite(cy)) {
      return null;
    }
    return (
      <circle
        key={`${gradientId}-dot`}
        cx={cx}
        cy={cy}
        r={2.8}
        fill={color}
        stroke="#fff"
        strokeWidth={1.6}
      />
    );
  };

  return (
    <div className="kpi-sparkline" aria-hidden="true">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={points} margin={{ top: 4, right: 3, left: 0, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[low, high]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            fill={`url(#${gradientId})`}
            baseValue={low}
            isAnimationActive={false}
            dot={renderDot}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default KpiSparkline;
