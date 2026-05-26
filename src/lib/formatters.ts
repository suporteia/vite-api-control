/**
 * Formatters — espelha as funções JS do sms_monitor.py original:
 *   formatPhone, formatDateTime, looksLikeTimestamp, isTimestampField,
 *   maybeFormatValue, computeDeliveryRate, escapeHtml, fmt.
 */

/** Detecta strings que cheiram a timestamp (ISO, unix seconds/millis, BR). */
export function looksLikeTimestamp(v: unknown): boolean {
  if (v == null || v === "") return false;
  const s = String(v).trim();
  if (/^\d{10}$/.test(s)) return true; // unix seconds
  if (/^\d{13}$/.test(s)) return true; // unix millis
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) return true; // ISO 8601
  if (/^\d{2}\/\d{2}\/\d{4}([ T]\d{2}:\d{2})?/.test(s)) return true; // BR
  return false;
}

/** Detecta nomes de campo que costumam guardar timestamp. */
export function isTimestampField(k: string): boolean {
  if (!k) return false;
  const s = String(k).toLowerCase();
  return (
    /(^|_)(data|hora|time|timestamp|created|updated|sent|received|inserted|scheduled|dt|at)($|_)/.test(
      s
    ) ||
    s.endsWith("_at") ||
    s === "_campo" // no Pontal a key do hash às vezes é o timestamp
  );
}

/** Formata pra "DD/MM/YYYY HH:MM:SS" no fuso local. */
export function formatDateTime(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  let d: Date;
  if (/^\d{10}$/.test(s)) d = new Date(parseInt(s, 10) * 1000);
  else if (/^\d{13}$/.test(s)) d = new Date(parseInt(s, 10));
  else if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return s; // já está formatado em BR
  else d = new Date(s);

  if (!d || isNaN(d.getTime())) return s;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Formata se for timestamp, senão retorna string crua. */
export function maybeFormatValue(k: string, v: unknown): string {
  if (looksLikeTimestamp(v) || isTimestampField(k)) return formatDateTime(v);
  return String(v ?? "");
}

/** Telefone BR: 5511987654321 → (11) 9 8765-4321 */
export function formatPhone(v: unknown): string {
  if (!v) return "";
  const digits = String(v).replace(/\D/g, "");
  if (digits.length < 10) return String(v);
  const d =
    digits.length === 13 && digits.startsWith("55")
      ? digits.slice(2)
      : digits.length === 12 && digits.startsWith("55")
        ? digits.slice(2)
        : digits;
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return String(v);
}

/** Taxa de entrega de UMA linha (delivered/total). */
export function computeDeliveryRate(row: Record<string, unknown>): number | null {
  const total = parseFloat(
    String(row.total ?? row.queued ?? row.sent ?? row.enviado ?? 0)
  );
  const recv = parseFloat(
    String(
      row.delivered ?? row.success ?? row.entregue ?? row.entregues ?? 0
    )
  );
  if (!total || total <= 0 || isNaN(total)) return null;
  return Math.round((recv / total) * 1000) / 10;
}

/** Number → string com separador BR (1.234.567). */
export function fmt(n: number): string {
  return Number(n).toLocaleString("pt-BR");
}

/** parseFloat seguro retornando "" se NaN/null (pra cells de XLSX). */
export function num(v: unknown): number | "" {
  if (v == null || v === "") return "";
  const n = Number(v);
  return isNaN(n) ? "" : n;
}
