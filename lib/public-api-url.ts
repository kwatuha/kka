/**
 * Browser API base URL.
 * - Default: same-origin `/api` (nginx on hmis.* domains, local dev proxy).
 * - Exception: Kakamega split-port UI on :5400 → API on :3222 on the same host.
 *
 * Do not bake http://IP:3222 into NEXT_PUBLIC_API_URL when users also open the app over HTTPS —
 * that causes mixed-content blocks and "Unable to reach the server".
 */
function normalizeApiBase(raw: string): string {
  return String(raw || "").trim().replace(/\/$/, "")
}

export function getPublicApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location
    if (port === "5400") {
      return `${protocol}//${hostname}:3222`
    }
    // `next dev` serves /hmis but does not proxy /api — call the API port directly.
    if (port === "3100" || port === "3000") {
      const fromEnv = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || "")
      if (fromEnv) return fromEnv
      return `${protocol}//${hostname}:3222`
    }
    return ""
  }
  return normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || "")
}
