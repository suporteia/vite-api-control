/**
 * Cache _first_seen das mensagens.
 *
 * Em produção: Upstash Redis (HASH "sms_monitor:first_seen").
 * Em dev sem Upstash configurado: fallback in-memory que persiste enquanto
 * o processo do Vite estiver vivo (some no Ctrl+C, igual ao comportamento
 * antigo do arquivo ~/.sms_monitor_first_seen.json era específico da
 * máquina do operador).
 */
import { Redis } from "@upstash/redis";

const CACHE_KEY = "sms_monitor:first_seen";

/** Fallback in-memory pra dev sem Upstash. */
const memoryCache: Record<string, string> = {};

function getClient(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function loadSeen(): Promise<Record<string, string>> {
  const client = getClient();
  if (!client) return { ...memoryCache };
  try {
    const data = await client.hgetall<Record<string, string>>(CACHE_KEY);
    return data ?? {};
  } catch (e) {
    console.warn("[AVISO] loadSeen:", e);
    return {};
  }
}

export async function markSeen(
  msgIds: string[],
  existing: Record<string, string>
): Promise<Record<string, string>> {
  const nowIso = new Date().toISOString();
  const novos: Record<string, string> = {};
  for (const mid of msgIds) {
    if (mid && !(mid in existing)) novos[mid] = nowIso;
  }
  if (!Object.keys(novos).length) return existing;

  const client = getClient();
  if (!client) {
    // Sem Upstash → escreve no fallback in-memory
    Object.assign(memoryCache, novos);
    return { ...existing, ...novos };
  }

  try {
    await client.hset(CACHE_KEY, novos);
  } catch (e) {
    console.warn("[AVISO] markSeen hset:", e);
    return existing;
  }
  return { ...existing, ...novos };
}
