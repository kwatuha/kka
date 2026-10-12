/** Optional Administration panels for compliance exports and walkthroughs (off in normal deployments). */
export function showComplianceAdminTooling(): boolean {
  return String(process.env.NEXT_PUBLIC_SHOW_COMPLIANCE_TOOLING || "").trim() === "1"
}
