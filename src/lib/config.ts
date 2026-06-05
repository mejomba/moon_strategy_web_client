/**
 * Client configuration. Only ever reads *public* env vars (`NEXT_PUBLIC_*`).
 *
 * SECURITY (CLAUDE.md §3/§5): no exchange/broker API keys, credentials, or any
 * secret may live in the client bundle. Authentication, when added, must use
 * short-lived tokens fetched at runtime and kept out of localStorage — never
 * baked into the build.
 */

/** Base URL of the Django REST API. Override per-environment via env. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api";

/** Product name shown in the UI shell. */
export const APP_NAME = "Strategy Tester";
