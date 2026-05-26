import { useEffect, useMemo, useRef, useState } from "react";
import { errInfo } from "../lib/error-info";
import { formatDateTime, formatPhone, isTimestampField, looksLikeTimestamp } from "../lib/formatters";
import type { FailureRow, ReportData } from "../lib/types";

type Props = { code: string; data: ReportData; onClose: () => void };

const COLS = ["phone", "gateway", "client_id", "message", "occurred_at", "category"];

export function ErrorModal({ code, data, onClose }: Props) {
  const [filter, setFilter] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const ei = errInfo(code, undefined, data);
  const allRows = useMemo(
    () => (data.errors_raw || []).filter((e) => String(e.error_code ?? e.code ?? "?") === String(code)),
    [data, code]
  );
  const filtered = useMemo(() => {
    const fl = filter.toLowerCase();
    return fl ? allRows.filter((e) => Object.values(e).some((v) => String(v).toLowerCase().includes(fl))) : allRows;
  }, [allRows, filter]);

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 120);
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => { clearTimeout(t); document.removeEventListener("keydown", handler); };
  }, [onClose]);

  const isPerm = ei.type === "Permanent";
  const isTemp = ei.type === "Temporary";
  const typeLabel = isPerm ? "Permanente" : isTemp ? "Temporário" : "?";
  const typeStyle: React.CSSProperties = isPerm
    ? { background: "rgba(239,68,68,.15)", color: "#f87171" }
    : isTemp
      ? { background: "rgba(245,158,11,.15)", color: "#fbbf24" }
      : { background: "var(--bg3)", color: "var(--tx3)" };
  const descPt = ei.desc_pt || ei.desc;
  const action = isPerm
    ? "✕ Permanente — remover da base"
    : isTemp
      ? "✓ Retentável — pode ser reenviado"
      : "? Verificar documentação do gateway";
  const actionColor = isPerm ? "var(--red)" : isTemp ? "var(--amber)" : "var(--tx3)";

  const cols = COLS.filter((c) => filtered.some((r) => { const v = (r as Record<string, unknown>)[c]; return v !== undefined && v !== null && v !== ""; }));
  const useCols = cols.length > 0 ? cols : filtered[0] ? Object.keys(filtered[0]).filter((k) => !k.startsWith("_")).slice(0, 8) : [];

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-hdr">
          <div>
            <div className="modal-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              Código {code}
              <span className="err-badge-type" style={typeStyle}>{typeLabel}</span>
              {ei.cls && <span style={{ fontSize: 10, color: "var(--tx3)" }}>[{ei.cls}]</span>}
            </div>
            <div className="modal-sub">{allRows.length} ocorrências</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕ Fechar</button>
        </div>

        {/* Descrição + ação */}
        <div style={{ padding: "14px 18px", background: "var(--bg3)", borderBottom: "1px solid var(--bd)" }}>
          <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6, marginBottom: 10 }}>{descPt}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: actionColor }}>{action}</div>
        </div>

        <div className="modal-body">
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--bd)", background: "var(--bg3)" }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="🔍 Filtrar por número, gateway, client_id..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--bd2)", borderRadius: 6, color: "var(--tx)", padding: "6px 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="empty">Sem dados disponíveis.</div>
          ) : (
            <table className="modal-table">
              <thead>
                <tr>{useCols.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.slice(0, 300).map((row, i) => (
                  <tr key={i}>
                    {useCols.map((c) => {
                      const raw = (row as Record<string, unknown>)[c];
                      let v = String(raw ?? "—");
                      if (c === "phone" || c === "telefone" || c === "numero") v = formatPhone(raw);
                      else if (looksLikeTimestamp(raw) || isTimestampField(c)) v = formatDateTime(raw);
                      if (c === "error_code" || c === "code") {
                        const eiRow = errInfo(String(raw ?? "?"), String((row as FailureRow).gateway || ""));
                        const tip = `${eiRow.type === "Permanent" ? "Permanente" : eiRow.type === "Temporary" ? "Temporário" : "?"} · ${eiRow.desc_pt || eiRow.desc || "Código não mapeado"}`;
                        return <td key={c}><span className="rb" style={{ background: "rgba(248,113,113,.15)", color: "#f87171", cursor: "help" }} title={tip}>{v}</span></td>;
                      }
                      return <td key={c} title={v}>{v.length > 60 ? v.slice(0, 60) + "…" : v}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <span>Exibindo {Math.min(filtered.length, 300)} de {filtered.length}{filter ? ` filtrados de ${allRows.length} total` : ""} registros</span>
        </div>
      </div>
    </div>
  );
}
