/**
 * Normalize Unicode punctuation for jsPDF (Helvetica = Latin-1) and HTML print
 * blobs so UTF-8 characters are not misread as Windows-1252 (e.g. "—" → "â€"").
 */

const REPLACEMENTS: [RegExp, string][] = [
  [/\u2014/g, " - "], // em dash
  [/\u2013/g, " - "], // en dash
  [/\u2212/g, "-"], // minus sign
  [/\u2018|\u2019/g, "'"],
  [/\u201c|\u201d/g, '"'],
  [/\u2026/g, "..."],
  [/\u00a0/g, " "], // nbsp
]

/** Use on any string passed to jsPDF.text or print HTML without guaranteed UTF-8 fonts. */
export function sanitizePrintText(value: unknown): string {
  let s = String(value ?? "")
  for (const [re, rep] of REPLACEMENTS) {
    s = s.replace(re, rep)
  }
  // Common mojibake if bad decode already happened in stored data
  s = s.replace(/â€"/g, " - ").replace(/â€“/g, " - ")
  return s
}

export const MOH_KENYA_HEALTH_BANNER = "REPUBLIC OF KENYA - MINISTRY OF HEALTH"
