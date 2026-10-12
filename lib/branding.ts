const DEFAULT_PRODUCT = "AZ CarePlus"

function cleanEnvValue(raw: string | undefined): string {
  return (raw || "").trim().replace(/^["']|["']$/g, "")
}

/**
 * Public UI must not show legacy IntelliNex or county-specific names until DHA approval.
 * Env vars that still say "Kakamega HMIS" or "IntelliNex" are mapped to AZ CarePlus.
 */
function sanitizePublicBrand(value: string, fallback: string): string {
  const v = value.trim()
  if (!v) return fallback
  if (/intellinex/i.test(v)) return fallback
  if (/kakamega/i.test(v)) return fallback
  return v
}

export type Branding = {
  productName: string
  appBrand: string
  /** Full-colour raster (e.g. PNG) — login, marketing, light UI. */
  logoPath: string
  /** Optional raster override for dark chrome; leave unset to use white vector wordmark in sidebar. */
  logoSidebarPath: string
  /** Letterhead, PDF, receipts — dark text / light background (SVG or PNG without dark bar). */
  logoPrintPath: string
  hospitalWebsite: string
  hospitalLocation: string
  hospitalPhone: string
  hospitalHours: string
}

export const DEFAULT_LOGO_PATH = "/az-careplus-logo.png"
/** Light-on-dark wordmark for navy sidebar chrome. */
export const DEFAULT_LOGO_SIDEBAR_PATH = "/az-careplus-logo-sidebar.png"
/** Transparent / light background — reports, PDFs, receipts. */
export const DEFAULT_LOGO_PRINT_PATH = "/az-careplus-logo-print.png"

const rawProduct = cleanEnvValue(process.env.NEXT_PUBLIC_PRODUCT_NAME)
const rawAppBrand = cleanEnvValue(process.env.NEXT_PUBLIC_APP_BRAND) || rawProduct

export const branding: Branding = {
  productName: sanitizePublicBrand(rawProduct, DEFAULT_PRODUCT),
  appBrand: sanitizePublicBrand(rawAppBrand, DEFAULT_PRODUCT),
  logoPath: process.env.NEXT_PUBLIC_LOGO_PATH || DEFAULT_LOGO_PATH,
  logoSidebarPath: process.env.NEXT_PUBLIC_LOGO_SIDEBAR_PATH || DEFAULT_LOGO_SIDEBAR_PATH,
  logoPrintPath: process.env.NEXT_PUBLIC_LOGO_PRINT_PATH || DEFAULT_LOGO_PRINT_PATH,
  hospitalWebsite: process.env.NEXT_PUBLIC_HOSPITAL_WEBSITE || "",
  hospitalLocation: process.env.NEXT_PUBLIC_HOSPITAL_LOCATION || "",
  hospitalPhone: process.env.NEXT_PUBLIC_HOSPITAL_PHONE || "",
  hospitalHours: process.env.NEXT_PUBLIC_HOSPITAL_HOURS || "",
}

/** Primary product line, e.g. "AZ CarePlus MIS" */
export function getBrandingMisTitle(): string {
  return `${branding.appBrand} MIS`
}

/** Secondary line under sign-in — avoids "Brand · Brand" duplication */
export function getBrandingSignInSubtitle(): string {
  if (branding.appBrand === branding.productName) {
    return "Hospital Management Information System"
  }
  return `${branding.productName} · Hospital MIS`
}

