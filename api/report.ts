/**
 * Endpoint /api/report — conversão de report.py pra TypeScript.
 *
 * Recebe via query string:
 *   api_key   (obrigatório) — API key do Grafana
 *   date      (opcional, default = hoje) — YYYY-MM-DD
 *   client_id (opcional, default = "all")
 *   copy      (opcional) — filtro por substring de copy
 *
 * Retorna o mesmo formato do report.py original.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  fetchLiveOverview,
  parseHash,
  redisHgetall,
  redisKeys,
} from "./_grafana.js";
import { loadSeen, markSeen } from "./_seen_cache.js";

function toInt(v: unknown): number {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : Math.trunc(n);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export type ReportData = {
  date: string;
  is_today: boolean;
  client_key: string;
  agg_stats: Record<string, string>;
  redis_rows: Array<Record<string, unknown>>;
  live_rows: Array<Record<string, unknown>>;
  errors_raw: Array<Record<string, unknown>>;
  total_sent: number;
  total_recv: number;
  delivery_rate: number | null;
  totals_source: string;
  total_errors: number;
  err_by_code: Record<string, number>;
  err_by_gw: Record<string, number>;
  updated_at: string;
};

export async function fetchReport(
  apiKey: string,
  dateStrIn: string,
  clientId: string,
  copyFilter: string
): Promise<ReportData> {
  const today = todayISO();
  const dateStr = dateStrIn || today;
  const ck = clientId.trim() || "all";
  const isToday = dateStr === today;

  const monKey = `sms:mon:${ck}:${dateStr}:all`;
  const failKey = `sms:fail:logs:${dateStr}`;

  // 1. Dispara em paralelo
  const [seenCacheInitial, monHashInitial, failHash, liveRowsInitial] =
    await Promise.all([
      loadSeen(),
      redisHgetall(apiKey, monKey),
      redisHgetall(apiKey, failKey),
      isToday ? fetchLiveOverview(apiKey) : Promise.resolve([] as Array<Record<string, unknown>>),
    ]);

  // 2. Fallback Redis: se monHash veio vazio, busca chave alternativa
  let monHash = monHashInitial;
  if (!Object.keys(monHash).length) {
    const keys = await redisKeys(apiKey, `sms:mon:*:${dateStr}:*`);
    if (keys.length) {
      monHash = await redisHgetall(apiKey, keys[0]!);
    }
  }

  let { aggStats, msgRows: msgRowsRedis } = parseHash(monHash);

  // 3. Marca _first_seen (1 round-trip ao Upstash)
  const msgIds = msgRowsRedis
    .map((r) => String(r.uuid ?? r._campo ?? ""))
    .filter(Boolean);
  const seenCache = await markSeen(msgIds, seenCacheInitial);
  for (const row of msgRowsRedis) {
    const mid = String(row.uuid ?? row._campo ?? "");
    if (mid && mid in seenCache) row._first_seen = seenCache[mid];
  }

  // 4. Parse de errors_raw
  let errors: Array<Record<string, unknown>> = [];
  for (const [field, val] of Object.entries(failHash)) {
    try {
      const obj = JSON.parse(val);
      if (Array.isArray(obj)) errors.push(...obj);
      else if (obj && typeof obj === "object") errors.push(obj);
    } catch {
      errors.push({ _campo: field, raw: String(val).slice(0, 200) });
    }
  }

  // 5. Filtro por copy
  let liveRows = liveRowsInitial;
  const copyLow = copyFilter ? copyFilter.toLowerCase().trim() : "";
  if (copyLow) {
    const matches = (item: Record<string, unknown>) =>
      Object.values(item).some((v) => String(v).toLowerCase().includes(copyLow));
    errors = errors.filter(matches);
    msgRowsRedis = msgRowsRedis.filter(matches);
    liveRows = liveRows.filter(matches);
  }

  // 6. Totais — Redis é fonte primária
  let sent = 0;
  let recv = 0;
  let totalsSource = "none";

  if (Object.keys(aggStats).length) {
    sent = toInt(aggStats.queued ?? aggStats.total ?? aggStats.sent ?? 0);
    recv = toInt(aggStats.delivered ?? aggStats.success ?? 0);
    totalsSource = "redis-agg";
  } else if (msgRowsRedis.length) {
    sent = msgRowsRedis.reduce(
      (acc, r) => acc + toInt(r.total ?? r.queued ?? 0),
      0
    );
    recv = msgRowsRedis.reduce(
      (acc, r) => acc + toInt(r.delivered ?? r.success ?? 0),
      0
    );
    totalsSource = "redis-rows";
  } else if (isToday && liveRows.length && !copyLow) {
    let rowsT = liveRows;
    if (ck !== "all") {
      rowsT = liveRows.filter((r) => String(r.client_id ?? "") === ck);
    }
    sent = rowsT.reduce((acc, r) => acc + toInt(r.total ?? 0), 0);
    recv = rowsT.reduce((acc, r) => acc + toInt(r.success ?? 0), 0);
    totalsSource = "infinity-fallback";
  }

  const rate = sent > 0 ? Math.round((recv / sent) * 1000) / 10 : null;

  const errByCode: Record<string, number> = {};
  const errByGw: Record<string, number> = {};
  for (const e of errors) {
    const code = String(e.error_code ?? e.code ?? "?");
    const gw = String(e.gateway ?? "?");
    errByCode[code] = (errByCode[code] ?? 0) + 1;
    errByGw[gw] = (errByGw[gw] ?? 0) + 1;
  }

  // Ordena descendente por contagem
  const sortDesc = (obj: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]));

  const updatedAt = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return {
    date: dateStr,
    is_today: isToday,
    client_key: ck,
    agg_stats: aggStats,
    redis_rows: msgRowsRedis,
    live_rows: liveRows,
    errors_raw: errors,
    total_sent: sent,
    total_recv: recv,
    delivery_rate: rate,
    totals_source: totalsSource,
    total_errors: errors.length,
    err_by_code: sortDesc(errByCode),
    err_by_gw: sortDesc(errByGw),
    updated_at: updatedAt,
  };
}

// ── Handler Vercel ─────────────────────────────────────────────────────────
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS (em produção mesmo domínio não precisa, mas facilita debug local)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Use GET" });
    return;
  }

  const q = (key: string, def = ""): string => {
    const v = req.query[key];
    return Array.isArray(v) ? (v[0] ?? def) : (v ?? def);
  };

  const apiKey = q("api_key");
  if (!apiKey) {
    res.status(400).json({ error: "api_key obrigatório" });
    return;
  }

  try {
    const data = await fetchReport(
      apiKey,
      q("date"),
      q("client_id"),
      q("copy")
    );
    res.status(200).json(data);
  } catch (e) {
    const err = e as Error & { status?: number; cause?: unknown };
    const status = err.status ?? 500;
    // Log COMPLETO no console da Vercel (Functions Logs)
    console.error("[/api/report ERRO]", {
      name: err.name,
      message: err.message,
      status,
      stack: err.stack,
      cause: err.cause,
    });
    // Resposta inclui detalhes úteis pra debug no front
    res.status(status).json({
      error: err.message || "Erro desconhecido",
      type: err.name,
      // só inclui stack em dev (Vercel define VERCEL_ENV)
      ...(process.env.VERCEL_ENV !== "production" && { stack: err.stack }),
    });
  }
}