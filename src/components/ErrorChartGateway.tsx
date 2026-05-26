import { fmt } from "../lib/formatters";
import type { ReportData } from "../lib/types";

export function ErrorChartGateway({ data }: { data: ReportData }) {
  const gws = Object.entries(data.err_by_gw || {});
  const maxG = gws[0]?.[1] || 1;
  return (
    <div className="panel">
      <div className="ph">Erros por gateway</div>
      <div>
        {gws.length === 0 ? (
          <div className="empty">Sem dados</div>
        ) : (
          gws.map(([g, n]) => (
            <div className="bar-row" key={g}>
              <span className="bar-label">{g}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.round((n / maxG) * 100)}%`,
                    background: "var(--amber)",
                  }}
                />
              </div>
              <span className="bar-count text-amber">{fmt(n)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
