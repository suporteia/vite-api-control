import { maybeFormatValue } from "../lib/formatters";
import type { MessageRow } from "../lib/types";

export function LiveTable({ rows }: { rows: MessageRow[] }) {
  if (!rows.length)
    return (
      <div className="tpanel" id="live-table-panel">
        <div className="ph">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Visão geral por cliente</span>
            <span className="src-tag src-live">Ao vivo · hoje</span>
          </div>
        </div>
        <div className="twrap">
          <div className="empty">Sem dados ao vivo.</div>
        </div>
      </div>
    );

  const keys = Object.keys(rows[0]).filter(
    (k) => k !== "undefined" && !k.startsWith("_")
  );

  return (
    <div className="tpanel" id="live-table-panel">
      <div className="ph">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Visão geral por cliente</span>
          <span className="src-tag src-live">Ao vivo · hoje</span>
        </div>
        <span
          style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--tx2)" }}
        >
          {rows.length} registros
        </span>
      </div>
      <div className="twrap">
        <table>
          <thead>
            <tr>
              {keys.map((k) => (
                <th key={k}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 80).map((row, i) => (
              <tr key={i}>
                {keys.map((k) => {
                  const raw = (row as Record<string, unknown>)[k];
                  const v = maybeFormatValue(k, raw);
                  const isRate =
                    k.toLowerCase().includes("taxa") ||
                    k.toLowerCase().includes("rate");
                  if (isRate) {
                    const n = parseFloat(v);
                    const cls = isNaN(n)
                      ? ""
                      : n >= 80
                        ? "rg"
                        : n >= 50
                          ? "ra"
                          : n > 0
                            ? "rr"
                            : "rz";
                    return (
                      <td key={k}>
                        <span className={`rb ${cls}`}>{v}</span>
                      </td>
                    );
                  }
                  return (
                    <td key={k} title={v}>
                      {v.length > 60 ? v.slice(0, 60) + "…" : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
