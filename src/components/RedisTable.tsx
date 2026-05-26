import { useMemo, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { computeDeliveryRate, maybeFormatValue } from "../lib/formatters";
import type { MessageRow } from "../lib/types";
import { ColumnPicker } from "./ColumnPicker";

const COLS_LS_KEY = "sms_monitor.redis_cols.v1";

type Props = {
  rows: MessageRow[];
  onRowClick: (originalIdx: number) => void;
};

/** Ordem estável de colunas, por categoria (replicado do original). */
function colPriority(k: string): number {
  const s = k.toLowerCase();
  if (k === "_taxa_calc") return -1;
  if (k === "_campo") return 0;
  if (
    /(^|_)(data|hora|time|timestamp|created|updated|sent|received|inserted|scheduled|dt|at)($|_)/.test(
      s
    ) ||
    s.endsWith("_at")
  )
    return 1;
  if (/^(client_?id|id|campaign|ref|referencia)$/.test(s)) return 2;
  if (/(copy|mensagem|message|texto|text|conteudo|content)/.test(s)) return 3;
  if (/(taxa|rate|pct|percent)/.test(s)) return 4;
  if (/^(total|queued|enviad|sent)/.test(s)) return 5;
  if (/(deliver|entregue|success|sucesso)/.test(s)) return 6;
  if (/(error|erro|fail|falh|invalid|inval)/.test(s)) return 7;
  return 8;
}

function allKeysOf(rows: MessageRow[]): string[] {
  if (!rows.length) return [];
  const set = new Set<string>(["_taxa_calc"]);
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (k === "undefined") continue;
      if (k !== "_campo" && k.startsWith("_")) continue;
      set.add(k);
    }
  }
  return [...set].sort((a, b) => {
    const pa = colPriority(a);
    const pb = colPriority(b);
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
}

function displayName(k: string): string {
  if (k === "_campo") return "campo";
  if (k === "_taxa_calc") return "taxa";
  return k;
}

export function RedisTable({ rows, onRowClick }: Props) {
  const [filter, setFilter] = useState("");
  const [hiddenArr, setHiddenArr] = useLocalStorage<string[]>(COLS_LS_KEY, []);
  const hidden = useMemo(() => new Set(hiddenArr), [hiddenArr]);

  const allKeys = useMemo(() => allKeysOf(rows), [rows]);
  const visibleKeys = useMemo(
    () => allKeys.filter((k) => !hidden.has(k)),
    [allKeys, hidden]
  );

  const filtered = useMemo(() => {
    const fl = filter.toLowerCase().trim();
    if (!fl) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(fl))
    );
  }, [rows, filter]);

  if (!rows.length) return null;

  const countText = filter
    ? `${filtered.length} (filtrado de ${rows.length}) registros`
    : `${rows.length} registros`;

  return (
    <div className="tpanel">
      <div className="ph" style={{ flexWrap: "wrap", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          <span>Mensagens</span>
          <span className="src-tag src-redis">Redis · data específica</span>
          <input
            type="text"
            placeholder="🔍 filtrar por qualquer campo..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              fontSize: 11,
              background: "var(--bg3)",
              border: "1px solid var(--bd2)",
              borderRadius: 6,
              color: "var(--tx)",
              padding: "3px 8px",
              outline: "none",
              width: 220,
              fontFamily: "inherit",
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
            }}
          />
          <ColumnPicker
            allKeys={allKeys}
            hidden={hidden}
            onToggle={(k, visible) => {
              setHiddenArr((curr) => {
                const set = new Set(curr);
                if (visible) set.delete(k);
                else set.add(k);
                return [...set];
              });
            }}
            onSetAll={(visible) => {
              setHiddenArr(visible ? [] : allKeys);
            }}
            displayName={displayName}
          />
        </div>
        <span
          style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--tx2)" }}
        >
          {countText}
        </span>
      </div>
      <div className="twrap">
        <table>
          <thead>
            <tr>
              {visibleKeys.map((k) => (
                <th key={k}>{displayName(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 80).map((row) => {
              const originalIdx = rows.indexOf(row);
              return (
                <tr
                  key={originalIdx}
                  className="clickable-row"
                  onClick={() => onRowClick(originalIdx)}
                  title="Ver números desta mensagem"
                >
                  {visibleKeys.map((k) => {
                    if (k === "_taxa_calc") {
                      const r = computeDeliveryRate(row as Record<string, unknown>);
                      if (r === null) {
                        return (
                          <td key={k}>
                            <span className="rb rz" title="sem dados de total/entregue">
                              —
                            </span>
                          </td>
                        );
                      }
                      const cls =
                        r >= 80 ? "rg" : r >= 50 ? "ra" : r > 0 ? "rr" : "rz";
                      return (
                        <td key={k}>
                          <span className={`rb ${cls}`} title={`${r}% entregue`}>
                            {r}%
                          </span>
                        </td>
                      );
                    }
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
