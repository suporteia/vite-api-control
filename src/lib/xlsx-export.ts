/**
 * Exportação XLSX — replica exportSnapshotXLSX() e exportFailuresXLSX()
 * do sms_monitor.py original. Usa SheetJS via import direto.
 */
import * as XLSX from "xlsx";
import { errInfo } from "./error-info";
import { formatPhone, num } from "./formatters";
import type { FailureRow, MessageRow, ReportData } from "./types";

function xlsxDate(v: unknown): string {
  if (v == null || v === "") return "";
  const d = v instanceof Date ? v : new Date(v as string);
  if (isNaN(d.getTime())) return String(v);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function addFreezeAndFilter(
  ws: XLSX.WorkSheet,
  nRows: number,
  nCols: number
): void {
  if (nRows < 2 || nCols < 1) return;
  // Freeze panes (header sempre visível)
  (ws as XLSX.WorkSheet & { "!sheetviews"?: unknown[] })["!sheetviews"] = [
    { xSplit: 0, ySplit: 1 },
  ];
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: nRows - 1, c: nCols - 1 },
    }),
  };
  // Header bold
  for (let c = 0; c < nCols; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr] as XLSX.CellObject | undefined;
    if (cell) (cell as XLSX.CellObject & { s?: unknown }).s = { font: { bold: true } };
  }
}

