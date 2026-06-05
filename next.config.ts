import type { NextConfig } from "next";

/**
 * Extra dev-server origins allowed to request internal Next.js dev assets
 * (`/_next/*`, HMR websocket). Next blocks cross-origin dev requests by default,
 * so when the dev server is reached from a non-localhost host — e.g. binding to
 * 0.0.0.0 and opening http://192.168.1.24:3000 — that machine IP must be listed
 * here, otherwise the HMR websocket fails to connect.
 *
 * Configure your LAN IP via NEXT_DEV_ORIGINS (comma-separated) in `.env.local`,
 * e.g. NEXT_DEV_ORIGINS=192.168.1.24
 */
const extraDevOrigins = (process.env.NEXT_DEV_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", ...extraDevOrigins],
};

export default nextConfig;
