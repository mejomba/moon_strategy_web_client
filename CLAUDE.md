# CLAUDE.md — Frontend (Strategy Tester Web App)

This file gives Claude Code the context and rules for working in the **frontend**
repository. Read it fully before making any change.

> The backend lives in a **separate Django + DRF repository** and exposes a JSON API.
> This repo is the **web client only** (Next.js). It must not contain backend/business
> logic that belongs server-side (e.g. the backtest engine, order execution).

---

## 1. Project Overview

**Strategy Tester** is a no-code, web-based SaaS platform that lets traders **without
programming knowledge** build, backtest, optimize, and automatically execute trading
strategies for **crypto** and **forex (MetaTrader 5)** markets.

Full product cycle:

> Idea → Visual build → Backtest → Optimization → Paper trading → Live execution

- **Product type:** Commercial financial SaaS (web)
- **Target user:** Non-coder traders (no-code) — the UI must be **approachable for
  non-programmers**.
- **Team:** Single solo developer
- **Horizon:** 12–18 months

This is a **commercial product handling real money**. Clarity, correctness, and trust in
the UI matter. Never imply guaranteed profits; surface risk and disclaimers clearly.

---

## 2. Tech Stack (this repo)

| Layer | Technology                                                |
|---|-----------------------------------------------------------|
| Framework | **Next.js** (React)                                       |
| Language | **TypeScript** (preferred)                                |
| Data fetching | Typed client generated from the backend **OpenAPI** schema |
| Charts | A charting library for performance metrics/equity curves  |
| Strategy format | Intermediate **JSON / logic graph** (shared with backend) |

Constraints:
- Keep heavy computation server-side. The frontend **builds the strategy JSON and
  visualizes results** — it does **not** run the backtest engine or place live orders
  itself.
- Prefer TypeScript and typed API access. Do not hand-write API response types that can
  be generated from the backend schema.

---

## 3. Critical Safety / Trust Rules (NEVER violate)

These come from the product's legal and risk requirements.

1. The UI must **never hold or transfer user funds**, and must never ask for withdrawal
   permissions when collecting exchange/broker API keys — **trade permission only**.
2. Treat API keys and credentials entered by users as highly sensitive: never log them,
   never store them in the browser longer than necessary, send them only over the secure
   backend API.
3. Surface **risk management** controls clearly in the UI: max drawdown, max position
   size, emergency stop ("kill switch").
4. **Paper Trading must be presented before/alongside live execution**; never make live
   trading the easy default path.
5. Show clear **legal disclaimers** in trading flows. Never present backtest results as a
   promise of future returns; show overfitting/out-of-sample warnings the API provides.
6. Never put secrets in client-side env vars exposed to the browser (no `NEXT_PUBLIC_`
   secrets). Store secrets server-side only.

If a requested change would conflict with any rule above, **stop and flag it**.

---

## 4. The No-Code Strategy Builder (core feature)

The visual builder is the heart of this product. Its job:

- Let a non-programmer assemble indicators and logical conditions visually.
- Produce the **intermediate strategy JSON / logic graph** that the backend executes.

Rules:
- The strategy JSON schema is **shared with the backend repo** and is the single source
  of truth. **Do not invent or change its shape locally** — it must stay compatible with
  what the backend backtest engine expects. If a change is needed, flag it so both repos
  update together.
- Keep the builder's UI model and the emitted JSON clearly separated.

---

## 5. Frontend/Backend Contract (cross-repo)

The backend (Django + DRF) owns the API contract and publishes an **OpenAPI schema**.

- Generate the API client/types from that schema rather than hand-writing them.
- When the backend changes an endpoint, **regenerate the client** and adapt the UI.
- Do not assume direct file access to the backend repo — communicate through the API.
- Do not put backend logic here; if something belongs server-side, note it for the
  backend repo instead of reimplementing it in the browser.

---

## 6. Scope

**In scope:** auth/account UI, subscription/billing UI, the no-code strategy builder,
backtest configuration + results/reporting visualizations, paper-trading and live
dashboards, exchange/broker connection UI (trade-only keys).

**Out of scope (phase 1):** strategy marketplace & copy trading UI, dedicated mobile app,
stocks/options markets. Do not build these unless asked.

---

## 7. Roadmap — Build in Phase Order

Do not jump ahead. **Phase 1 is crypto-only.** Forex/MT5 UI comes later.

| Phase | Months | Frontend focus |
|---|---|---|
| 1. Backtest core | 1–5 | Minimal UI to configure/run backtests + view metrics (crypto) |
| 2. No-code builder | 5–9 | Visual strategy builder + reporting views |
| 3. Crypto live | 9–12 | Connection UI + paper-trading & live dashboards + risk controls |
| 4. Forex / MT5 | 12–15 | MT5 connection UI |
| 5. Polish & growth | 15–18 | Optimizer UI, walk-forward views, marketplace |

When asked for a feature from a later phase, point this out before building.

---

## 8. UI/UX Principles

- The user is a **non-coder trader**. Keep flows simple, label things in trader-friendly
  terms, avoid exposing internal jargon.
- Make risk and cost visible: backtest results must clearly show that commission, spread,
  slippage, and swap were modeled — never present misleadingly clean results.
- Build accessible, responsive layouts (web target; no dedicated mobile app in phase 1,
  but the web app should be usable on smaller screens).

---

## 9. Code Conventions

- Next.js with TypeScript; functional components and hooks.
- Organize by feature (e.g. `app/backtest`, `app/builder`, `app/account`).
- Keep API access in a typed layer generated from the backend schema; components consume
  that layer, not raw `fetch` scattered around.
- No secrets in client code or `NEXT_PUBLIC_` vars.
- Names, comments, and commit messages in **English**.

---

## 10. Common Commands

```bash
npm run dev        # start dev server
npm run build      # production build
npm run lint       # lint
npm run test       # tests (set up if not present)
```

> Update this section to match the project's actual scripts (package manager, test setup).

---

## 11. Workflow Expectations for Claude Code

1. **Plan first** for anything non-trivial (especially the builder, §4): explain the
   approach before writing code.
2. Implement in **small, focused steps** — one task at a time.
3. Add/adjust tests where it makes sense.
4. **Commit in this repo only** with a clear English message. Do not mix frontend and
   backend work in one commit.
5. When a change needs the API contract or strategy JSON to change, **call it out** so
   the backend repo can be updated to match — never silently diverge.
6. Respect §3 trust/safety rules absolutely; flag conflicts instead of working around them.
7. Stay within the current roadmap phase unless told otherwise.
