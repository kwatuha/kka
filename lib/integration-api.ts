import { getPublicApiBaseUrl } from "@/lib/public-api-url"

/** Integration routes live under `/api/integrations/...` on the HMIS API host. */
export function integrationApiUrl(path: string): string {
  const base = getPublicApiBaseUrl().replace(/\/$/, "")
  let p = path.startsWith("/") ? path : `/${path}`
  if (base.endsWith("/api") && p.startsWith("/api/")) {
    p = p.slice(4) || "/"
  }
  return base ? `${base}${p}` : p
}

export function integrationFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(integrationApiUrl(path), init)
}

/**
 * Parse integration API bodies safely (nginx/HTML 502 and Next dev 404 HTML break raw `.json()`).
 */
export async function readIntegrationJson<T = Record<string, unknown>>(
  res: Response
): Promise<T> {
  const text = await res.text()
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error(
      res.ok
        ? "Empty response from integration API"
        : `Integration API error (HTTP ${res.status}) with empty body`
    )
  }
  if (trimmed.startsWith("<")) {
    throw new Error(
      `Integration API returned HTML (HTTP ${res.status}) — check /api proxy and that the API container is running. URL: ${res.url}`
    )
  }
  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new Error(
      `Integration API returned non-JSON (HTTP ${res.status}): ${trimmed.slice(0, 160)}`
    )
  }
}
