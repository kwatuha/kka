/**
 * Data Exchange destination catalog — human-facing partner directory.
 * Used by UI and (mirrored) by API overview for consistent labels.
 */

export type ExchangeMode = "sandbox" | "live" | "disabled" | "planned"
export type ExchangeHealth = "connected" | "configured" | "not_configured" | "planned" | "degraded"

export type DataExchangeDestination = {
  id: string
  name: string
  shortName: string
  purpose: string
  dataTypes: string[]
  authority: string
  /** Outbox eventType prefixes or exact names that belong here */
  eventPatterns: string[]
  configureHash: string
  /** If true, shown as roadmap partner (e.g. NASCOP) even with no adapter yet */
  planned?: boolean
}

export const DATA_EXCHANGE_DESTINATIONS: DataExchangeDestination[] = [
  {
    id: "event-bus",
    name: "Internal event bus",
    shortName: "Outbox / RabbitMQ",
    purpose: "Queues facility events so national adapters and county systems can consume them reliably.",
    dataTypes: [
      "Patient registered",
      "Lab finalised",
      "Encounter closed",
      "Claim ready",
      "Allied health CPOE orders",
    ],
    authority: "Facility (internal spine)",
    eventPatterns: [
      "patient.registered",
      "encounter.closed",
      "observation.lab.final",
      "claim.ready",
      "cpoe.allied.",
    ],
    configureHash: "integration-outbox",
  },
  {
    id: "client-registry",
    name: "Client Registry (NUPI)",
    shortName: "NUPI / CR",
    purpose: "Resolve and register unique patient identity with the national Client Registry.",
    dataTypes: ["Demographics", "Identifiers", "NUPI number"],
    authority: "Ministry of Health / DHA identity",
    eventPatterns: ["patient.nupi", "client.registry", "nupi"],
    configureHash: "national-integrations",
  },
  {
    id: "facility-registry",
    name: "Facility Registry (MFL)",
    shortName: "MFL",
    purpose: "Keep facility Master Facility List codes aligned with the national registry.",
    dataTypes: ["Branch / facility codes", "KEPH level", "MFL sync"],
    authority: "Ministry of Health / DHA facility registry",
    eventPatterns: ["facility.mfl", "mfl"],
    configureHash: "national-integrations",
  },
  {
    id: "fhir",
    name: "FHIR clinical exchange",
    shortName: "FHIR / OpenHIM",
    purpose: "Share clinical resources (Patient, Encounter, Observation) with national mediators.",
    dataTypes: ["Patient", "Encounter", "Lab Observation", "LOINC-mapped results"],
    authority: "DHA clinical interoperability",
    eventPatterns: ["fhir."],
    configureHash: "fhir-exchange",
  },
  {
    id: "hl7",
    name: "HL7 v2 lab results (ORU)",
    shortName: "HL7 ORU",
    purpose: "Sandbox ORU^R01 messages queued when lab results are finalised.",
    dataTypes: ["ORU^R01", "Lab observation segments"],
    authority: "DHA lab interoperability (sandbox)",
    eventPatterns: ["hl7."],
    configureHash: "fhir-exchange",
  },
  {
    id: "dhis2",
    name: "DHIS2 / KHIS reporting",
    shortName: "DHIS2",
    purpose: "Send aggregate facility indicators for national and county health information systems.",
    dataTypes: ["Monthly OPD/IPD aggregates", "Lab volumes", "SDMX-HD packages"],
    authority: "KHIS / county HIS",
    eventPatterns: ["dhis2"],
    configureHash: "reporting-claims",
  },
  {
    id: "idsr",
    name: "IDSR disease surveillance",
    shortName: "IDSR",
    purpose: "Notify surveillance systems when notifiable conditions are recorded.",
    dataTypes: ["Notifiable disease alerts", "Case signals"],
    authority: "Disease surveillance (IDSR)",
    eventPatterns: ["idsr"],
    configureHash: "reporting-claims",
  },
  {
    id: "sha",
    name: "SHA claims",
    shortName: "SHA",
    purpose: "Submit insurance claims packages to the Social Health Authority / payer adapters.",
    dataTypes: ["Claim packages", "Authorization references"],
    authority: "Social Health Authority",
    eventPatterns: ["sha.", "claim."],
    configureHash: "reporting-claims",
  },
  {
    id: "nascop",
    name: "NASCOP (HIV programme)",
    shortName: "NASCOP",
    purpose: "Programme reporting for HIV testing, ART, and viral load (planned national connection).",
    dataTypes: ["HTS summaries", "ART regimens", "Viral load outcomes"],
    authority: "NASCOP / national HIV programme",
    eventPatterns: ["nascop"],
    configureHash: "data-exchange-nascop",
    planned: true,
  },
]

export function destinationForEventType(eventType: string | null | undefined): DataExchangeDestination {
  const t = String(eventType || "").toLowerCase()
  for (const dest of DATA_EXCHANGE_DESTINATIONS) {
    if (dest.planned) continue
    for (const pattern of dest.eventPatterns) {
      const p = pattern.toLowerCase()
      if (t === p || t.startsWith(p) || t.includes(p)) return dest
    }
  }
  return DATA_EXCHANGE_DESTINATIONS[0] // event-bus fallback
}

export function plainLanguageEvent(eventType: string | null | undefined): string {
  const t = String(eventType || "")
  const map: Record<string, string> = {
    "patient.registered": "Patient registered",
    "patient.nupi.resolved": "NUPI resolved",
    "patient.nupi.registered": "NUPI registered",
    "encounter.closed": "Encounter closed",
    "observation.lab.final": "Lab result finalised",
    "claim.ready": "Claim ready",
    "sha.claim.submitted": "SHA claim submitted",
    "fhir.Patient": "FHIR Patient published",
    "fhir.Encounter": "FHIR Encounter published",
    "fhir.Observation": "FHIR Observation published",
    "idsr.alert": "IDSR alert published",
    "dhis2.export": "DHIS2 export packaged",
    "facility.mfl.synced": "MFL facility synced",
  }
  if (map[t]) return map[t]
  return t.replace(/\./g, " · ") || "Exchange event"
}
