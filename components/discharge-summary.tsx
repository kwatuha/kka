"use client"

import { format } from "date-fns"
import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Download } from "lucide-react"
import { resolveFacilityLogoUrl } from "@/lib/facility-profile"

export interface DischargeSummaryOverview {
  admission: {
    admissionId: number
    admissionNumber: string
    patientId: number
    firstName: string
    lastName: string
    patientNumber: string
    admissionDate: string
    dischargeDate?: string | null
    status: string
    admissionDiagnosis?: string | null
    admissionReason?: string | null
    expectedDischargeDate?: string | null
    notes?: string | null
    wardName?: string
    bedNumber?: string
    doctorFirstName?: string
    doctorLastName?: string
  }
  diagnoses?: Array<{ diagnosisCode?: string; diagnosisDescription?: string; diagnosisType?: string }>
  reviews?: Array<{
    reviewDate: string
    reviewType?: string
    subjective?: string
    objective?: string
    assessment?: string
    plan?: string
    notes?: string
    doctorFirstName?: string
    doctorLastName?: string
  }>
  nursingCare?: Array<{
    careDate: string
    careType?: string
    observations?: string
    interventions?: string
    notes?: string
    nurseFirstName?: string
    nurseLastName?: string
  }>
  vitals?: Array<{
    recordedDate: string
    systolicBP?: number
    diastolicBP?: number
    heartRate?: number
    temperature?: number
    respiratoryRate?: number
    oxygenSaturation?: number
    notes?: string
  }>
  procedures?: Array<{
    procedureDate: string
    procedureName?: string
    notes?: string
    performedByFirstName?: string
    performedByLastName?: string
  }>
  prescriptions?: Array<{
    prescriptionDate: string
    medicationNames?: string
    items?: Array<{ medicationName?: string; dosage?: string; frequency?: string; duration?: string }>
    doctorFirstName?: string
    doctorLastName?: string
  }>
  labOrders?: Array<{
    orderDate: string
    testName?: string
    clinicalIndication?: string
    status?: string
  }>
  radiologyOrders?: Array<{
    orderDate: string
    examName?: string
    clinicalIndication?: string
    status?: string
  }>
}

interface DischargeSummaryProps {
  overview: DischargeSummaryOverview
  facilityName?: string
  onPrint?: () => void
}

