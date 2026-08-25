import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Gem, Loader2 } from "lucide-react";

/* ============================================================
   ACTION CONFIG — one source of truth for copy + accent per action
   ============================================================ */
const ACTION_CONFIG = {
  sale: {
    label: "Sold",
    heading: "Stone Sold",
    verb: "marked as sold",
    accent: "#E8C468",
    ring: "rgba(232,196,104,0.35)",
  },
  memo: {
    label: "On Memo",
    heading: "Placed On Memo",
    verb: "placed on memo",
    accent: "#7FB8D8",
    ring: "rgba(127,184,216,0.35)",
  },
  consign: {
    label: "Consigned",
    heading: "Sent To Consign",
    verb: "sent for consignment",
    accent: "#C596E8",
    ring: "rgba(197,150,232,0.35)",
  },
  lab: {
    label: "Lab",
    heading: "Sent To Lab",
    verb: "sent to lab",
    accent: "#4ADE80",
    ring: "rgba(74,222,128,0.35)",
  },
  export: {
    label: "Export",
    heading: "Sent To Export",
    verb: "sent as export",
    accent: "#38BDF8",
    ring: "rgba(56,189,248,0.35)",
  },
  hold: {
    label: "On Hold",
    heading: "Placed On Hold",
    verb: "placed on hold",
    accent: "#E89B6B",
    ring: "rgba(232,155,107,0.35)",
  },
  unHold: {
    label: "Hold Released",
    heading: "Hold Released",
    verb: "released from hold",
    accent: "#9AA5B1",
    ring: "rgba(154,165,177,0.35)",
  },
  changePrice: {
    label: "Price Updated",
    heading: "Price Updated",
    verb: "updated with the new price",
    accent: "#E8C468",
    ring: "rgba(232,196,104,0.35)",
  },
};

/* ============================================================
   SPARKLE BURST — fixed, deterministic positions (no Math.random
   jitter between renders), staggered delays for a radiating feel
   ============================================================ */
const SPARKLES = [
  { x: -58, y: -34, delay: 0.05, size: 6 },
  { x: 54, y: -40, delay: 0.15, size: 5 },
  { x: -70, y: 10, delay: 0.25, size: 4 },
  { x: 68, y: 6, delay: 0.1, size: 6 },
  { x: -34, y: 56, delay: 0.3, size: 5 },
  { x: 38, y: 58, delay: 0.2, size: 4 },
  { x: 0, y: -64, delay: 0.35, size: 5 },
  { x: 0, y: 68, delay: 0.4, size: 4 },
];

