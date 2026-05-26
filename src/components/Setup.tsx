import { useState } from "react";
import type { Config } from "../lib/types";

type Props = {
  onStart: (cfg: Config) => void;
};

export function Setup({ onStart }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [date, setDate] = useState("");
  const [clientId, setClientId] = useState("");
  const [copy, setCopy] = useState("");
  const [interval, setInterval] = useState(30);

  const handleStart = () => {
    const key = apiKey.trim();
    if (!key) {
      alert("Informe a API Key.");
      return;
    }
    onStart({
      apiKey: key,
      date,
      clientId: clientId.trim(),
      copy: copy.trim(),
      interval: interval || 30,
    });
  };

  return (
    <div id="setup">
      <div className="card">
        <h1>SMS Monitor</h1>
        <p>Configure abaixo para iniciar o monitoramento em tempo real.</p>

        <div className="field">
          <label>API Key do Grafana</label>
          <input
            type="password"
            placeholder="glsa_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Data (vazio = hoje)</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label>ID Cliente (opcional)</label>
          <input
            type="text"
            placeholder="ex: 7859"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Filtro por copy</label>
          <input
            type="text"
            placeholder="ex: APOSTATUDO"
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Intervalo</label>
          <select
            value={interval}
            onChange={(e) => setInterval(parseInt(e.target.value, 10))}
          >
            <option value="10">10 segundos</option>
            <option value="30">30 segundos</option>
            <option value="60">1 minuto</option>
          </select>
        </div>

        <button className="btn-prim" onClick={handleStart}>
          Iniciar monitoramento
        </button>
      </div>
    </div>
  );
}
