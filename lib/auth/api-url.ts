import { getPublicApiBaseUrl } from "@/lib/public-api-url"

/** Build API path for browser auth calls (same-origin /api on HTTPS, :3222 when UI is on :5400). */
export function authApiUrl(path: string): string {
  const base = getPublicApiBaseUrl()
  const normalized = path.startsWith("/") ? path : `/${path}`
  return base ? `${base}${normalized}` : normalized
}
