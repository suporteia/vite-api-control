import { useState } from "react";
import type { ReportData } from "../lib/types";

type Props = { data: ReportData | null; onBlurChange?: (blurred: boolean) => void };

function detectGateway(data: ReportData | null): "sinch" | "pontal" | null {
  if (!data) return null;
  const gws = Object.entries(data.err_by_gw || {});
  if (gws.length) {
    const top = gws.sort((a, b) => b[1] - a[1])[0]![0].toLowerCase();
    if (top.includes("sinch")) return "sinch";
    if (top.includes("pontal")) return "pontal";
  }
  for (const r of data.redis_rows || []) {
    const g = String(r.gateway ?? "").toLowerCase();
    if (g.includes("sinch")) return "sinch";
    if (g.includes("pontal")) return "pontal";
  }
  return null;
}

export function ProviderStrip({ data, onBlurChange }: Props) {
  const [blurred, setBlurred] = useState(true);

  const toggle = () => {
    const next = !blurred;
    setBlurred(next);
    onBlurChange?.(next);
  };

  if (!data) return null;
  const gw = detectGateway(data);

  const cfgMap: Record<string, { label: string; color: string; bg: string }> = {
    sinch:  { label: "SINCH",  color: "var(--blue)",  bg: "rgba(59,130,246,.08)" },
    pontal: { label: "PONTAL", color: "var(--amber)", bg: "rgba(245,158,11,.08)" },
  };
  const cfg = (gw ? cfgMap[gw] : undefined) ?? { label: "Não detectado", color: "var(--tx3)", bg: "rgba(107,114,128,.06)" };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 24px",
        borderBottom: "1px solid var(--bd)",
        background: `linear-gradient(90deg, ${cfg.bg} 0%, transparent 65%)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 10, color: "var(--tx2)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>
          Fornecedor ativo
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: cfg.color, textTransform: "uppercase", filter: blurred ? "blur(6px)" : "none", transition: "filter .3s", userSelect: blurred ? "none" : "auto" }}>
          {gw && (
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`,
              display: "inline-block", animation: "blink 2s infinite",
            }} />
          )}
          {cfg.label}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--tx3)" }} className="provider-meta">
          via Grafana · atualizado às {data.updated_at}
        </span>
        <button
          onClick={toggle}
          title={blurred ? "Mostrar dados" : "Borrar dados"}
          style={{
            background: blurred ? "rgba(99,102,241,.15)" : "transparent",
            border: `1px solid ${blurred ? "var(--acc)" : "var(--bd2)"}`,
            color: blurred ? "#a5b4fc" : "var(--tx2)",
            borderRadius: 7,
            padding: "4px 9px",
            cursor: "pointer",
            fontSize: 13,
            lineHeight: 1,
            transition: "all .2s",
          }}
        >
          {blurred ? (
            // olho cortado
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            // olho aberto
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