export function DischargeSummary({ overview, facilityName = "Kiplombe Medical Centre", onPrint }: DischargeSummaryProps) {
  const admission = overview.admission
  const patientName = [admission.firstName, admission.lastName].filter(Boolean).join(" ") || "—"
  const doctorName = [admission.doctorFirstName, admission.doctorLastName].filter(Boolean).join(" ")
  const admissionDate = admission.admissionDate ? format(new Date(admission.admissionDate), "PPP") : "—"
  const dischargeDate = admission.dischargeDate
    ? format(new Date(admission.dischargeDate), "PPP")
    : admission.status === "discharged"
      ? "—"
      : "Not yet discharged"

  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    onPrint?.()
    window.print()
  }

  const handleDownloadPdf = () => {
    const el = contentRef.current ?? document.getElementById("discharge-summary-content")
    if (!el) return
    const innerHtml = el.innerHTML
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Discharge Summary - ${String(admission.admissionNumber ?? "").replace(/</g, "&lt;")}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; color: #111; max-width: 210mm; margin: 0 auto; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 8px 2px 0; vertical-align: top; }
    h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; text-align: center; }
    h2 { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; margin: 1rem 0 0.5rem; }
    h3 { font-size: 0.875rem; font-weight: 600; color: #1f2937; margin: 0.5rem 0 0.25rem; }
    p { margin: 0.25rem 0; }
    ul { margin: 0.25rem 0; padding-left: 1.25rem; list-style-type: disc; }
    li { margin: 0.25rem 0; }
    header { text-align: center; border-bottom: 1px solid #d1d5db; padding-bottom: 1rem; margin-bottom: 1.5rem; }
    header img { max-width: 250px; height: auto; margin: 0 auto 12px; display: block; }
    section { margin-bottom: 1.5rem; }
    footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #d1d5db; font-size: 0.75rem; color: #6b7280; text-align: center; }
    .font-medium { font-weight: 500; }
    .text-gray-600, .text-gray-700, .text-gray-800 { color: #4b5563; }
    .border-l-2 { border-left: 2px solid #e5e7eb; padding-left: 0.5rem; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div id="content">${innerHtml}</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`
    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, "_blank", "noopener,noreferrer")
    if (w) {
      w.addEventListener("load", () => URL.revokeObjectURL(url), { once: true })
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } else {
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="bg-white text-black">
      {/* Screen-only: print and download */}
      <div className="print:hidden flex justify-end gap-2 mb-4">
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" onClick={handleDownloadPdf}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      <div ref={contentRef} id="discharge-summary-content" className="max-w-[210mm] mx-auto px-6 py-4 text-sm">
        {/* Header with logo */}
        <header className="text-center border-b border-gray-300 pb-4 mb-6">
          <img
            src={resolveFacilityLogoUrl({ letterheadTitle: facilityName })}
            alt={facilityName}
            className="mx-auto mb-3 h-auto w-[250px] max-w-[250px] object-contain"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = "none"
              const fallback = target.nextElementSibling
              if (fallback instanceof HTMLElement) fallback.style.display = "block"
            }}
          />
          <h1 className="hidden text-xl font-bold">{facilityName}</h1>
          <p className="text-base font-semibold mt-2">DISCHARGE SUMMARY</p>
        </header>

        {/* Patient & admission info */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">Patient & Admission</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="w-40 font-medium text-gray-600">Patient name</td><td>{patientName}</td></tr>
              <tr><td className="font-medium text-gray-600">Patient number</td><td>{admission.patientNumber || "—"}</td></tr>
              <tr><td className="font-medium text-gray-600">Admission number</td><td>{admission.admissionNumber}</td></tr>
              <tr><td className="font-medium text-gray-600">Admission date</td><td>{admissionDate}</td></tr>
              <tr><td className="font-medium text-gray-600">Discharge date</td><td>{dischargeDate}</td></tr>
              <tr><td className="font-medium text-gray-600">Ward / Bed</td><td>{[admission.wardName, admission.bedNumber].filter(Boolean).join(" – ") || "—"}</td></tr>
              <tr><td className="font-medium text-gray-600">Attending doctor</td><td>{doctorName ? `Dr. ${doctorName}` : "—"}</td></tr>
            </tbody>
          </table>
        </section>

        {/* Diagnosis */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">Diagnosis</h2>
          <p className="whitespace-pre-wrap">{admission.admissionDiagnosis || "—"}</p>
          {overview.diagnoses && overview.diagnoses.length > 0 && (
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {overview.diagnoses.map((d, i) => (
                <li key={i}>
                  {[d.diagnosisCode, d.diagnosisDescription].filter(Boolean).join(" – ")}
                  {d.diagnosisType && d.diagnosisType !== "primary" && ` (${d.diagnosisType})`}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reason for admission */}
        {admission.admissionReason && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">Reason for admission</h2>
            <p className="whitespace-pre-wrap">{admission.admissionReason}</p>
          </section>
        )}

        {/* Summary of care */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">Summary of care</h2>
          {overview.reviews && overview.reviews.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 mb-1">Doctor reviews</h3>
              {overview.reviews.slice(0, 3).map((r, i) => (
                <div key={i} className="mb-2 pl-2 border-l-2 border-gray-200">
                  <span className="text-gray-600">{format(new Date(r.reviewDate), "PP")}</span>
                  {r.reviewType && <span className="ml-2 text-gray-500">({r.reviewType})</span>}
                  {(r.assessment || r.plan || r.notes) && (
                    <p className="mt-1">{[r.assessment, r.plan, r.notes].filter(Boolean).join(" ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {overview.nursingCare && overview.nursingCare.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 mb-1">Nursing care</h3>
              <ul className="list-disc pl-5 space-y-1">
                {overview.nursingCare.slice(0, 5).map((n, i) => (
                  <li key={i}>
                    {format(new Date(n.careDate), "PP")} – {[n.careType, n.observations, n.interventions, n.notes].filter(Boolean).join("; ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {overview.vitals && overview.vitals.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 mb-1">Vital signs (recent)</h3>
              <p className="text-gray-700">
                Last recorded: {format(new Date(overview.vitals[0].recordedDate), "PPp")}
                {overview.vitals[0].systolicBP != null && overview.vitals[0].diastolicBP != null && ` – BP ${overview.vitals[0].systolicBP}/${overview.vitals[0].diastolicBP}`}
                {overview.vitals[0].heartRate != null && ` – HR ${overview.vitals[0].heartRate}`}
                {overview.vitals[0].temperature != null && ` – Temp ${overview.vitals[0].temperature}°C`}
              </p>
            </div>
          )}
        </section>

        {/* Procedures */}
        {overview.procedures && overview.procedures.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">Procedures</h2>
            <ul className="list-disc pl-5 space-y-1">
              {overview.procedures.map((p, i) => (
                <li key={i}>
                  {format(new Date(p.procedureDate), "PP")} – {p.procedureName || "Procedure"}
                  {p.notes && ` – ${p.notes}`}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Medications */}
        {overview.prescriptions && overview.prescriptions.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">Medications (during admission)</h2>
            <ul className="list-disc pl-5 space-y-1">
              {overview.prescriptions.map((pr, i) => (
                <li key={i}>
                  {format(new Date(pr.prescriptionDate), "PP")} – {pr.medicationNames || pr.items?.map((it) => it.medicationName || it.dosage).join(", ") || "—"}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Labs / Radiology */}
        {(overview.labOrders?.length || overview.radiologyOrders?.length) ? (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">Investigations</h2>
            {overview.labOrders && overview.labOrders.length > 0 && (
              <p className="mb-1"><span className="font-medium">Labs:</span> {overview.labOrders.map((l) => l.testName).filter(Boolean).join(", ") || "—"}</p>
            )}
            {overview.radiologyOrders && overview.radiologyOrders.length > 0 && (
              <p><span className="font-medium">Radiology:</span> {overview.radiologyOrders.map((r) => r.examName).filter(Boolean).join(", ") || "—"}</p>
            )}
          </section>
        ) : null}

        {/* Discharge notes / instructions */}
        {(admission.notes || admission.status === "discharged") && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">Discharge notes / instructions</h2>
            <p className="whitespace-pre-wrap">{admission.notes || "—"}</p>
          </section>
        )}

        <footer className="mt-8 pt-4 border-t border-gray-300 text-gray-500 text-xs text-center">
          Generated on {format(new Date(), "PPp")} – {facilityName}
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #discharge-summary-content, #discharge-summary-content * { visibility: visible; }
          #discharge-summary-content { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}} />
    </div>
  )
}
