# SMS Monitor — LigueLead

Dashboard em tempo real pra monitorar campanhas de SMS via Grafana.

**Stack 100% TypeScript** — front (React) e back (Vercel Serverless Functions) na mesma linguagem, tipos compartilhados, hot reload em ambos. Deploy automático: push em `main` → produção; push em qualquer outra branch → preview isolado.

---

## 🎯 Visão geral

```
┌─────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│   Operadores    │───▶│  sms-monitor.        │───▶│  Grafana LigueLead │
│  (navegador)    │    │  vercel.app          │    │  (Redis + Infinity)│
└─────────────────┘    │                      │    └────────────────────┘
                       │  ┌────────────────┐  │
                       │  │  /api/report   │──┼──▶ Upstash Redis
                       │  │  (TypeScript)  │  │    (cache _first_seen)
                       │  └────────────────┘  │
                       │                      │
                       │  React + Vite (UI)   │
                       └──────────────────────┘
```

- Operadores acessam a URL → tela inicial pede a **API key do Grafana**.
- A chave fica só na memória do navegador. **Servidor não armazena nada.**
- `/api/report` é uma serverless function TS que chama o Grafana em paralelo e devolve agregado.
- Upstash guarda só `{uuid_da_msg: hora_que_vi}` (pro painel "Ordem de entrada das copies").

---

## ⚡ Rodando localmente (1 comando)

**Pré-requisito**: Node 18+ instalado.

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Tudo (front + back) roda num único processo do Vite, com hot reload em ambos:

- Editou um `.tsx` → navegador atualiza sozinho
- Editou um `.ts` em `api/` → próxima request `/api/report` já usa a versão nova

Cola a API key do Grafana na tela inicial, escolhe a data, e pronto.

### Cache _first_seen em dev

Por padrão, sem env vars de Upstash, o cache fica desabilitado — o painel "Ordem de entrada das copies" mostra dados durante a sessão mas zera quando tu reinicia o Vite.

Pra ter cache persistente também em dev, cria `.env` na raiz com:

```env
UPSTASH_REDIS_REST_URL=https://seu-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu-token
```

(Crie um database grátis em [console.upstash.com](https://console.upstash.com), sem cartão.)

---

## 🚀 Deploy na Vercel (setup inicial)

### 1. Push do projeto pro GitHub

```bash
git init
git add .
git commit -m "feat: SMS Monitor em React + TypeScript"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sms-monitor.git
git push -u origin main
```

### 2. Importar na Vercel

1. [vercel.com/new](https://vercel.com/new) → importa o repositório.
2. Framework é detectado automaticamente (Vite). Não precisa mexer em nada.
3. Clica em **Deploy**.

### 3. Adicionar Upstash Redis (1 clique)

No painel do projeto:

1. **Storage** → **Browse Marketplace** → **Upstash** → **Redis** → **Create Database**.
2. Nome: `sms-monitor-prod`. Região: a mais próxima dos operadores.
3. Confirma. Vercel injeta as env vars automaticamente.

### 4. Configurar variáveis fixas do Grafana

**Settings → Environment Variables** → adiciona (todas como **All Environments**):

| Nome | Valor |
|---|---|
| `GRAFANA_URL` | `https://grafana.production.liguelead.app.br` |
| `REDIS_DS_UID` | `af9h69d39q4u8a` |
| `INFTY_DS_UID` | `bffjknuqr4t8ga` |

### 5. (Opcional, recomendado) Database separado pra preview

Pra teus testes em branches não contaminarem o cache de produção:

1. Storage → Marketplace → Upstash → cria segundo database `sms-monitor-dev`.
2. Settings → Environment Variables → edita os valores das env vars do Upstash:
   - **Production**: aponta pro database `sms-monitor-prod`
   - **Preview**: aponta pro `sms-monitor-dev`

### 6. Redeploy

Deployments → último deploy → Redeploy. Agora sobe limpo com as env vars no lugar.

### 7. Pronto

Distribui a URL pros operadores. Cada um cola a própria API key do Grafana ao entrar.

---

## 🔄 Fluxo de trabalho com branches

A Vercel deploya automaticamente:

| Ação | Resultado |
|---|---|
| `git push origin main` | Atualiza `sms-monitor.vercel.app` (produção) |
| `git push origin feat-xyz` | Cria URL preview `sms-monitor-git-feat-xyz-SEUUSER.vercel.app` |
| Abrir Pull Request | URL preview linkada no PR |
| Merge PR pra main | Preview substitui produção |

Tu trabalha numa branch, vê o resultado isolado, valida, e só promove pra produção quando estiver bom. **Operadores nunca veem código quebrado.**

### Rollback se der ruim

Deployments → escolhe deploy anterior → **Promote to Production**. Volta ao ar em ~30s.

---

## 📁 Estrutura do projeto

```
sms-monitor/
├── api/                          # Vercel Serverless Functions (TypeScript)
│   ├── _grafana.ts               # Helpers async pra chamar Grafana
│   ├── _seen_cache.ts            # Cache _first_seen no Upstash
│   └── report.ts                 # Endpoint /api/report
├── src/
│   ├── components/               # Componentes React
│   ├── hooks/                    # useReport, useLocalStorage, useToast
│   ├── lib/
│   │   ├── api.ts                # Cliente HTTP do back
│   │   ├── sinch-codes.ts        # 165 códigos Sinch (doc oficial)
│   │   ├── pontal-codes.ts       # 57 códigos Pontaltech
│   │   ├── error-info.ts         # errInfo() + detecção de gateway
│   │   ├── formatters.ts         # formatPhone, formatDateTime, etc
│   │   ├── xlsx-export.ts        # Exportação XLSX
│   │   └── types.ts              # Tipos compartilhados
│   ├── styles/index.css          # CSS idêntico ao Python original
│   ├── App.tsx                   # Root (Setup ↔ Dashboard)
│   └── main.tsx                  # Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts                # Inclui plugin emulador de Vercel API
├── tailwind.config.js
├── vercel.json
├── .env.example
└── README.md
```

---

## 🔐 Notas de segurança

- API key do Grafana **nunca** é armazenada em servidor — fica só na memória do navegador.
- Cada chamada `/api/report` carrega a key como query param `?api_key=...`. Tudo HTTPS.
- Upstash guarda **apenas** `{uuid_da_msg: hora_que_vi}` — nenhum telefone, copy, ou dado de operador.
- URL pública sem chave → não passa do `/api/report` (rejeita 400).

---

## 🐛 Troubleshooting

**"Erro 401 / Grafana retornou 401"**
- API key inválida ou expirada. Gera nova em https://grafana.production.liguelead.app.br/profile/api-keys

**"Erro 500 / timeout"**
- Vercel free tier tem limite de 10s por função. Se o Grafana estiver lento, pode estourar.
- Logs em Vercel → Deployments → Function Logs.

**"Cache _first_seen não persiste"**
- Verifica se `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` estão configuradas em **Production**.
- Sem o Upstash, o app funciona menos o painel "Ordem de entrada das copies".

**"Código de erro não tem descrição"**
- Provavelmente código `999`/catch-all não mapeado. Veja `src/lib/sinch-codes.ts` ou `pontal-codes.ts` — basta adicionar uma linha.