function Sparkle({ x, y, delay, size, color }) {
  return (
    <svg
      className="stone-sparkle"
      style={{
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        animationDelay: `${0.55 + delay}s`,
        width: size,
        height: size,
      }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
        fill={color}
      />
    </svg>
  );
}

/* ============================================================
   THE DIAMOND MEDALLION — facets draw in, shimmer sweeps,
   then an emerald check "certifies" the stone
   ============================================================ */
function DiamondMedallion({ accent, ring, playKey }) {
  return (
    <div className="medallion-wrap" key={playKey}>
      <div className="medallion-ring" style={{ boxShadow: `0 0 0 1px ${ring}, 0 0 40px ${ring}` }} />
      {SPARKLES.map((s, i) => (
        <Sparkle key={i} {...s} color={accent} />
      ))}
      <svg viewBox="0 0 120 120" width="92" height="92" className="medallion-svg">
        <defs>
          <linearGradient id="facetShimmer" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} stopOpacity="0" />
            <stop offset="50%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* diamond outline */}
        <path
          className="diamond-outline"
          d="M32 40 L60 14 L88 40 L60 106 Z"
          fill="none"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* facet lines */}
        <path className="diamond-facet f1" d="M32 40 L88 40" stroke={accent} strokeWidth="1.4" fill="none" />
        <path className="diamond-facet f2" d="M46 40 L60 106" stroke={accent} strokeWidth="1.4" fill="none" />
        <path className="diamond-facet f3" d="M74 40 L60 106" stroke={accent} strokeWidth="1.4" fill="none" />
        <path className="diamond-facet f4" d="M60 14 L46 40" stroke={accent} strokeWidth="1.4" fill="none" />
        <path className="diamond-facet f5" d="M60 14 L74 40" stroke={accent} strokeWidth="1.4" fill="none" />
        {/* shimmer sweep overlay */}
        <path
          className="diamond-shimmer"
          d="M32 40 L60 14 L88 40 L60 106 Z"
          fill="url(#facetShimmer)"
        />
        {/* certifying checkmark */}
        <path
          className="diamond-check"
          d="M45 62 L56 74 L79 48"
          fill="none"
          stroke="#3FA772"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ============================================================
   THE SUCCESS MODAL — the reusable piece
   ============================================================ */
export function StoneActionSuccessModal({
  isOpen,
  onClose,
  actionType = "sale",
  stone = {},
  count = 1, // how many stones this action applied to (bulk selections)
  onViewStone,
  autoCloseMs = null, // e.g. 6000 to auto-dismiss; null = manual only
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const timerRef = useRef(null);

  const cfg = ACTION_CONFIG[actionType] || ACTION_CONFIG.sale;

  const handleClose = useCallback(() => {
    setClosing(true);
    window.clearTimeout(timerRef.current);
    setTimeout(() => {
      setClosing(false);
      setMounted(false);
      onClose && onClose();
    }, 240);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setClosing(false);
      setPlayKey((k) => k + 1);
      if (autoCloseMs) {
        timerRef.current = window.setTimeout(handleClose, autoCloseMs);
      }
    }
    return () => window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, actionType]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && mounted && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, handleClose]);

  if (!mounted) return null;

  const formatCarat = (val) => {
    if (val === undefined || val === null || val === "") return "";
    const n = Number(val);
    if (!Number.isFinite(n) || n === 0) return typeof val === "string" ? val : "";
    return `${n.toFixed(2)} ct`;
  };

  const certDetails = [
    { label: "SKU", value: stone.sku || stone.name || stone.diamond_no || "-" },
    { label: "CARAT", value: formatCarat(stone.carat ?? stone.polish_carat ?? stone.weight) || "-" },
    { label: "SHAPE", value: String(stone.shape || "-").toUpperCase() },
    { label: "CLARITY", value: String(stone.clarity || "-").toUpperCase() },
  ];

  return (
    <div
      className={`stone-modal-overlay ${closing ? "is-closing" : "is-open"}`}
      role="dialog"
      aria-modal="true"
      aria-label={cfg.heading}
    >
      <div className={`stone-modal-card ${closing ? "is-closing" : "is-open"}`}>
        <button className="stone-modal-close" onClick={handleClose} aria-label="Close">
          <X size={16} />
        </button>

        <DiamondMedallion accent={cfg.accent} ring={cfg.ring} playKey={playKey} />

        <div className="stone-modal-eyebrow" style={{ color: cfg.accent }}>
          <Gem size={12} style={{ marginRight: 6 }} />
          {cfg.label.toUpperCase()}
        </div>

        <h2 className="stone-modal-heading">{cfg.heading}</h2>

        <p className="stone-modal-message">
          {count > 1 ? (
            <>
              <strong>{count} stones</strong> have been successfully {cfg.verb}.
            </>
          ) : (
            <>
              {stone.sku || stone.name ? (
                <strong>{stone.sku || stone.name}</strong>
              ) : (
                "This stone"
              )}{" "}
              has been successfully {cfg.verb}.
            </>
          )}
        </p>

        <div className="stone-cert-strip">
          {certDetails.map(({ label, value }) => (
            <div className="stone-cert-item" key={label}>
              <span className="stone-cert-label">{label}</span>
              <span className="stone-cert-value">{value}</span>
            </div>
          ))}
        </div>

        <div className="stone-modal-actions">
          {onViewStone && (
            <button
              className="stone-btn stone-btn-ghost"
              onClick={() => {
                onViewStone(stone);
                handleClose();
              }}
            >
              View Stone
            </button>
          )}
          <button
            className="stone-btn stone-btn-primary"
            style={{ "--accent": cfg.accent }}
            onClick={handleClose}
          >
            Done
          </button>
        </div>

        {autoCloseMs && !closing && (
          <div className="stone-progress-track">
            <div
              className="stone-progress-fill"
              style={{ background: cfg.accent, animationDuration: `${autoCloseMs}ms` }}
            />
          </div>
        )}
      </div>

      <style>{`
        .stone-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          padding: 20px;
        }
        .stone-modal-overlay.is-open { animation: overlayFadeIn 0.28s ease both; }
        .stone-modal-overlay.is-closing { animation: overlayFadeOut 0.22s ease both; }

        .stone-modal-card {
          position: relative;
          width: 100%;
          max-width: 390px;
          background: var(--color-card-bg, #ffffff);
          border: 1px solid var(--color-border, #E2E8F0);
          border-radius: 20px;
          padding: 38px 28px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.16), 0 4px 16px rgba(0, 0, 0, 0.04);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
        }
        .stone-modal-card.is-open { animation: cardIn 0.42s cubic-bezier(.2,.9,.25,1.1) both; }
        .stone-modal-card.is-closing { animation: cardOut 0.22s ease both; }

        @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes overlayFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes cardIn {
          0% { opacity: 0; transform: scale(0.86) translateY(14px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cardOut {
          0% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.92) translateY(6px); }
        }

        .stone-modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid #E2E8F0;
          background: #F1F5F9;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: color .15s ease, background .15s ease, transform .15s ease;
        }
        .stone-modal-close:hover { color: #0F172A; background: #E2E8F0; transform: rotate(90deg); }

        /* ---------- Medallion ---------- */
        .medallion-wrap {
          position: relative;
          width: 128px;
          height: 128px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }
        .medallion-ring {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          animation: ringPulse 0.6s ease both;
        }
        @keyframes ringPulse {
          0% { opacity: 0; transform: scale(0.7); }
          60% { opacity: 1; }
          100% { opacity: 1; transform: scale(1); }
        }
        .medallion-svg { position: relative; z-index: 2; overflow: visible; }

        .diamond-outline {
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
          animation: drawLine 0.6s ease-out 0.05s forwards;
        }
        .diamond-facet {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          opacity: 0.65;
          animation: drawLine 0.4s ease-out forwards;
        }
        .diamond-facet.f1 { animation-delay: 0.35s; }
        .diamond-facet.f2 { animation-delay: 0.42s; }
        .diamond-facet.f3 { animation-delay: 0.42s; }
        .diamond-facet.f4 { animation-delay: 0.5s; }
        .diamond-facet.f5 { animation-delay: 0.5s; }
        @keyframes drawLine { to { stroke-dashoffset: 0; } }

        .diamond-shimmer {
          opacity: 0;
          transform: translateX(-40px);
          animation: shimmerSweep 0.7s ease-out 0.55s forwards;
        }
        @keyframes shimmerSweep {
          0% { opacity: 0; transform: translateX(-40px); }
          40% { opacity: 1; }
          100% { opacity: 0; transform: translateX(40px); }
        }

        .diamond-check {
          stroke-dasharray: 60;
          stroke-dashoffset: 60;
          filter: drop-shadow(0 0 6px rgba(47,158,106,0.5));
          animation: drawLine 0.35s ease-out 0.75s forwards;
        }

        .stone-sparkle {
          position: absolute;
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.3);
          animation: sparklePop 0.6s ease-out forwards;
          z-index: 3;
        }
        @keyframes sparklePop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(0deg); }
          40% { opacity: 1; transform: translate(-50%, -50%) scale(1.15) rotate(25deg); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.7) rotate(45deg); }
        }

        /* ---------- Text ---------- */
        .stone-modal-eyebrow {
          display: flex;
          align-items: center;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          margin-bottom: 10px;
          animation: fadeUp 0.4s ease 0.5s both;
        }
        .stone-modal-heading {
          font-family: inherit;
          font-size: 25px;
          font-weight: 700;
          color: var(--color-text-heading, #1E293B);
          margin: 0 0 8px;
          letter-spacing: 0.01em;
          animation: fadeUp 0.4s ease 0.56s both;
        }
        .stone-modal-message {
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-body, #475569);
          margin: 0 0 22px;
          animation: fadeUp 0.4s ease 0.62s both;
        }
        .stone-modal-message strong { color: #0F172A; font-weight: 600; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ---------- Certificate strip ---------- */
        .stone-cert-strip {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1px;
          background: #E2E8F0;
          border: 1px solid #CBD5E1;
          border-radius: 14px;
          overflow: hidden;
          margin-bottom: 24px;
          animation: fadeUp 0.4s ease 0.68s both;
        }
        .stone-cert-item {
          padding: 13px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: #F8FAFC;
          transition: background 0.2s ease;
        }
        .stone-cert-item:hover {
          background: #F1F5F9;
        }
        .stone-cert-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #64748B;
          text-transform: uppercase;
        }
        .stone-cert-value {
          font-size: 14px;
          color: #0F172A;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        /* ---------- Buttons ---------- */
        .stone-modal-actions {
          display: flex;
          gap: 10px;
          width: 100%;
          animation: fadeUp 0.4s ease 0.74s both;
        }
        .stone-btn {
          flex: 1;
          padding: 11px 14px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: transform .15s ease, filter .15s ease, background .15s ease;
        }
        .stone-btn:active { transform: scale(0.97); }
        .stone-btn-primary {
          background: linear-gradient(135deg, var(--accent, #5B4FCF), #4A3FBA);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(91, 79, 207, 0.22);
        }
        .stone-btn-ghost {
          background: #F8FAFC;
          color: #334155;
          border: 1px solid #CBD5E1;
        }
        .stone-btn-ghost:hover { background: #F1F5F9; }

        /* ---------- Auto-close progress ---------- */
        .stone-progress-track {
          width: 100%;
          height: 3px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          margin-top: 16px;
          overflow: hidden;
        }
        .stone-progress-fill {
          height: 100%;
          width: 100%;
          transform-origin: left;
          animation: progressShrink linear forwards;
        }
        @keyframes progressShrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .stone-modal-overlay, .stone-modal-card, .diamond-outline, .diamond-facet,
          .diamond-shimmer, .diamond-check, .stone-sparkle, .medallion-ring,
          .stone-modal-eyebrow, .stone-modal-heading, .stone-modal-message,
          .stone-cert-strip, .stone-modal-actions {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   DEMO — shows the real pattern: call API -> on success, open modal
   Wire your real endpoints in place of `fakeApiCall`.
   ============================================================ */
const fakeApiCall = (ms = 900) => new Promise((resolve) => setTimeout(resolve, ms));

const SAMPLE_STONE = {
  name: "18K Solitaire Ring",
  SKU: "RG-20493",
  Weight: "3.42 g",
  Carat: "0.85 ct",
};

export default function App() {
  const [loadingAction, setLoadingAction] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState("sale");

  const handleAction = async (actionType) => {
    setLoadingAction(actionType);
    try {
      await fakeApiCall(); // <-- replace with your real API call, e.g. await sellStone(stoneId)
      setActiveAction(actionType);
      setModalOpen(true); // only opens once the API response comes back successfully
    } finally {
      setLoadingAction(null);
    }
  };

  const buttons = [
    { key: "memo", label: "Put On Memo" },
    { key: "consign", label: "Send To Consign" },
    { key: "sale", label: "Mark As Sale" },
    { key: "hold", label: "Put On Hold" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0C10",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: 24,
        fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Inter, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#E8C468", fontSize: 11, letterSpacing: "0.18em", marginBottom: 8 }}>
          STONE ACTIONS · DEMO
        </div>
        <h1 style={{ color: "#F3EFE6", fontFamily: "Georgia, serif", fontSize: 28, margin: 0 }}>
          RG-20493 · 18K Solitaire Ring
        </h1>
        <p style={{ color: "#8A8F98", fontSize: 13, marginTop: 8 }}>
          Click any action below. The modal opens only after the simulated API call resolves.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {buttons.map((b) => (
          <button
            key={b.key}
            onClick={() => handleAction(b.key)}
            disabled={loadingAction !== null}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 10,
              border: "1px solid rgba(232,196,104,0.25)",
              background: loadingAction === b.key ? "rgba(232,196,104,0.12)" : "rgba(255,255,255,0.03)",
              color: "#F3EFE6",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: loadingAction ? "not-allowed" : "pointer",
              opacity: loadingAction && loadingAction !== b.key ? 0.4 : 1,
              transition: "all .15s ease",
            }}
          >
            {loadingAction === b.key && <Loader2 size={14} className="spin" />}
            {b.label}
          </button>
        ))}
      </div>

      {/* <StoneActionSuccessModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        actionType={activeAction}
        stone={SAMPLE_STONE}
        onViewStone={(s) => console.log("navigate to stone", s)}
        autoCloseMs={null}
      /> */}
      <StoneActionSuccessModal
        isOpen={successModal.open}
        onClose={() => setSuccessModal((s) => ({ ...s, open: false }))}
        actionType={successModal.actionType}
        stone={successModal.stone}
        count={successModal.count}
      />

      <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}