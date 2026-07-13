import { useCallback, useMemo, useRef, useState } from "react";
import styles from "../../assets/scss/components/rapaport/rapaportPanel.module.scss";

const LINE_COLOR = "#ffffff";
const GRID_COLOR = "rgba(255, 255, 255, 0.12)";
const AXIS_COLOR = "rgba(255, 255, 255, 0.75)";
const TIME_COLOR = "rgba(255, 255, 255, 0.6)";
const CROSSHAIR_COLOR = "rgba(255, 255, 255, 0.4)";

const pad = { top: 16, right: 42, bottom: 28, left: 8 };

const formatAxisPrice = (value) =>
  Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatTooltipPrice = (value) =>
  `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatTimeLabel = (time) => {
  if (typeof time === "string") {
    return time.slice(5, 16).replace("T", " ");
  }
  return new Date(time * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildSmoothPath = (coords) => {
  if (!coords.length) return "";
  if (coords.length === 1) {
    return `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  }

  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
};

const RapaportLiveChart = ({
  points = [],
  changePct = 0,
  height = 260,
  dailyHigh,
  dailyLow,
}) => {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const chart = useMemo(() => {
    const data = (points || [])
      .filter((p) => p?.time != null && p?.value != null)
      .map((p) => ({ time: p.time, value: Number(p.value) }));

    if (!data.length) {
      return null;
    }

    const values = data.map((d) => d.value);
    let min = Math.min(...values);
    let max = Math.max(...values);

    if (dailyHigh != null) max = Math.max(max, Number(dailyHigh));
    if (dailyLow != null) min = Math.min(min, Number(dailyLow));

    const padding = (max - min) * 0.08 || 1;
    min -= padding;
    max += padding;
    const range = max - min || 1;

    const innerW = 100 - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const coords = data.map((d, i) => {
      const x = pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
      const y = pad.top + innerH - ((d.value - min) / range) * innerH;
      return { x, y, value: d.value, time: d.time };
    });

    const linePath = buildSmoothPath(coords);
    const areaPath = coords.length
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} ${(pad.top + innerH).toFixed(2)} L ${coords[0].x.toFixed(2)} ${(pad.top + innerH).toFixed(2)} Z`
      : "";

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const value = max - ratio * (max - min);
      const y = pad.top + innerH * ratio;
      return { y, value, label: formatAxisPrice(value) };
    });

    const labelCount = Math.min(5, data.length);
    const xLabels = [];
    for (let i = 0; i < labelCount; i += 1) {
      const idx = labelCount === 1 ? 0 : Math.round((i / (labelCount - 1)) * (data.length - 1));
      const c = coords[idx];
      xLabels.push({ x: c.x, label: formatTimeLabel(data[idx].time) });
    }

    const toY = (value) => pad.top + innerH - ((Number(value) - min) / range) * innerH;

    return {
      coords,
      linePath,
      areaPath,
      yTicks,
      xLabels,
      min,
      max,
      innerH,
      highY: dailyHigh != null ? toY(dailyHigh) : null,
      lowY: dailyLow != null ? toY(dailyLow) : null,
      last: coords[coords.length - 1],
    };
  }, [points, height, dailyHigh, dailyLow]);

  const handleMouseMove = useCallback(
    (e) => {
      if (!chart?.coords?.length || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * 100;
      let nearest = chart.coords[0];
      let minDist = Math.abs(relX - nearest.x);

      chart.coords.forEach((c) => {
        const dist = Math.abs(relX - c.x);
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      });

      setHover(nearest);
    },
    [chart]
  );

  const handleMouseLeave = useCallback(() => setHover(null), []);

  if (!chart) {
    return <div className={styles.chartWrap} style={{ height }} />;
  }

  const active = hover || chart.last;
  const tooltipX = Math.min(Math.max(active.x, 18), 82);

  return (
    <div className={styles.chartWrap} style={{ height }}>
      <svg
        ref={svgRef}
        className={styles.chartCanvas}
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Rapaport price chart"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="rapaportArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id="rapaportGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="#ffffff" floodOpacity="0.55" />
          </filter>
        </defs>

        {chart.yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={pad.left}
              y1={tick.y}
              x2={100 - pad.right}
              y2={tick.y}
              stroke={GRID_COLOR}
              strokeWidth="0.25"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={100 - pad.right + 2}
              y={tick.y + 1.2}
              fill={AXIS_COLOR}
              fontSize="2.8"
              dominantBaseline="middle"
              style={{ pointerEvents: "none" }}
            >
              {tick.label}
            </text>
          </g>
        ))}

        {chart.highY != null ? (
          <line
            x1={pad.left}
            y1={chart.highY}
            x2={100 - pad.right}
            y2={chart.highY}
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="0.35"
            strokeDasharray="1.5 1.5"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {chart.lowY != null ? (
          <line
            x1={pad.left}
            y1={chart.lowY}
            x2={100 - pad.right}
            y2={chart.lowY}
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="0.35"
            strokeDasharray="1.5 1.5"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {chart.areaPath ? <path d={chart.areaPath} fill="url(#rapaportArea)" stroke="none" /> : null}

        <path
          d={chart.linePath}
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth="1.4"
          filter="url(#rapaportGlow)"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hover ? (
          <>
            <line
              x1={hover.x}
              y1={pad.top}
              x2={hover.x}
              y2={pad.top + chart.innerH}
              stroke={CROSSHAIR_COLOR}
              strokeWidth="0.35"
              strokeDasharray="1.2 1.2"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={pad.left}
              y1={hover.y}
              x2={100 - pad.right}
              y2={hover.y}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="0.35"
              strokeDasharray="1.2 1.2"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hover.x}
              cy={hover.y}
              r="2.2"
              fill={LINE_COLOR}
              stroke="rgba(15, 23, 42, 0.55)"
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          <circle
            cx={chart.last.x}
            cy={chart.last.y}
            r="2"
            fill={LINE_COLOR}
            stroke="rgba(15, 23, 42, 0.55)"
            strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          >
            <animate attributeName="r" values="2;2.8;2" dur="2s" repeatCount="indefinite" />
          </circle>
        )}

        {chart.xLabels.map((item) => (
          <text
            key={`${item.x}-${item.label}`}
            x={item.x}
            y={height - 8}
            textAnchor="middle"
            fill={TIME_COLOR}
            fontSize="2.6"
            style={{ pointerEvents: "none" }}
          >
            {item.label}
          </text>
        ))}
      </svg>

      {active ? (
        <div
          className={styles.chartTooltip}
          style={{
            left: `${tooltipX}%`,
            top: `${(active.y / height) * 100 - 14}%`,
          }}
        >
          <span className={styles.chartTooltipPrice}>{formatTooltipPrice(active.value)}</span>
          <span className={styles.chartTooltipTime}>{formatTimeLabel(active.time)}</span>
        </div>
      ) : null}
    </div>
  );
};

export default RapaportLiveChart;
