import { useEffect, useRef, useState } from "react";
import { showToast } from "../hooks/useToast";
import { exportSnapshotXLSX } from "../lib/xlsx-export";
import type { Config, MessageRow, ReportData } from "../lib/types";
import { ConfigPanel } from "./ConfigPanel";
import { ErrorChartCodes } from "./ErrorChartCodes";
import { ErrorModal } from "./ErrorModal";
import { Header } from "./Header";
import { KPIGrid } from "./KPIGrid";
import { LiveTable } from "./LiveTable";
import { MsgModal } from "./MsgModal";
import { ProviderStrip } from "./ProviderStrip";
import { RedisTable } from "./RedisTable";
import type { Status } from "../hooks/useReport";

type Props = {
  cfg: Config;
  data: ReportData | null;
  status: Status;
  paused: boolean;
  countdown: number;
  error: string | null;
  onPause: () => void;
  onRefresh: () => void;
  onApplyConfig: (cfg: Config) => void;
};

export function Dashboard({ cfg, data, status, paused, countdown, error, onPause, onRefresh, onApplyConfig }: Props) {
  const [configOpen, setConfigOpen]        = useState(false);
  const [errorModalCode, setErrorModalCode] = useState<string | null>(null);
  const [msgModalRow, setMsgModalRow]       = useState<MessageRow | null>(null);
  const [blurred, setBlurred]               = useState(false);
  const sideGridRef = useRef<HTMLDivElement>(null);

  // Iguala altura dos dois painéis ao menor deles
  useEffect(() => {
    const grid = sideGridRef.current;
    if (!grid) return;
    const children = Array.from(grid.children) as HTMLElement[];
    if (children.length < 2) return;

    // Reset pra medir natural height
    children.forEach((c) => (c.style.height = ""));

    // Altura ditada pelo painel direito (Visão geral); esquerdo scrolla se precisar
    const heights = children.map((c) => c.scrollHeight);
    const targetH = heights[1] ?? heights[0]!;
    children.forEach((c) => (c.style.height = `${targetH}px`));
  }, [data]);

  const handleExport = () => {
    if (!data) { showToast("Aguarde os dados carregarem.", true); return; }
    const result = exportSnapshotXLSX(data);
    showToast(result.msg, !result.ok);
  };

  return (
    <>
      <Header
        status={status}
        countdown={countdown}
        paused={paused}
        cfg={cfg}
        data={data}
        onPause={onPause}
        onRefresh={onRefresh}
        onToggleConfig={() => setConfigOpen((v) => !v)}
        onExport={handleExport}
      />

      <ProviderStrip data={data} onBlurChange={setBlurred} />

      <main>
        {configOpen && (
          <ConfigPanel
            cfg={cfg}
            onApply={(newCfg) => { onApplyConfig(newCfg); setConfigOpen(false); showToast("Configuração aplicada."); }}
            onClose={() => setConfigOpen(false)}
          />
        )}

        {error && (
          <div style={{ padding: 14, marginBottom: 14, borderRadius: 10, background: "#1a0e0e", border: "1px solid var(--red)", color: "var(--tx)", fontSize: 13 }}>
            <strong style={{ color: "var(--red)" }}>Erro na conexão:</strong> {error}
            <br />
            <span style={{ fontSize: 11, color: "var(--tx2)" }}>Verifique a API key, sua conexão, e tente novamente.</span>
          </div>
        )}

        {!data && !error && <div className="empty" style={{ padding: 80 }}>Carregando dados…</div>}

        {data && (
          <>
            <KPIGrid data={data} />

            {/* Erros por código (1/3) + Visão geral ao vivo (2/3) */}
            <div className="side-grid" ref={sideGridRef}>
              <ErrorChartCodes data={data} onCodeClick={(code) => setErrorModalCode(code)} />
              {data.is_today && <LiveTable rows={data.live_rows || []} />}
            </div>

            <RedisTable
              rows={data.redis_rows || []}
              onRowClick={(idx) => setMsgModalRow((data.redis_rows || [])[idx] ?? null)}
            />
          </>
        )}
      </main>

      {errorModalCode && data && (
        <ErrorModal code={errorModalCode} data={data} onClose={() => setErrorModalCode(null)} />
      )}

      {msgModalRow && data && (
        <MsgModal row={msgModalRow} data={data} onClose={() => setMsgModalRow(null)} />
      )}
    </>
  );
}
