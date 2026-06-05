# Strategy Tester — Web Client

Next.js (App Router) + TypeScript frontend for the **Strategy Tester** platform:
a no-code tool to build, backtest, and (later) execute crypto trading strategies.
It talks to the Django backend in
[`mejomba/moon_strategy`](https://github.com/mejomba/moon_strategy).

> This is **Phase 1/2** of the roadmap: strategy management, backtesting with
> honest cost reporting, and the no-code visual builder that compiles to an
> executable logic graph.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a small set of local UI primitives (no heavy UI kit)
- **Recharts** for performance charts (equity curve)
- **ESLint** + **Prettier**
- **Vitest** for unit tests

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit NEXT_PUBLIC_API_BASE_URL if needed
npm run dev                  # http://localhost:3000
```

The client expects the Django REST API at `NEXT_PUBLIC_API_BASE_URL`
(default `http://localhost:8000/api`), exposing `strategies`, `backtests`, and
nested `trades` resources. If those endpoints are not up yet, pages render
graceful loading/empty/error states — the typed contract in `src/lib/api` is the
agreed shape.

### Accessing from another device (LAN)

When you bind the dev server to `0.0.0.0` and open the app from a machine IP
(e.g. `http://192.168.1.24:3000`):

1. Add that IP to `NEXT_DEV_ORIGINS` in `.env.local` (otherwise Next blocks the
   HMR websocket — `ws://…/_next/webpack-hmr` fails to connect).
2. Point `NEXT_PUBLIC_API_BASE_URL` at the backend's reachable address
   (`http://192.168.1.24:8000/api`), not `localhost` (which would resolve to the
   viewing device). The backend already allows private-LAN origins in `DEBUG`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run Vitest once |
| `npm run gen:api` | Regenerate API types from the OpenAPI schema |
| `npm run format` | Format with Prettier |

## API types (generated)

The wire types are **not hand-written**. The backend (Django + DRF) owns the API
contract and publishes an **OpenAPI schema**; this repo generates its types from
it (CLAUDE.md §2/§5):

- `openapi/schema.yaml` — vendored copy of the backend schema (refresh it from
  the backend's `GET /api/schema/`).
- `npm run gen:api` → `src/lib/api/generated.ts` (via `openapi-typescript`).
- `src/lib/api/types.ts` gives those generated components friendly names; the
  typed client and resources in `src/lib/api/` consume them. Components never
  import generated types directly.

When the backend changes an endpoint, refresh `openapi/schema.yaml`, rerun
`npm run gen:api`, and adapt the UI.

## Architecture

```
src/
  app/                     # App Router pages
    page.tsx               # Dashboard
    strategies/            # list · new · [id] (detail + run backtest)
    backtests/             # list · [id] (metrics report + trades)
    builder/               # no-code visual builder → executable logic graph
  components/              # UI primitives + feature components
  hooks/useAsync.ts        # resilient client data fetching
  lib/
    strategy/              # ← single source of truth (strategy-JSON model)
      schema.ts            #   versioned model + logic-graph + param specs
      serialize.ts         #   model ⇄ backend payload, with versioning/migration
      validate.ts          #   pure, UI-agnostic validation
    api/                   # typed fetch client + DTOs generated from OpenAPI
    format.ts, config.ts, cn.ts
```

### Strategy-JSON as the single source of truth (CLAUDE.md §4b)

`src/lib/strategy` defines the canonical, **framework-agnostic** strategy model.
Everything — forms, the visual builder, and the API layer — derives from it; UI
never touches the wire shape directly (§8). The model is **versioned**
(`STRATEGY_SCHEMA_VERSION`) and migrated forward on read, so persisted strategies
keep working as the format evolves. The backend stores the canonical JSON
(including the Phase 2 logic graph) inside its free-form `parameters` field under
a reserved `_meta` envelope, while engine-facing keys stay flat for the Python
runner.

### Safety (CLAUDE.md §3)

- **No secrets in the client.** Only `NEXT_PUBLIC_*` env vars are read; never an
  exchange/broker API key or credential.
- A **legal risk disclaimer** is shown in every trading-related flow.
- This phase is simulation only — no live order placement and no fund custody.
