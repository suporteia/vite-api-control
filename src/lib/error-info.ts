/**
 * Lógica de informação de erros — espelha errInfo() e detectGatewayForCode()
 * do sms_monitor.py original.
 *
 * detectGatewayForCode usa os errors_raw atuais pra decidir se um código
 * apareceu mais vezes vindo da Pontal ou da Sinch.
 */
import { SINCH_CODES, type ErrorInfo } from "./sinch-codes";
import { PONTAL_CODES } from "./pontal-codes";
import type { ReportData } from "./types";

type ErrInfoResult = ErrorInfo & {
  _gateway?: "pontal" | "sinch" | "?";
  _fallback?: boolean;
};

/**
 * Olha os errors_raw mais recentes e descobre qual gateway predomina pra
 * um determinado código. Robusto a variações tipo "pontal", "Pontaltech",
 * "pontal-api" etc. (case-insensitive contains).
 */
export function detectGatewayForCode(
  code: string | number,
  reportData: ReportData | null
): "pontal" | "sinch" | "" {
  if (!reportData?.errors_raw) return "";
  let pontal = 0,
    sinch = 0,
    other = 0;
  const target = String(code);
  for (const e of reportData.errors_raw) {
    if (String(e.error_code ?? e.code ?? "?") !== target) continue;
    const g = String(e.gateway ?? "").toLowerCase();
    if (g.includes("pontal")) pontal++;
    else if (g.includes("sinch")) sinch++;
    else other++;
  }
  if (pontal === 0 && sinch === 0) return "";
  return pontal > sinch ? "pontal" : "sinch";
}

/**
 * Retorna info de erro pro código dado.
 * Se `gateway` não vier, tenta descobrir pelos logs em reportData.
 * Default = Sinch (tabela maior, comportamento legado).
 *
 * Quando o código existe só na "outra" tabela, retorna com _fallback=true
 * e marca _gateway="?" pra UI mostrar aviso de ambiguidade.
 */
export function errInfo(
  code: string | number,
  gateway?: string,
  reportData?: ReportData | null
): ErrInfoResult {
  const gw = String(
    gateway || detectGatewayForCode(code, reportData ?? null) || ""
  ).toLowerCase();
  const isPontal = gw.includes("pontal");
  const codeNum = parseInt(String(code), 10);

  const primary = isPontal ? PONTAL_CODES : SINCH_CODES;
  const c = primary[codeNum];
  if (c) return { ...c, _gateway: isPontal ? "pontal" : "sinch" };

  // Fallback: tenta a outra tabela e marca como ambíguo
  const fallback = isPontal ? SINCH_CODES : PONTAL_CODES;
  const fb = fallback[codeNum];
  if (fb) {
    const otherName = isPontal ? "Sinch" : "Pontal";
    return {
      ...fb,
      _gateway: "?",
      _fallback: true,
      desc_pt:
        (fb.desc_pt || fb.desc) +
        ` (tabela ${otherName} — gateway não identificado)`,
    };
  }

  return {
    cls: "UNKNOWN",
    title: "Código não mapeado",
    title_en: "Unmapped code",
    desc: "Code not mapped in any known table",
    desc_pt: "Código não mapeado em nenhuma tabela",
    type: "",
  };
}
