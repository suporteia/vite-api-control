/**
 * App root — alterna entre Setup (tela inicial) e Dashboard.
 */
import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { Setup } from "./components/Setup";
import { Toast } from "./components/Toast";
import { useReport } from "./hooks/useReport";
import { useToast } from "./hooks/useToast";
import type { Config } from "./lib/types";

export default function App() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const toast = useToast();
  const {
    data,
    status,
    paused,
    countdown,
    error,
    togglePause,
    refreshNow,
  } = useReport(cfg);

  return (
    <>
      {!cfg ? (
        <Setup onStart={setCfg} />
      ) : (
        <Dashboard
          cfg={cfg}
          data={data}
          status={status}
          paused={paused}
          countdown={countdown}
          error={error}
          onPause={togglePause}
          onRefresh={refreshNow}
          onApplyConfig={setCfg}
        />
      )}
      <Toast state={toast} />
    </>
  );
}
