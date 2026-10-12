/** Escape text for HTML document (user / API strings). */
function escapeHtml(s: string | undefined | null): string {
  if (s == null) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export type PrintPrescriptionPatient = {
  name: string
  patientNumber?: string | null
}

/**
 * Opens a new window with a print-friendly prescription layout, then triggers the browser print dialog.
 * Returns false if popups are blocked.
 */
export function printPrescriptionFromApi(
  patient: PrintPrescriptionPatient,
  p: Record<string, unknown>,
  options?: { facilityName?: string }
): boolean {
  const facility = options?.facilityName ?? "KIPLOMBE Medical Centre"
  const items = Array.isArray(p.items) ? (p.items as Record<string, unknown>[]) : []

  const prescriptionDate = p.prescriptionDate
    ? escapeHtml(String(p.prescriptionDate).slice(0, 10))
    : "—"
  const prescriptionNumber = p.prescriptionNumber != null ? escapeHtml(String(p.prescriptionNumber)) : ""
  const status = escapeHtml(p.status != null ? String(p.status) : "—")
  const notes = p.notes != null && String(p.notes).trim() !== "" ? escapeHtml(String(p.notes)) : ""

  const dr =
    p.doctorFirstName || p.doctorLastName
      ? escapeHtml(
          `Dr ${String(p.doctorFirstName || "").trim()} ${String(p.doctorLastName || "").trim()}`.trim()
        )
      : ""

  const rowsHtml =
    items.length === 0
      ? `<tr><td colspan="6" style="padding:8px;font-style:italic">No line items.</td></tr>`
      : items
          .map((it) => {
            const name = escapeHtml(
              String(
                it.medicationNameFromCatalog ||
                  it.medicationName ||
                  it.genericName ||
                  "Medication"
              )
            )
            const dosage = escapeHtml(it.dosage != null ? String(it.dosage) : "—")
            const frequency = escapeHtml(it.frequency != null ? String(it.frequency) : "—")
            const duration = escapeHtml(it.duration != null ? String(it.duration) : "—")
            const qty = it.quantity != null && it.quantity !== "" ? escapeHtml(String(it.quantity)) : "—"
            const instr = it.instructions != null && String(it.instructions).trim() !== "" ? escapeHtml(String(it.instructions)) : "—"
            const lineSt =
              it.status != null && String(it.status).trim() !== ""
                ? escapeHtml(String(it.status))
                : "—"
            return `<tr>
              <td style="padding:6px 8px;border:1px solid #ccc;vertical-align:top">${name}</td>
              <td style="padding:6px 8px;border:1px solid #ccc;vertical-align:top">${dosage}</td>
              <td style="padding:6px 8px;border:1px solid #ccc;vertical-align:top">${frequency}</td>
              <td style="padding:6px 8px;border:1px solid #ccc;vertical-align:top">${duration}</td>
              <td style="padding:6px 8px;border:1px solid #ccc;vertical-align:top">${qty}</td>
              <td style="padding:6px 8px;border:1px solid #ccc;vertical-align:top"><span style="font-size:11px">${instr}</span><br/><span style="font-size:10px;color:#555">Line: ${lineSt}</span></td>
            </tr>`
          })
          .join("")

  const printedAt = escapeHtml(new Date().toLocaleString())

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Prescription${prescriptionNumber ? ` #${prescriptionNumber}` : ""}</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: system-ui, Segoe UI, Roboto, Arial, sans-serif; font-size: 12px; color: #111; line-height: 1.35; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    h2 { font-size: 14px; margin: 16px 0 8px 0; border-bottom: 1px solid #333; padding-bottom: 4px; }
    .meta { margin: 8px 0; }
    .meta div { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; padding: 6px 8px; border: 1px solid #333; background: #f0f0f0; font-size: 11px; }
    .footer { margin-top: 20px; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <h1>${escapeHtml(facility)}</h1>
  <p style="margin:0 0 12px 0;font-size:13px;font-weight:600">Prescription</p>
  <div class="meta">
    <div><strong>Patient:</strong> ${escapeHtml(patient.name)}${patient.patientNumber ? ` &nbsp;·&nbsp; <strong>ID:</strong> ${escapeHtml(String(patient.patientNumber))}` : ""}</div>
    <div><strong>Date:</strong> ${prescriptionDate}</div>
    ${prescriptionNumber ? `<div><strong>Prescription #:</strong> ${prescriptionNumber}</div>` : ""}
    <div><strong>Status:</strong> ${status}</div>
    ${dr ? `<div><strong>Prescriber:</strong> ${dr}</div>` : ""}
  </div>
  ${notes ? `<p style="margin:12px 0"><strong>Notes:</strong> ${notes}</p>` : ""}
  <h2>Medications</h2>
  <table>
    <thead>
      <tr>
        <th>Medication</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Qty</th>
        <th>Instructions / line status</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <p class="footer">Printed ${printedAt}</p>
  <script>
    setTimeout(function() { window.focus(); window.print(); }, 200);
  </script>
</body>
</html>`

  const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=700")
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}
