/** When true, NBTMS (national blood bank) routes and navigation are exposed. */
export function isNbtmsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NBTMS_ENABLED === "1" || process.env.NEXT_PUBLIC_NBTMS_ENABLED === "true"
}
