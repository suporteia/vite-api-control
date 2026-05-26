import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Plugin que emula as Vercel Serverless Functions localmente.
 * Intercepta /api/* e roda os handlers de api/*.ts via Vite SSR.
 * Hot reload automático — se tu editar api/report.ts, a próxima request
 * já usa a versão nova, sem reiniciar o servidor.
 */
function vercelApiEmulator(): Plugin {
  return {
    name: "vercel-api-emulator",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) return next();

        const parsed = new URL(url, "http://localhost");
        const apiName = parsed.pathname.replace(/^\/api\//, "").replace(/\/$/, "");
        const handlerPath = resolve(__dirname, "api", `${apiName}.ts`);

        if (!existsSync(handlerPath)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Handler /api/${apiName} não encontrado` }));
          return;
        }

        try {
          const mod = await server.ssrLoadModule(handlerPath);
          const handler = mod.default;
          if (typeof handler !== "function") {
            throw new Error(`api/${apiName}.ts não exporta um handler default`);
          }

          // Adapta IncomingMessage → VercelRequest
          const vercelReq = Object.assign(req, {
            query: Object.fromEntries(parsed.searchParams.entries()),
            cookies: {},
            body: undefined,
          });

          // Adapta ServerResponse → VercelResponse
          const vercelRes = Object.assign(res, {
            status(code: number) {
              res.statusCode = code;
              return vercelRes;
            },
            json(body: unknown) {
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify(body));
              return vercelRes;
            },
            send(body: string | Buffer) {
              res.end(body);
              return vercelRes;
            },
          });

          await handler(vercelReq, vercelRes);
        } catch (e) {
          console.error("[/api error]", e);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: (e as Error).message ?? "erro desconhecido" })
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Carrega TODAS as env vars do .env / .env.local (não só VITE_*)
  // e injeta em process.env pro back-end (handlers /api/*) ter acesso.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(env)) {
    if (!(k in process.env)) process.env[k] = v;
  }

  return {
    plugins: [react(), vercelApiEmulator()],
    server: { port: 5173 },
  };
});
