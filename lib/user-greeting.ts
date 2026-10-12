/** Tokens that indicate a facility, demo, or system account — not a person’s first name. */
const NON_PERSON_NAME =
  /^(kakamega|admin|administrator|superadmin|super_admin|demo|test|user|staff|hmis|guest|root|system|azimkim|county|facility|hospital|matungu|receptionist|pharmacist|cashier|doctor|nurse|labtech|registration)$/i

const FACILITY_PHRASE = /kakamega|county general|teaching.*referral|sub-county|subcounty|azimkim/i

function capitalize(word: string): string {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function looksLikePersonName(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || trimmed.length < 2) return false
  if (FACILITY_PHRASE.test(trimmed)) return false
  if (NON_PERSON_NAME.test(trimmed)) return false
  return true
}

/**
 * First name (or similar) safe for “Welcome back, …” — avoids facility usernames like “kakamega”.
 */
export function getPersonalGreetingName(user: {
  name?: string | null
  username?: string | null
} | null | undefined): string | null {
  if (!user) return null

  const fullName = String(user.name || "").trim()
  if (fullName && !FACILITY_PHRASE.test(fullName)) {
    const parts = fullName.split(/\s+/).filter(Boolean)
    const first = parts[0]
    if (first && looksLikePersonName(first)) {
      return capitalize(first)
    }
    if (parts.length >= 2 && looksLikePersonName(parts[parts.length - 1])) {
      return capitalize(parts[parts.length - 1])
    }
  }

  const username = String(user.username || "").trim()
  if (!username) return null

  if (username.includes(".")) {
    const local = username.split(".")[0]
    if (looksLikePersonName(local)) return capitalize(local)
  }

  if (username.includes("_")) {
    const local = username.split("_").pop() || username
    if (looksLikePersonName(local)) return capitalize(local)
  }

  if (looksLikePersonName(username)) return capitalize(username)

  return null
}

/** Header / account menu — short label without county or facility prefixes. */
export function getHeaderUserDisplayName(
  user: { name?: string | null; username?: string | null; role?: string | unknown } | null | undefined,
): string {
  if (!user) return "User"

  const roleRaw = typeof user.role === "string" ? user.role : (user.role as { roleName?: string })?.roleName
  const roleLabel = roleRaw
    ? String(roleRaw)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : ""

  const personal = getPersonalGreetingName(user)
  if (personal) return personal

  let cleaned = String(user.name || user.username || "")
    .trim()
    .replace(/^kakamega\s+/i, "")
    .replace(/\bkakamega\b/gi, "")
    .trim()

  if (cleaned && !FACILITY_PHRASE.test(cleaned)) {
    const word = cleaned.split(/\s+/)[0]
    if (word && looksLikePersonName(word)) return capitalize(word)
    if (/administrator/i.test(cleaned)) return roleLabel || "Administrator"
    if (cleaned.length <= 24) return cleaned
  }

  if (roleLabel) return roleLabel
  return capitalize(String(user.username || "User").split(/[._]/)[0])
}

export function shortenFacilityLabel(name: string, maxLen = 36): string {
  const t = name.trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen - 1).trim()}…`
}
