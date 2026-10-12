import { branding } from "@/lib/branding"
import { publicAssetUrl } from "@/lib/utils/url"

export type FacilityProfile = {
  branchId?: number | string
  branchName?: string | null
  letterheadTitle?: string | null
  logoUrl?: string | null
  address?: string | null
  postalAddress?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  receiptHeader?: string | null
  receiptFooter?: string | null
}

/** Build profile from invoice API payload (includes joined branch letterhead fields). */
export function facilityProfileFromInvoice(invoice: Record<string, unknown> | null | undefined): FacilityProfile {
  if (!invoice) return {}
  return {
    branchId: invoice.branchId as number | string | undefined,
    branchName: (invoice.branchName as string) || null,
    letterheadTitle: (invoice.letterheadTitle as string) || null,
    logoUrl: (invoice.logoUrl as string) || null,
    address: (invoice.branchAddress as string) || null,
    postalAddress: (invoice.branchPostalAddress as string) || null,
    phone: (invoice.branchPhone as string) || null,
    email: (invoice.branchEmail as string) || null,
    website: (invoice.branchWebsite as string) || null,
    receiptHeader: (invoice.branchReceiptHeader as string) || null,
    receiptFooter: (invoice.branchReceiptFooter as string) || null,
  }
}

export function resolveLetterheadTitle(profile?: FacilityProfile | null): string {
  return (
    profile?.letterheadTitle?.trim() ||
    profile?.branchName?.trim() ||
    branding.appBrand ||
    "Hospital"
  )
}

export function resolveFacilityLogoUrl(profile?: FacilityProfile | null): string {
  const custom = profile?.logoUrl?.trim()
  if (custom) {
    if (custom.startsWith("http://") || custom.startsWith("https://")) return custom
    return publicAssetUrl(custom.startsWith("/") ? custom : `/${custom}`)
  }
  return publicAssetUrl(branding.logoPrintPath || branding.logoPath)
}

export function buildFacilityContactLines(profile?: FacilityProfile | null): string[] {
  const lines: string[] = []
  const address = profile?.address?.trim()
  const postal = profile?.postalAddress?.trim()
  const phone = profile?.phone?.trim()
  const email = profile?.email?.trim()
  const website = profile?.website?.trim()

  if (address) lines.push(address)
  if (postal) lines.push(postal)
  if (phone) lines.push(`Tel: ${phone}`)
  if (email) lines.push(`Email: ${email}`)
  if (website) lines.push(website)

  if (!lines.length) {
    if (branding.hospitalLocation) lines.push(branding.hospitalLocation)
    if (branding.hospitalPhone) lines.push(`Tel: ${branding.hospitalPhone}`)
    if (branding.hospitalWebsite) lines.push(branding.hospitalWebsite)
  }

  return lines
}

/** HTML block for receipts, invoices, and other printable documents. */
export function buildDocumentHeaderHtml(
  profile: FacilityProfile | null | undefined,
  origin: string,
  options?: { documentTitle?: string; subtitle?: string; showFacilityNameUnderLogo?: boolean }
): string {
  const title = resolveLetterheadTitle(profile)
  const logoUrl = resolveFacilityLogoUrl(profile)
  const contactLines = buildFacilityContactLines(profile)
  const headerExtra = profile?.receiptHeader?.trim()
  const docTitle = options?.documentTitle || ""
  const subtitle = options?.subtitle || ""
  const showNameUnderLogo = Boolean(options?.showFacilityNameUnderLogo)
  const titleDisplay = showNameUnderLogo ? "block" : "none"
  const logoOnError =
    "this.style.display='none';var t=this.nextElementSibling;if(t)t.style.display='block';"

  const contactHtml = contactLines
    .map((line) => `<p style="margin:2px 0;font-size:12px;color:#555;">${escapeHtml(line)}</p>`)
    .join("")

  return `
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${logoUrl.startsWith("http") ? logoUrl : `${origin}${logoUrl}`}" alt="${escapeHtml(title)}" style="max-width:280px;height:auto;margin:0 auto 12px;display:block;" onerror="${logoOnError}" />
      <h1 style="display:${titleDisplay};margin:8px 0 4px;font-size:20px;color:#006B3F;">${escapeHtml(title)}</h1>
      ${headerExtra ? `<p style="margin:4px 0;font-size:13px;color:#333;">${escapeHtml(headerExtra)}</p>` : ""}
      ${contactHtml}
      ${docTitle ? `<h2 style="margin:16px 0 4px;font-size:18px;">${escapeHtml(docTitle)}</h2>` : ""}
      ${subtitle ? `<p style="margin:0;font-size:13px;color:#666;">${escapeHtml(subtitle)}</p>` : ""}
    </div>
  `
}

export function buildDocumentFooterHtml(profile?: FacilityProfile | null): string {
  const footer =
    profile?.receiptFooter?.trim() ||
    `Thank you for choosing ${resolveLetterheadTitle(profile)}.`

  return `
    <div style="margin-top:32px;padding-top:16px;border-top:2px solid #000;text-align:center;font-size:12px;color:#666;">
      <p style="margin:0;">${escapeHtml(footer)}</p>
    </div>
  `
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
