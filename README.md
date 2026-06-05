# Strategy Tester — Web Client

Next.js (App Router) + TypeScript frontend for the **Strategy Tester** platform:
a no-code tool to build, backtest, and (later) execute crypto trading strategies.
It talks to the Django backend in
[`mejomba/moon_strategy`](https://github.com/mejomba/moon_strategy).

> This is **Phase 1/2** of the roadmap: strategy management, backtesting with
> honest cost reporting, and the skeleton of the no-code visual builder.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a small set of local UI primitives (no heavy UI kit)
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

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run Vitest once |
| `npm run format` | Format with Prettier |

## Architecture

```
src/
  app/                     # App Router pages
    page.tsx               # Dashboard
    strategies/            # list · new · [id] (detail + run backtest)
    backtests/             # list · [id] (metrics report + trades)
    builder/               # no-code visual builder skeleton (Phase 2)
  components/              # UI primitives + feature components
  hooks/useAsync.ts        # resilient client data fetching
  lib/
    strategy/              # ← single source of truth (strategy-JSON model)
      schema.ts            #   versioned model + logic-graph + param specs
      serialize.ts         #   model ⇄ backend payload, with versioning/migration
      validate.ts          #   pure, UI-agnostic validation
    api/                   # typed fetch client + shared DTOs (mirror Django)
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
