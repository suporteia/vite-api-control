import type { Config, ReportData } from "../lib/types";
import type { Status } from "../hooks/useReport";

type Props = {
  status: Status;
  countdown: number;
  paused: boolean;
  cfg: Config | null;
  data: ReportData | null;
  onPause: () => void;
  onRefresh: () => void;
  onToggleConfig: () => void;
  onExport: () => void;
};

export function Header({
  status,
  countdown,
  paused,
  cfg,
  data,
  onPause,
  onRefresh,
  onToggleConfig,
  onExport,
}: Props) {
  const dotClass = `dot dot-${status}`;
  const m = Math.floor(countdown / 60);
  const s = countdown % 60;
  const countdownText = paused
    ? "⏸ pausado"
    : `${m > 0 ? `${m}m ` : ""}${s}s`;

  const sub = data
    ? `${data.date} · ${data.client_key}${cfg?.copy ? ` · "${cfg.copy}"` : ""} · att ${data.updated_at}`
    : "Aguardando";

  return (
    <header className="app-header">
      <div className="logo">
        <div className={dotClass} />
        <div>
          <div className="logo-name">SMS Monitor</div>
          <div className="logo-sub">{sub}</div>
        </div>
      </div>
      <div className="hdr-right">
        <div className="badge">{countdownText}</div>
        <button
          className="btn"
          onClick={onPause}
          title={paused ? "Retomar" : "Pausar"}
        >
          {paused ? "▶" : "⏸"}
        </button>
        <button className="btn" onClick={onRefresh} title="Atualizar agora">
          ↻
        </button>
        <button className="btn" onClick={onToggleConfig}>
          ⚙ Config
        </button>
        <button
          className="btn"
          onClick={onExport}
          title="Baixar snapshot completo em XLSX"
        >
          ↓ XLSX
        </button>
      </div>
    </header>
  );
}
