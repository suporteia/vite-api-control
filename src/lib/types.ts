/**
 * Tipos do payload que vem de /api/report.
 * Espelha exatamente o que fetch_report() retorna no api/report.py.
 */

export type MessageRow = {
  uuid?: string;
  client_id?: string | number;
  text?: string;
  message?: string;
  mensagem?: string;
  copy?: string;
  type?: string;
  tipo?: string;
  channel_type?: string;
  gateway?: string;
  canal?: string;
  total?: string | number;
  queued?: string | number;
  sent?: string | number;
  delivered?: string | number;
  success?: string | number;
  errors?: string | number;
  erros?: string | number;
  failed?: string | number;
  invalid?: string | number;
  last_update?: string;
  _campo?: string;
  _first_seen?: string;
  // permite acessar qualquer outro campo dinamicamente
  [key: string]: unknown;
};

export type FailureRow = {
  phone?: string;
  telefone?: string;
  numero?: string;
  client_id?: string | number;
  gateway?: string;
  error_code?: string | number;
  code?: string | number;
  occurred_at?: string;
  occurredAt?: string;
  timestamp?: string;
  message?: string;
  mensagem?: string;
  msg?: string;
  category?: string;
  categoria?: string;
  _campo?: string;
  raw?: string;
  [key: string]: unknown;
};

export type ReportData = {
  date: string;
  is_today: boolean;
  client_key: string;
  agg_stats: Record<string, string>;
  redis_rows: MessageRow[];
  live_rows: MessageRow[];
  errors_raw: FailureRow[];
  total_sent: number;
  total_recv: number;
  delivery_rate: number | null;
  totals_source: string;
  total_errors: number;
  err_by_code: Record<string, number>;
  err_by_gw: Record<string, number>;
  updated_at: string;
};

export type Config = {
  apiKey: string;
  date: string;
  clientId: string;
  copy: string;
  interval: number;
};
