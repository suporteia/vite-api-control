import { useEffect, useMemo, useRef, useState } from "react";
import { errInfo } from "../lib/error-info";
import {
  formatDateTime,
  formatPhone,
  isTimestampField,
  looksLikeTimestamp,
} from "../lib/formatters";
import { showToast } from "../hooks/useToast";
import { exportFailuresXLSX } from "../lib/xlsx-export";
import type { FailureRow, MessageRow, ReportData } from "../lib/types";

type Props = {
  row: MessageRow;
  data: ReportData;
  onClose: () => void;
};

function dayOf(v: unknown): string {
  if (!v) return "";
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return "";
}

function escapeHtmlString(s: string): string {
  // Apenas serve pra montar tooltip seguro, React já escapa o restante
  return s;
}

const COLS = ["phone", "client_id", "gateway", "error_code", "occurred_at", "categoria"];

export function MsgModal({ row, data, onClose }: Props) {
  const [codeFilter, setCodeFilter] = useState("");
  const [gwFilter, setGwFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [textFilter, setTextFilter] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Descobre o texto da copy ────────────────────────────────────
  const copyText = useMemo(() => {
    const copyFieldNames = ["message", "mensagem", "copy", "msg", "texto", "text"];
    for (const fn of copyFieldNames) {
      const v = (row as Record<string, unknown>)[fn];
      if (v && typeof v === "string" && v.length > 5) return v;
    }
    const strings = Object.values(row).filter(
      (v): v is string => typeof v === "string" && v.length > 10
    );
    strings.sort((a, b) => b.length - a.length);
    return strings[0] || "(sem texto)";
  }, [row]);

  // ── Filtra errors_raw pela copy ─────────────────────────────────
  const allErrors = useMemo(() => {
    const copyLow = copyText.toLowerCase().slice(0, 40);
    if (!copyLow) return [];
    return (data.errors_raw || []).filter((e) => {
      const emsg = String(e.message ?? e.mensagem ?? e.msg ?? "").toLowerCase();
      return emsg.includes(copyLow);
    });
  }, [data.errors_raw, copyText]);

  // ── Aplica filtros ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const txt = textFilter.toLowerCase().trim();
    return allErrors.filter((e) => {
      if (codeFilter && String(e.error_code ?? e.code ?? "") !== codeFilter)
        return false;
      if (gwFilter && String(e.gateway ?? "") !== gwFilter) return false;
      if (
        dayFilter &&
        dayOf(e.occurred_at ?? e.occurredAt ?? e.timestamp) !== dayFilter
      )
        return false;
      if (
        txt &&
        !Object.values(e).some((v) => String(v).toLowerCase().includes(txt))
      )
        return false;
      return true;
    });
  }, [allErrors, codeFilter, gwFilter, dayFilter, textFilter]);

  // ── Opções únicas pros dropdowns ────────────────────────────────
  const uniqCodes = useMemo(
    () =>
      [
        ...new Set(
          allErrors.map((e) => String(e.error_code ?? e.code ?? "")).filter(Boolean)
        ),
      ].sort((a, b) => parseInt(a, 10) - parseInt(b, 10)),
    [allErrors]
  );
  const uniqGws = useMemo(
    () =>
      [
        ...new Set(allErrors.map((e) => String(e.gateway ?? "")).filter(Boolean)),
      ].sort(),
    [allErrors]
  );
  const uniqDays = useMemo(
    () =>
      [
        ...new Set(
          allErrors
            .map((e) => dayOf(e.occurred_at ?? e.occurredAt ?? e.timestamp))
            .filter(Boolean)
        ),
      ].sort(),
    [allErrors]
  );

  // ── KPIs da mensagem ────────────────────────────────────────────
  const total = parseFloat(String(row.total ?? row.queued ?? row.sent ?? 0)) || 0;
  const recv =
    parseFloat(String(row.delivered ?? row.success ?? 0)) || 0;
  const errs =
    parseFloat(String(row.errors ?? row.erros ?? row.failed ?? row.invalid ?? 0)) ||
    Math.max(0, total - recv);
  const rate = total > 0 ? Math.round((recv / total) * 1000) / 10 : null;
  const rateCls =
    rate === null ? "" : rate >= 80 ? "kpi-rg" : rate >= 50 ? "kpi-ra" : rate > 0 ? "kpi-rr" : "";

  // ── Metadados ───────────────────────────────────────────────────
  const meta: { label: string; value: string }[] = [];
  const cid = row.client_id ?? row.cliente ?? row.client;
  if (cid) meta.push({ label: "Cliente", value: String(cid) });
  if (row._campo && looksLikeTimestamp(row._campo)) {
    meta.push({ label: "Entrada", value: formatDateTime(row._campo) });
  }
  for (const k of Object.keys(row)) {
    if (k.startsWith("_")) continue;
    const v = (row as Record<string, unknown>)[k];
    if (isTimestampField(k) || looksLikeTimestamp(v)) {
      meta.push({ label: k.replace(/_/g, " "), value: formatDateTime(v) });
      break;
    }
  }
  const gw = row.gateway ?? row.canal;
  if (gw) meta.push({ label: "Gateway", value: String(gw) });
  const tipo = row.tipo ?? row.type ?? row.channel_type;
  if (tipo) meta.push({ label: "Tipo", value: String(tipo) });

  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 120);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  const handleExport = () => {
    const result = exportFailuresXLSX(filtered as FailureRow[], {
      uuid: String(row.uuid ?? row._campo ?? ""),
      date: data.date,
    });
    showToast(result.msg, !result.ok);
  };

  const anyFilter = codeFilter || gwFilter || dayFilter || textFilter;
  const cols = COLS;

  const inputStyle = {
    flex: 1,
    minWidth: 110,
    background: "var(--bg)",
    border: "1px solid var(--bd2)",
    borderRadius: 6,
    color: "var(--tx)",
    padding: "4px 10px",
    fontSize: 11,
    fontFamily: "inherit",
    outline: "none",
    fontWeight: 400,
    textTransform: "none" as const,
    letterSpacing: 0,
  };

  const selBase = {
    background: "var(--bg)",
    border: "1px solid var(--bd2)",
    borderRadius: 6,
    color: "var(--tx)",
    padding: "4px 6px",
    fontSize: 11,
    fontFamily: "inherit",
    outline: "none",
    fontWeight: 400,
    textTransform: "none" as const,
    letterSpacing: 0,
    cursor: "pointer",
    textOverflow: "ellipsis" as const,
    flexShrink: 0,
  };

  return (
    <div
      className="overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-hdr">
          <div>
            <div className="modal-title">💬 Detalhes da mensagem</div>
            <div className="modal-sub">
              {allErrors.length
                ? `${allErrors.length} falha${allErrors.length === 1 ? "" : "s"} amostrada${allErrors.length === 1 ? "" : "s"} abaixo`
                : "Sem falhas registradas em sms:fail:logs para esta copy"}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕ Fechar
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-info">
            <div className="mi-copy">{copyText}</div>
            {meta.length > 0 && (
              <div className="mi-meta">
                {meta.map((m, i) => (
                  <div key={i}>
                    <span className="mi-label">{m.label}</span>
                    <span className="mi-value">{m.value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mi-kpis">
              <div className="mi-kpi">
                <div className="mi-kpi-label">Total</div>
                <div className="mi-kpi-value">{total || "—"}</div>
              </div>
              <div className="mi-kpi">
                <div className="mi-kpi-label">Entregues</div>
                <div className="mi-kpi-value">{recv || "—"}</div>
              </div>
              <div className={`mi-kpi ${rateCls}`}>
                <div className="mi-kpi-label">Taxa</div>
                <div className="mi-kpi-value">
                  {rate === null ? "—" : `${rate}%`}
                </div>
              </div>
              <div className="mi-kpi">
                <div className="mi-kpi-label">Erros</div>
                <div className="mi-kpi-value">{errs || "—"}</div>
              </div>
            </div>
          </div>

          {allErrors.length > 0 && (
            <div
              className="mi-section-label"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <span style={{ flexShrink: 0, marginRight: 4 }}>
                Falhas ({allErrors.length})
              </span>
              <select
                style={{ ...selBase, width: 140 }}
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
              >
                <option value="">código (todos)</option>
                {uniqCodes.map((c) => {
                  const ei = errInfo(c, undefined, data);
                  const lbl = (ei.desc_pt || ei.desc || "").slice(0, 22);
                  return (
                    <option
                      key={c}
                      value={c}
                      title={escapeHtmlString(ei.desc_pt || ei.desc || "")}
                    >
                      {c}
                      {lbl ? ` — ${lbl}` : ""}
                    </option>
                  );
                })}
              </select>
              <select
                style={{ ...selBase, width: 110 }}
                value={gwFilter}
                onChange={(e) => setGwFilter(e.target.value)}
              >
                <option value="">gateway (todos)</option>
                {uniqGws.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <select
                style={{ ...selBase, width: 115 }}
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
              >
                <option value="">data (todas)</option>
                {uniqDays.map((d) => {
                  const [Y, M, D] = d.split("-");
                  return (
                    <option key={d} value={d}>
                      {D}/{M}/{Y}
                    </option>
                  );
                })}
              </select>
              <input
                ref={searchRef}
                type="text"
                placeholder="🔍 telefone..."
                value={textFilter}
                onChange={(e) => setTextFilter(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {allErrors.length === 0 ? (
            <div className="empty">
              Sem falhas registradas em sms:fail:logs para esta copy
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">Nenhuma falha corresponde aos filtros.</div>
          ) : (
            <table className="modal-table">
              <thead>
                <tr>
                  {cols
                    .filter((c) =>
                      filtered.some((r) => {
                        const v = (r as Record<string, unknown>)[c];
                        return v !== undefined && v !== null && v !== "";
                      })
                    )
                    .map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 300).map((r, i) => {
                  const usedCols = cols.filter((c) =>
                    filtered.some((row) => {
                      const v = (row as Record<string, unknown>)[c];
                      return v !== undefined && v !== null && v !== "";
                    })
                  );
                  return (
                    <tr key={i}>
                      {usedCols.map((c) => {
                        const raw = (r as Record<string, unknown>)[c];
                        let v = String(raw ?? "—");
                        if (c === "phone" || c === "telefone" || c === "numero")
                          v = formatPhone(raw);
                        else if (looksLikeTimestamp(raw) || isTimestampField(c))
                          v = formatDateTime(raw);
                        if (c === "error_code" || c === "code") {
                          const eiRow = errInfo(
                            String(raw ?? "?"),
                            String((r as FailureRow).gateway || ""),
                            data
                          );
                          const typeLabelRow =
                            eiRow.type === "Permanent"
                              ? "Permanente"
                              : eiRow.type === "Temporary"
                                ? "Temporário"
                                : "?";
                          const tip = `${typeLabelRow} · ${eiRow.cls ? `[${eiRow.cls}] ` : ""}${eiRow.desc_pt || eiRow.desc || "Código não mapeado"}`;
                          return (
                            <td key={c}>
                              <span
                                className="rb"
                                style={{
                                  background: "rgba(248,113,113,.15)",
                                  color: "#f87171",
                                  fontWeight: 500,
                                  cursor: "help",
                                }}
                                title={tip}
                              >
                                {v}
                              </span>
                            </td>
                          );
                        }
                        return (
                          <td key={c} title={v}>
                            {v.length > 60 ? v.slice(0, 60) + "…" : v}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <span>
            {allErrors.length > 0
              ? `Exibindo ${Math.min(filtered.length, 300)} de ${filtered.length}${
                  anyFilter ? ` (filtradas de ${allErrors.length} totais)` : " falhas"
                }`
              : ""}
          </span>
          {filtered.length > 0 && (
            <button
              onClick={handleExport}
              title="Baixar falhas filtradas em XLSX"
              style={{
                fontSize: 11,
                background: "var(--bg3)",
                border: "1px solid var(--bd2)",
                borderRadius: 6,
                color: "var(--tx)",
                padding: "3px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 400,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              ↓ XLSX
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
