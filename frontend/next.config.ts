import type { NextConfig } from "next";

// Choose the API explicitly for each release; never silently forward sign-in
// requests to an old deployment when production configuration is missing.
const BACKEND_URL =
  process.env.BACKEND_URL || (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");
if (!BACKEND_URL) throw new Error("Set the server-side BACKEND_URL before building Whistle.");
const backend = new URL(BACKEND_URL);
const localBackend = ["localhost", "127.0.0.1", "[::1]"].includes(backend.hostname);
const containerBackend = process.env.BUILD_STANDALONE === "true" && backend.hostname === "api";
if (backend.username || backend.password || backend.search || backend.hash ||
    (backend.protocol !== "https:" && !(backend.protocol === "http:" && (localBackend || containerBackend)))) {
  throw new Error("BACKEND_URL must be a credential-free HTTPS API URL, or the local/container API.");
}

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  httpAgentOptions: { keepAlive: false },
  turbopack: { root: __dirname },
  // A grounded call can reserve its cloud allowance before a bounded 40s
  // provider request. Keep the proxy alive for that path and partial results.
  experimental: { proxyTimeout: 90000 },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
