/**
 * Comunicação com Grafana — helpers async usando fetch nativo do Node 18+.
 * Conversão do _grafana.py mantendo o comportamento idêntico, com tipos.
 */

const GRAFANA_URL =
  process.env.GRAFANA_URL ?? "https://grafana.production.liguelead.app.br";
const REDIS_DS_UID = process.env.REDIS_DS_UID ?? "af9h69d39q4u8a";
const INFTY_DS_UID = process.env.INFTY_DS_UID ?? "bffjknuqr4t8ga";

// Timeout agressivo: cada call tem 5s. Como paralelizamos no fetchReport,
// o tempo total fica próximo do maior individual, não da soma.
const DEFAULT_TIMEOUT_MS = 20000;

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/** fetch com timeout via AbortController. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function grafanaPost(
  path: string,
  apiKey: string,
  body: unknown
): Promise<Record<string, unknown>> {
  const r = await fetchWithTimeout(`${GRAFANA_URL}${path}`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    const err = new Error(`Grafana POST ${path} → ${r.status}: ${text.slice(0, 200)}`);
    (err as Error & { status?: number }).status = r.status;
    throw err;
  }
  return (await r.json()) as Record<string, unknown>;
}

export async function grafanaGet(
  path: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const r = await fetchWithTimeout(`${GRAFANA_URL}${path}`, {
    method: "GET",
    headers: authHeaders(apiKey),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    const err = new Error(`Grafana GET ${path} → ${r.status}: ${text.slice(0, 200)}`);
    (err as Error & { status?: number }).status = r.status;
    throw err;
  }
  return (await r.json()) as Record<string, unknown>;
}

type Frame = {
  schema?: { fields?: Array<{ name?: string }> };
  data?: { values?: unknown[][] };
};

/** HGETALL no Redis via Grafana datasource. */
export async function redisHgetall(
  apiKey: string,
  keyName: string
): Promise<Record<string, string>> {
  const res = await grafanaPost("/api/ds/query", apiKey, {
    queries: [
      {
        refId: "A",
        datasource: { type: "redis-datasource", uid: REDIS_DS_UID },
        command: "hgetall",
        keyName,
        type: "command",
        streaming: false,
      },
    ],
    from: "now-1h",
    to: "now",
  });

  const frames = (res?.results as Record<string, { frames?: Frame[] }> | undefined)?.A?.frames ?? [];
  if (!frames.length) return {};
  const frame = frames[0]!;
  const fields = frame.schema?.fields ?? [];
  const values = frame.data?.values ?? [];
  if (!fields.length || !values.length) return {};
  const names = fields.map((f) => f.name ?? "");

  // Formato 1: colunas "field" / "value"
  const fi = names.indexOf("field");
  const vi = names.indexOf("value");
  if (fi !== -1 && vi !== -1) {
    const keys = values[fi] as unknown[];
    const vals = values[vi] as unknown[];
    const out: Record<string, string> = {};
    for (let i = 0; i < keys.length; i++) {
      out[String(keys[i])] = String(vals[i] ?? "");
    }
    return out;
  }

  // Formato 2: cada campo do hash = coluna, uma linha
  if ((values[0] as unknown[] | undefined)?.length) {
    const out: Record<string, string> = {};
    for (let i = 0; i < names.length; i++) {
      const col = values[i] as unknown[];
      if (col?.length) out[names[i]!] = String(col[0] ?? "");
    }
    return out;
  }

  return {};
}

/** KEYS no Redis via Grafana datasource. */
export async function redisKeys(apiKey: string, pattern: string): Promise<string[]> {
  try {
    const res = await grafanaPost("/api/ds/query", apiKey, {
      queries: [
        {
          refId: "A",
          datasource: { type: "redis-datasource", uid: REDIS_DS_UID },
          command: "keys",
          keyName: pattern,
          type: "command",
          streaming: false,
        },
      ],
      from: "now-1h",
      to: "now",
    });
    const frames = (res?.results as Record<string, { frames?: Frame[] }> | undefined)?.A?.frames ?? [];
    if (!frames.length) return [];
    return (frames[0]!.data?.values?.[0] as string[]) ?? [];
  } catch (e) {
    console.warn("[AVISO] KEYS:", e);
    return [];
  }
}

/** Visão geral ao vivo via Infinity datasource. */
export async function fetchLiveOverview(
  apiKey: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const ds = await grafanaGet(`/api/datasources/uid/${INFTY_DS_UID}`, apiKey);
    const dsid = ds.id;
    const path =
      "/v1/_redis/client-channel-overview?channel_type=sms&client_ids=all";
    const raw = await grafanaGet(
      `/api/datasources/proxy/${dsid}${path}`,
      apiKey
    );
    const entries =
      raw && typeof raw === "object" && "entries" in raw
        ? (raw as { entries?: unknown }).entries
        : raw;
    return Array.isArray(entries) ? (entries as Array<Record<string, unknown>>) : [];
  } catch (e) {
    console.warn("[AVISO] Infinity:", e);
    return [];
  }
}

/**
 * Parse de um HASH do Redis:
 *  - Se os valores forem JSON parseáveis, retorna como linhas
 *  - Senão, retorna o hash flat como agg_stats
 */
export function parseHash(
  hashData: Record<string, string>
): {
  aggStats: Record<string, string>;
  msgRows: Array<Record<string, unknown>>;
} {
  if (!hashData || !Object.keys(hashData).length) {
    return { aggStats: {}, msgRows: [] };
  }
  const rows: Array<Record<string, unknown>> = [];
  for (const [field, val] of Object.entries(hashData)) {
    try {
      const obj = JSON.parse(val);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) {
        if (!("_campo" in obj)) obj._campo = field;
        rows.push(obj);
      }
    } catch {
      /* não é JSON, ignora */
    }
  }
  if (rows.length) return { aggStats: {}, msgRows: rows };
  return { aggStats: hashData, msgRows: [] };
}
