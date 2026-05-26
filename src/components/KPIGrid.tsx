import { fmt } from "../lib/formatters";
import type { ReportData } from "../lib/types";

function toN(v: unknown) { const n = parseFloat(String(v ?? 0)); return isNaN(n) ? 0 : n; }

export function KPIGrid({ data }: { data: ReportData }) {
  const rate = data.delivery_rate;
  const rs = rate === null ? "—" : `${rate.toFixed(1)}%`;
  const rc = rate === null ? "blue" : rate >= 80 ? "green" : rate >= 50 ? "amber" : "red";

  // Soma direto dos campos que chegam do Grafana
  const rows = data.redis_rows || [];
  const tempErrors = rows.reduce((acc, r) => acc + toN(r.unreachable), 0);
  const permErrors = rows.reduce((acc, r) => acc + toN(r.invalid_number), 0);

  const totalRows = rows.length + (data.live_rows || []).length;
  const isToday = data.is_today;

  const kpis = [
    { l: "Taxa de entrega", v: rs,                vc: rc,                                  cc: `c-${rc}`,    s: data.date },
    { l: "Total enviado",   v: fmt(data.total_sent), vc: "blue",                            cc: "c-blue",     s: "disparos" },
    { l: "Total entregue",  v: fmt(data.total_recv), vc: "green",                           cc: "c-green",    s: "confirmados" },
    { l: "Indisponíveis",   v: fmt(tempErrors),    vc: tempErrors > 0 ? "amber" : "green",  cc: tempErrors > 0 ? "c-amber" : "c-green", s: "temporário · retentável" },
    { l: "Inválidos",       v: fmt(permErrors),    vc: permErrors > 0 ? "pink"  : "green",  cc: permErrors > 0 ? "c-pink"  : "c-green", s: "permanente · descartar" },
  ];

  return (
    <>
      <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8, fontFamily: "var(--mono)" }}>
        registros: {totalRows} {totalRows === 1 ? "linha" : "linhas"}
        {isToday && (
          <span className="src-tag src-live" style={{ fontSize: 9, padding: "1px 6px", marginLeft: 8 }}>
            ao vivo
          </span>
        )}
      </div>
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className={`kpi ${k.cc}`}>
            <div className="kl">{k.l}</div>
            <div className={`kv text-${k.vc}`}>{k.v}</div>
            <div className="ks">{k.s}</div>
          </div>
        ))}
      </div>
    </>
  );
}
