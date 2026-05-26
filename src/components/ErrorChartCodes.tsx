import { useState } from "react";
import { errInfo } from "../lib/error-info";
import { fmt } from "../lib/formatters";
import type { ReportData } from "../lib/types";

type Props = {
  data: ReportData;
  onCodeClick: (code: string) => void;
};

type SortMode = "qty" | "code";

export function ErrorChartCodes({ data, onCodeClick }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("qty");
  const [qtyAsc, setQtyAsc]   = useState(false);
  const [codeAsc, setCodeAsc] = useState(true);

  const entries = Object.entries(data.err_by_code || {});
  const sorted = [...entries].sort((a, b) => {
    if (sortMode === "qty") return qtyAsc ? a[1] - b[1] : b[1] - a[1];
    const ai = parseInt(a[0], 10), bi = parseInt(b[0], 10);
    return codeAsc ? ai - bi : bi - ai;
  });

  const maxC = sorted.reduce((m, e) => Math.max(m, e[1]), 1);

  const toggleSort = (mode: SortMode) => {
    if (sortMode === mode) {
      if (mode === "qty") setQtyAsc((v) => !v);
      else setCodeAsc((v) => !v);
    } else {
      setSortMode(mode);
    }
  };

  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="ph" style={{ flexWrap: "wrap", gap: 6 }}>
        <span>Erros por código</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          {data.total_errors > 0 && (
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--red)" }}>
              {data.total_errors} erros
            </span>
          )}
          <button className={`sort-btn ${sortMode === "qty"  ? "active-sort" : ""}`} onClick={() => toggleSort("qty")}>
            Qtd <span>{qtyAsc ? "↑" : "↓"}</span>
          </button>
          <button className={`sort-btn ${sortMode === "code" ? "active-sort" : ""}`} onClick={() => toggleSort("code")}>
            Código <span>{codeAsc ? "↑" : "↓"}</span>
          </button>
        </div>
      </div>

      <div>
        {sorted.length === 0 ? (
          <div className="empty">Sem erros neste período 🎉</div>
        ) : (
          sorted.map(([code, n]) => {
            const ei = errInfo(code, undefined, data);
            const isPerm = ei.type === "Permanent";
            const isTemp = ei.type === "Temporary";
            const typeLabel = isPerm ? "Permanente" : isTemp ? "Temporário" : "?";
            const typeStyle: React.CSSProperties = isPerm
              ? { background: "rgba(239,68,68,.15)", color: "#f87171" }
              : isTemp
                ? { background: "rgba(245,158,11,.15)", color: "#fbbf24" }
                : { background: "var(--bg3)", color: "var(--tx3)" };

            return (
              <div
                key={code}
                className="bar-row clickable-row"
                style={{ minHeight: 36, cursor: "pointer" }}
                onClick={() => onCodeClick(code)}
                title="Clique para ver detalhes e números afetados"
              >
                <span className="bar-label" style={{ minWidth: 90 }}>Código {code}</span>
                <span className="err-badge-type" style={{ minWidth: 82, textAlign: "center", ...typeStyle }}>
                  {typeLabel}
                </span>
                <div className="bar-track" style={{ margin: "0 12px" }}>
                  <div className="bar-fill" style={{ width: `${Math.round((n / maxC) * 100)}%`, background: "var(--red)" }} />
                </div>
                <span className="bar-count text-red">{fmt(n)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
