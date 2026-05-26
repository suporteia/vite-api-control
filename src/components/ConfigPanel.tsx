import { useEffect, useState } from "react";
import type { Config } from "../lib/types";

type Props = {
  cfg: Config;
  onApply: (cfg: Config) => void;
  onClose: () => void;
};

export function ConfigPanel({ cfg, onApply, onClose }: Props) {
  const [apiKey, setApiKey] = useState(cfg.apiKey);
  const [date, setDate] = useState(cfg.date);
  const [clientId, setClientId] = useState(cfg.clientId);
  const [copy, setCopy] = useState(cfg.copy);
  const [interval, setInterval] = useState(cfg.interval);

  useEffect(() => {
    setApiKey(cfg.apiKey);
    setDate(cfg.date);
    setClientId(cfg.clientId);
    setCopy(cfg.copy);
    setInterval(cfg.interval);
  }, [cfg]);

  const handleApply = () => {
    const key = apiKey.trim();
    if (!key) {
      alert("API Key obrigatória.");
      return;
    }
    onApply({
      apiKey: key,
      date,
      clientId: clientId.trim(),
      copy: copy.trim(),
      interval: interval || 30,
    });
  };

  return (
    <div id="cfg">
      <div className="cfg-grid">
        <div>
          <label>API Key</label>
          <input
            type="password"
            placeholder="glsa_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <div>
          <label>Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label>ID Cliente</label>
          <input
            type="text"
            placeholder="opcional"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
        </div>
        <div>
          <label>Filtro copy</label>
          <input
            type="text"
            placeholder="ex: APOSTATUDO"
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
          />
        </div>
        <div>
          <label>Intervalo</label>
          <select
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value, 10))}
          >
            <option value="10">10 segundos</option>
            <option value="30">30 segundos</option>
            <option value="60">1 minuto</option>
            <option value="120">2 minutos</option>
          </select>
        </div>
      </div>
      <div className="cfg-actions">
        <button className="btn btn-save" onClick={handleApply}>
          ✓ Aplicar
        </button>
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
