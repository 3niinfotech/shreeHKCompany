import React, { useState, useMemo } from "react";
import { InputNumber, Slider, Tag, Button, Space, Typography } from "antd";
import { CalculatorOutlined, CopyOutlined, CheckOutlined } from "@ant-design/icons";
import { toastSuccess } from "../../utils/toastNotify";

const { Text } = Typography;

const DISCOUNT_PRESETS = [-50, -40, -35, -30, -25, -20, -15, -10, 0, 5];

const RapCalculatorWidget = () => {
  const [carat, setCarat] = useState(1.0);
  const [rapPrice, setRapPrice] = useState(5000);
  const [discountPct, setDiscountPct] = useState(-30);
  const [copied, setCopied] = useState(false);

  // Computed Values
  const netPricePerCarat = useMemo(() => {
    const rap = Number(rapPrice) || 0;
    const disc = Number(discountPct) || 0;
    return Math.max(0, rap * (1 + disc / 100));
  }, [rapPrice, discountPct]);

  const totalAmount = useMemo(() => {
    const c = Number(carat) || 0;
    return c * netPricePerCarat;
  }, [carat, netPricePerCarat]);

  const handleCopy = async () => {
    const summary = `💎 Diamond Valuation: ${carat} ct @ Rap $${rapPrice} (${discountPct >= 0 ? "+" : ""}${discountPct}%) = $${netPricePerCarat.toFixed(2)}/ct | Total: $${totalAmount.toFixed(2)}`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toastSuccess("Calculated diamond price copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div style={{ padding: "12px 14px", background: "var(--color-card-bg, #ffffff)", borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13.5 }}>
          <CalculatorOutlined style={{ color: "var(--color-primary, #1e3a8a)" }} />
          <span>Rap & Discount Calculator</span>
        </div>
        <Button
          size="small"
          icon={copied ? <CheckOutlined style={{ color: "#16a34a" }} /> : <CopyOutlined />}
          onClick={handleCopy}
        >
          {copied ? "Copied" : "Copy Quote"}
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <Text style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>Carat Weight</Text>
          <InputNumber
            style={{ width: "100%", marginTop: 3 }}
            min={0.01}
            max={500}
            step={0.01}
            value={carat}
            onChange={(v) => setCarat(v ?? 0)}
            suffix="ct"
          />
        </div>
        <div>
          <Text style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>Rap Price ($/ct)</Text>
          <InputNumber
            style={{ width: "100%", marginTop: 3 }}
            min={0}
            step={100}
            value={rapPrice}
            onChange={(v) => setRapPrice(v ?? 0)}
            prefix="$"
          />
        </div>
      </div>

      {/* Discount % Slider & Input */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>
            Discount / Back % ({discountPct >= 0 ? "+" : ""}{discountPct}%)
          </Text>
          <InputNumber
            size="small"
            style={{ width: 80 }}
            min={-90}
            max={100}
            step={0.5}
            value={discountPct}
            onChange={(v) => setDiscountPct(v ?? 0)}
            suffix="%"
          />
        </div>
        <Slider
          min={-80}
          max={20}
          step={0.5}
          value={discountPct}
          onChange={setDiscountPct}
          styles={{
            track: { background: discountPct < 0 ? "#ea580c" : "#16a34a" },
            rail: { background: "var(--color-border, #e2e8f0)" },
          }}
        />
        {/* Quick Presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
          {DISCOUNT_PRESETS.map((p) => (
            <Tag
              key={p}
              style={{
                cursor: "pointer",
                fontSize: 10.5,
                padding: "0 6px",
                margin: 0,
                borderColor: discountPct === p ? "var(--color-primary)" : undefined,
                background: discountPct === p ? "color-mix(in srgb, var(--color-primary) 12%, transparent)" : undefined,
              }}
              onClick={() => setDiscountPct(p)}
            >
              {p >= 0 ? `+${p}%` : `${p}%`}
            </Tag>
          ))}
        </div>
      </div>

      {/* Calculated Result Box */}
      <div
        style={{
          padding: "12px 14px",
          background: "color-mix(in srgb, var(--color-primary, #1e3a8a) 5%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-primary, #1e3a8a) 15%, transparent)",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Net Rate / Carat:</span>
          <strong style={{ fontSize: 13, color: "var(--color-primary, #1e3a8a)" }}>
            ${netPricePerCarat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>Total Amount:</span>
          <strong style={{ fontSize: 15, color: "#16a34a" }}>
            ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>
        </div>
      </div>
    </div>
  );
};

export default RapCalculatorWidget;
