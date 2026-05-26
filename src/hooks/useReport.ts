/**
 * useReport — gerencia o ciclo de polling do dashboard.
 *
 * Espelha startTimer/tick/load do sms_monitor.py original:
 *   - countdown decrementa a cada 1s
 *   - quando chega a 0, dispara load() e reinicia
 *   - paused bloqueia tanto countdown quanto load
 *   - status: "online" | "offline" | "loading" pro dot do header
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchReport } from "../lib/api";
import type { Config, ReportData } from "../lib/types";

export type Status = "online" | "offline" | "loading";

export type UseReportReturn = {
  data: ReportData | null;
  status: Status;
  paused: boolean;
  countdown: number;
  error: string | null;
  togglePause: () => void;
  refreshNow: () => void;
};

export function useReport(cfg: Config | null): UseReportReturn {
  const [data, setData] = useState<ReportData | null>(null);
  const [status, setStatus] = useState<Status>("offline");
  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs pra evitar stale closures
  const cfgRef = useRef(cfg);
  const pausedRef = useRef(paused);
  useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const load = useCallback(async () => {
    const currentCfg = cfgRef.current;
    if (!currentCfg || pausedRef.current) return;
    setStatus("loading");
    try {
      const result = await fetchReport(currentCfg);
      console.log("[SMS Monitor] redis_rows[0]:", result.redis_rows?.[0]);
      console.log("[SMS Monitor] live_rows[0]:", result.live_rows?.[0]);
      console.log("[SMS Monitor] agg_stats:", result.agg_stats);
      setData(result);
      setStatus("online");
      setError(null);
    } catch (e) {
      setStatus("offline");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Inicia polling quando cfg muda
  useEffect(() => {
    if (!cfg) return;
    setCountdown(cfg.interval);
    void load();

    const id = setInterval(() => {
      if (pausedRef.current) return;
      setCountdown((c) => {
        if (c <= 1) {
          void load();
          return cfgRef.current?.interval ?? 30;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [cfg, load]);

  const togglePause = useCallback(() => setPaused((p) => !p), []);
  const refreshNow = useCallback(() => {
    setCountdown(cfgRef.current?.interval ?? 30);
    void load();
  }, [load]);

  return { data, status, paused, countdown, error, togglePause, refreshNow };
}