function buildMensagensSheet(rows: MessageRow[]): XLSX.WorkSheet {
  type Col = { h: string; w: number; get: (r: MessageRow) => unknown };
  const cols: Col[] = [
    { h: "Cliente", w: 10, get: (r) => r.client_id ?? "" },
    { h: "UUID", w: 38, get: (r) => r.uuid ?? "" },
    {
      h: "Texto da mensagem",
      w: 60,
      get: (r) =>
        String((r.text || r.message || r.mensagem) ?? "")
          .replace(/\s+/g, " ")
          .trim(),
    },
    { h: "Tipo", w: 8, get: (r) => r.type ?? "" },
    { h: "Total", w: 9, get: (r) => num(r.queued ?? r.total ?? r.sent) },
    { h: "Entregues", w: 11, get: (r) => num(r.delivered ?? r.success) },
    {
      h: "Taxa de entrega (%)",
      w: 18,
      get: (r) => {
        const t = Number(r.queued ?? r.total ?? r.sent ?? 0) || 0;
        const d = Number(r.delivered ?? r.success ?? 0) || 0;
        return t > 0 ? Math.round((d / t) * 1000) / 10 : "";
      },
    },
    { h: "Em andamento", w: 13, get: (r) => num(r.in_progress) },
    { h: "Número inválido", w: 16, get: (r) => num(r.invalid_number) },
    { h: "Inacessível", w: 13, get: (r) => num(r.unreachable) },
    { h: "Opt-out", w: 10, get: (r) => num(r.opt_out) },
    { h: "Bloqueio policy", w: 15, get: (r) => num(r.policy_block) },
    { h: "Erro genérico", w: 14, get: (r) => num(r.generic_error) },
    { h: "Erro config", w: 13, get: (r) => num(r.config_error) },
    { h: "Erro requisição", w: 15, get: (r) => num(r.request_error) },
    { h: "Erro desconhecido", w: 17, get: (r) => num(r.unknown_error) },
    { h: "Última atualização", w: 20, get: (r) => xlsxDate(r.last_update) },
    { h: "Visto pelo monitor", w: 20, get: (r) => xlsxDate(r._first_seen) },
  ];
  const header = cols.map((c) => c.h);
  const data = rows.map((r) => cols.map((c) => c.get(r)));
  const aoa = [header, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = cols.map((c) => ({ wch: c.w }));
  addFreezeAndFilter(ws, aoa.length, cols.length);
  return ws;
}

function buildFalhasSheet(rows: FailureRow[]): XLSX.WorkSheet {
  type Col = { h: string; w: number; get: (r: FailureRow) => unknown };
  const cols: Col[] = [
    {
      h: "Telefone",
      w: 18,
      get: (r) => formatPhone(r.phone || r.telefone || r.numero),
    },
    {
      h: "Telefone (cru)",
      w: 16,
      get: (r) => String(r.phone || r.telefone || r.numero || ""),
    },
    { h: "Cliente", w: 10, get: (r) => r.client_id ?? "" },
    { h: "Gateway", w: 14, get: (r) => r.gateway ?? "" },
    { h: "Código", w: 9, get: (r) => r.error_code || r.code || "" },
    {
      h: "Tipo do erro",
      w: 14,
      get: (r) => {
        const ei = errInfo(r.error_code || r.code || "?", String(r.gateway || ""));
        return ei.type === "Permanent"
          ? "Permanente"
          : ei.type === "Temporary"
            ? "Temporário"
            : "?";
      },
    },
    {
      h: "Classe",
      w: 13,
      get: (r) => {
        const ei = errInfo(r.error_code || r.code || "?", String(r.gateway || ""));
        return ei.cls || "";
      },
    },
    {
      h: "Descrição",
      w: 50,
      get: (r) => {
        const ei = errInfo(r.error_code || r.code || "?", String(r.gateway || ""));
        return ei.desc_pt || ei.desc || "";
      },
    },
    {
      h: "Ocorreu em",
      w: 20,
      get: (r) => xlsxDate(r.occurred_at || r.occurredAt || r.timestamp),
    },
    { h: "Categoria", w: 16, get: (r) => r.categoria || r.category || "" },
    {
      h: "Mensagem (erro)",
      w: 60,
      get: (r) =>
        String((r.message || r.mensagem || r.msg) ?? "")
          .replace(/\s+/g, " ")
          .trim(),
    },
  ];
  const header = cols.map((c) => c.h);
  const data = rows.map((r) => cols.map((c) => c.get(r)));
  const aoa = [header, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = cols.map((c) => ({ wch: c.w }));
  addFreezeAndFilter(ws, aoa.length, cols.length);
  return ws;
}

export function exportSnapshotXLSX(data: ReportData): { ok: boolean; msg: string } {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumo
  const resumo: (string | number | "")[][] = [
    ["Snapshot SMS Monitor"],
    [],
    ["Data", data.date],
    ["Cliente", data.client_key],
    ["Atualizado em", data.updated_at],
    ["Fonte dos totais", data.totals_source],
    [],
    ["Total enviado", num(data.total_sent)],
    ["Total entregue", num(data.total_recv)],
    ["Taxa de entrega (%)", num(data.delivery_rate)],
    ["Total de erros", num(data.total_errors)],
    [],
    ["Erros por código", "Quantidade", "Tipo", "Classe", "Descrição"],
  ];
  for (const [code, n] of Object.entries(data.err_by_code || {})) {
    const ei = errInfo(code);
    const tipo =
      ei.type === "Permanent"
        ? "Permanente"
        : ei.type === "Temporary"
          ? "Temporário"
          : "?";
    resumo.push([code, n, tipo, ei.cls || "", ei.desc_pt || ei.desc || ""]);
  }
  resumo.push([], ["Erros por gateway", "Quantidade"]);
  for (const [gw, n] of Object.entries(data.err_by_gw || {})) {
    resumo.push([gw, n]);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(resumo);
  ws1["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Resumo");

  // Sheet 2: Mensagens
  const msgs = data.redis_rows || [];
  if (msgs.length) {
    const sorted = [...msgs].sort((a, b) =>
      String(a._first_seen ?? "").localeCompare(String(b._first_seen ?? ""))
    );
    XLSX.utils.book_append_sheet(wb, buildMensagensSheet(sorted), "Mensagens");
  }

  // Sheet 3: Falhas
  const fails = data.errors_raw || [];
  if (fails.length) {
    XLSX.utils.book_append_sheet(wb, buildFalhasSheet(fails), "Falhas");
  }

  const date = data.date || "snapshot";
  const client = data.client_key || "all";
  XLSX.writeFile(wb, `sms_monitor_${client}_${date}.xlsx`);
  return {
    ok: true,
    msg: `✓ XLSX exportado (${msgs.length} msgs · ${fails.length} falhas)`,
  };
}

export function exportFailuresXLSX(
  rows: FailureRow[],
  meta: { uuid?: string; date?: string }
): { ok: boolean; msg: string } {
  if (!rows.length) return { ok: false, msg: "Nada filtrado pra exportar." };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildFalhasSheet(rows), "Falhas");
  const id = (meta.uuid || "falhas").slice(0, 8);
  const date = meta.date || "snapshot";
  XLSX.writeFile(wb, `sms_falhas_${id}_${date}.xlsx`);
  return { ok: true, msg: `✓ XLSX exportado (${rows.length} falhas)` };
}
