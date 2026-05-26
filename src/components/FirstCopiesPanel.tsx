import { computeDeliveryRate, formatDateTime } from "../lib/formatters";
import type { MessageRow } from "../lib/types";

type Props = {
  rows: MessageRow[];
  onItemClick: (rowIdx: number) => void;
};

export function FirstCopiesPanel({ rows, onItemClick }: Props) {
  const sorted = rows
    .map((r, originalIdx) => ({ r, originalIdx }))
    .filter(({ r }) => r._first_seen)
    .sort(({ r: a }, { r: b }) =>
      String(a._first_seen).localeCompare(String(b._first_seen))
    );

  if (!sorted.length) return null;

  const todayBR = new Date().toLocaleDateString("pt-BR");
  const top = sorted.slice(0, 10);
  const n = sorted.length;

  return (
    <div className="tpanel" id="first-copies-panel">
      <div className="ph">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Ordem de entrada das copies</span>
          <span className="src-tag src-redis">monitor local</span>
        </div>
        <span
          style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--tx2)" }}
        >
          {n} {n === 1 ? "copy" : "copies"}
          {n > 10 ? " · exibindo 10 primeiras" : ""}
        </span>
      </div>
      <div>
        {top.map(({ r, originalIdx }, i) => {
          const rank = i + 1;
          const fullTs = formatDateTime(r._first_seen);
          const [dPart, tPart] = fullTs.split(" ");
          const timeDisplay = dPart === todayBR ? tPart || fullTs : fullTs;
          const copyText = String(
            r.text || r.message || r.mensagem || r.copy || "(sem texto)"
          )
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 110);
          const total =
            parseFloat(String(r.total ?? r.queued ?? r.sent ?? 0)) || 0;
          const rate = computeDeliveryRate(r as Record<string, unknown>);
          const rateCls =
            rate === null
              ? ""
              : rate >= 80
                ? "text-green"
                : rate >= 50
                  ? "text-amber"
                  : "text-red";
          const rankBadge =
            rank === 1
              ? "🥇"
              : rank === 2
                ? "🥈"
                : rank === 3
                  ? "🥉"
                  : `#${rank}`;

          return (
            <div
              key={originalIdx}
              className="fc-item"
              onClick={() => onItemClick(originalIdx)}
              title="Ver detalhes da mensagem"
            >
              <span className={`fc-rank ${rank === 1 ? "gold" : ""}`}>
                {rankBadge}
              </span>
              <span className="fc-time">{timeDisplay}</span>
              <span className="fc-copy" title={copyText}>
                {copyText}
              </span>
              <span className="fc-meta">
                {total || "—"} ·{" "}
                <span className={`fc-rate ${rateCls}`}>
                  {rate === null ? "—" : `${rate}%`}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
