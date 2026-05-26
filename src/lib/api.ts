/**
 * Cliente HTTP do backend /api/report.
 *
 * Front e back rodam no mesmo origin (em dev, via plugin Vite; em prod, via Vercel).
 * Por isso o fetch é direto em "/api/report", sem env vars.
 */
import type { Config, ReportData } from "./types";

export async function fetchReport(cfg: Config): Promise<ReportData> {
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    api_key: cfg.apiKey,
    date: cfg.date || today,
    client_id: cfg.clientId,
    copy: cfg.copy,
  });
  const r = await fetch(`/api/report?${params}`);
  if (!r.ok) {
    const text = await r.text();
    let msg = text;
    try {
      const obj = JSON.parse(text);
      msg = obj.error || text;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await r.json()) as ReportData;
}
