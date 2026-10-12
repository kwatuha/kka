/**
 * Patient summary and detailed service-card PDF/print helpers.
 */

import { buildDocumentHeaderHtml, buildDocumentFooterHtml } from "@/lib/facility-profile"
import type { PatientServiceEvent } from "@/lib/patient-care-timeline"

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function openPrintHtml(html: string) {
  const printWindow = window.open("", "_blank")
  if (!printWindow) {
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "patient-report.html"
    a.click()
    URL.revokeObjectURL(url)
    return
  }
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 250)
  }
}

function baseStyles(): string {
  return `
    body { font-family: Arial, sans-serif; color: #222; margin: 24px; font-size: 12px; }
    h2 { font-size: 16px; margin: 20px 0 8px; color: #065f46; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-size: 11px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin: 12px 0 20px; }
    .meta div { border-bottom: 1px solid #eee; padding: 4px 0; }
    .label { color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
    .value { font-weight: 600; }
    .muted { color: #666; font-size: 11px; }
  `
}

function patientMetaBlock(patient: any): string {
  const name = `${patient.firstName || ""} ${patient.lastName || ""}`.trim()
  const age = patient.dateOfBirth
    ? Math.max(
        0,
        new Date().getFullYear() -
          new Date(patient.dateOfBirth).getFullYear() -
          (new Date() <
          new Date(new Date().getFullYear(), new Date(patient.dateOfBirth).getMonth(), new Date(patient.dateOfBirth).getDate())
            ? 1
            : 0)
      )
    : "—"

  const rows = [
    ["Patient number", patient.patientNumber],
    ["Full name", name],
    ["Sex", patient.gender],
    ["Date of birth", patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("en-KE") : "—"],
    ["Age", age],
    ["Phone", patient.phone],
    ["ID number", patient.idNumber],
    ["Registered facility", patient.registeredBranchName || patient.branchName],
    ["Address", patient.address],
    ["Next of kin", patient.nextOfKinName],
  ]

  return `<div class="meta">${rows
    .map(
      ([label, value]) =>
        `<div><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value || "—")}</div></div>`
    )
    .join("")}</div>`
}

export function downloadPatientSummaryPDF(opts: {
  patient: any
  events: PatientServiceEvent[]
  allergies?: any[]
  recentVitals?: any[]
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const header = buildDocumentHeaderHtml(null, origin, {
    documentTitle: "Patient Summary",
    subtitle: `Generated ${new Date().toLocaleString("en-KE")}`,
  })
  const footer = buildDocumentFooterHtml(null)

  const recent = opts.events.slice(0, 12)
  const allergyHtml =
    opts.allergies && opts.allergies.length
      ? `<ul>${opts.allergies
          .map((a) => `<li>${escapeHtml(a.allergen || a.name || a.allergyName || "Allergy")}${a.severity ? ` — ${escapeHtml(a.severity)}` : ""}</li>`)
          .join("")}</ul>`
      : `<p class="muted">No recorded allergies</p>`

  const vitals = Array.isArray(opts.recentVitals) ? opts.recentVitals.slice(0, 1)[0] : null
  const vitalsHtml = vitals
    ? `<p>BP ${escapeHtml(vitals.bloodPressure || `${vitals.systolicBP || ""}/${vitals.diastolicBP || ""}`)} · Pulse ${escapeHtml(
        vitals.pulse || vitals.heartRate || "—"
      )} · Temp ${escapeHtml(vitals.temperature || "—")} · SpO₂ ${escapeHtml(vitals.oxygenSaturation || vitals.spo2 || "—")}</p>`
    : `<p class="muted">No recent vitals</p>`

  const servicesHtml = recent.length
    ? `<table>
        <thead><tr><th>Date</th><th>Service</th><th>Provider</th><th>Facility</th></tr></thead>
        <tbody>
          ${recent
            .map(
              (e) => `<tr>
              <td>${escapeHtml(e.dateLabel)} ${escapeHtml(e.timeLabel)}</td>
              <td><strong>${escapeHtml(e.type)}</strong><br/><span class="muted">${escapeHtml(e.service)}</span></td>
              <td>${escapeHtml(e.provider)}</td>
              <td>${escapeHtml(e.facility)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : `<p class="muted">No services recorded yet</p>`

  const html = `<!DOCTYPE html><html><head><title>Patient Summary</title><style>${baseStyles()}</style></head>
    <body>
      ${header}
      ${patientMetaBlock(opts.patient)}
      <h2>Allergies</h2>${allergyHtml}
      <h2>Latest vitals</h2>${vitalsHtml}
      <h2>Recent services</h2>${servicesHtml}
      ${footer}
    </body></html>`

  openPrintHtml(html)
}

export function downloadPatientServiceCardPDF(opts: {
  patient: any
  events: PatientServiceEvent[]
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const header = buildDocumentHeaderHtml(null, origin, {
    documentTitle: "Patient Service Card",
    subtitle: "All recorded services, providers, and facilities",
  })
  const footer = buildDocumentFooterHtml(null)

  const body = opts.events.length
    ? `<table>
        <thead>
          <tr>
            <th style="width:14%">Date / time</th>
            <th style="width:12%">Type</th>
            <th style="width:22%">Service</th>
            <th style="width:22%">Details</th>
            <th style="width:15%">Offered by</th>
            <th style="width:15%">Facility</th>
          </tr>
        </thead>
        <tbody>
          ${opts.events
            .map(
              (e) => `<tr>
              <td>${escapeHtml(e.dateLabel)}<br/><span class="muted">${escapeHtml(e.timeLabel)}</span></td>
              <td>${escapeHtml(e.type)}</td>
              <td>${escapeHtml(e.service)}</td>
              <td>${escapeHtml(e.details)}</td>
              <td>${escapeHtml(e.provider)}</td>
              <td>${escapeHtml(e.facility)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : `<p class="muted">No services found for this patient.</p>`

  const html = `<!DOCTYPE html><html><head><title>Patient Service Card</title><style>${baseStyles()}</style></head>
    <body>
      ${header}
      ${patientMetaBlock(opts.patient)}
      <p class="muted">${opts.events.length} service record(s)</p>
      <h2>Service history</h2>
      ${body}
      ${footer}
    </body></html>`

  openPrintHtml(html)
}
