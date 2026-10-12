/**
 * MOH Reports PDF Generation Utility
 * Generates Kenya Ministry of Health reports in PDF format
 */

import { format } from "date-fns"
import { resolveFacilityLogoUrl } from "@/lib/facility-profile"
import { MOH_KENYA_HEALTH_BANNER, sanitizePrintText } from "@/lib/sanitize-print-text"

interface MOH717Data {
  facilityName: string
  facilityCode: string
  period: {
    start: string
    end: string
  }
  workload: {
    outpatients: number
    inpatients: number
    deliveries: number
    surgeries: number
    laboratoryTests: number
    radiologyExams: number
    pharmacyPrescriptions: number
  }
}

interface MOH731PlusData {
  facilityName: string
  facilityCode: string
  period: {
    start: string
    end: string
  }
  keyPopulations: {
    hivTesting: number
    hivPositive: number
    onART: number
    viralLoad: number
    tuberculosis: number
    stiServices: number
  }
}

interface MOH705Data {
  facilityName: string
  facilityCode: string
  period: {
    start: string
    end: string
  }
  morbidity: {
    malaria: number
    respiratoryInfections: number
    diarrhealDiseases: number
    skinDiseases: number
    eyeDiseases: number
    injuries: number
    otherConditions: number
  }
}

interface MOH711Data {
  facilityName: string
  facilityCode: string
  period: {
    start: string
    end: string
  }
  immunization: {
    bcg: number
    opv: number
    dpt: number
    measles: number
    tetanus: number
    hepatitisB: number
    pentavalent: number
  }
}

interface MOH708Data {
  facilityName: string
  facilityCode: string
  period: {
    start: string
    end: string
  }
  mch: {
    antenatalVisits: number
    deliveries: number
    postnatalVisits: number
    familyPlanning: number
    childClinic: number
    growthMonitoring: number
  }
}

interface MOH730Data {
  facilityName: string
  facilityCode: string
  period: {
    start: string
    end: string
  }
  facility: {
    beds: number
    staff: number
    equipment: number
    infrastructure: string
    services: string[]
  }
}

/**
 * Generate HTML content for MOH 717 report
 */
function generateMOH717HTML(data: MOH717Data): string {
  const periodStart = format(new Date(data.period.start), "dd MMM yyyy")
  const periodEnd = format(new Date(data.period.end), "dd MMM yyyy")

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>MOH 717 - Monthly Workload Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .header img {
            max-width: 150px;
            height: auto;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
          }
          .header h2 {
            margin: 5px 0;
            font-size: 16px;
            font-weight: normal;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            @page {
              size: A4;
              margin: 1cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${resolveFacilityLogoUrl()}" alt="Facility logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display: none;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">KIPLOMBE</h1>
            <h2 style="margin: 5px 0; font-size: 18px; color: #333;">Medical Centre</h2>
          </div>
          <h1 style="margin-top: 15px;">REPUBLIC OF KENYA</h1>
          <h2>MINISTRY OF HEALTH</h2>
          <h2>MOH 717 - MONTHLY WORKLOAD REPORT</h2>
        </div>

        <div>
          <p><strong>Facility Name:</strong> ${data.facilityName}</p>
          <p><strong>Facility Code:</strong> ${data.facilityCode}</p>
          <p><strong>Reporting Period:</strong> ${periodStart} to ${periodEnd}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Service Category</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Outpatient Department Visits</td>
              <td>${data.workload.outpatients}</td>
            </tr>
            <tr>
              <td>Inpatient Admissions</td>
              <td>${data.workload.inpatients}</td>
            </tr>
            <tr>
              <td>Deliveries</td>
              <td>${data.workload.deliveries}</td>
            </tr>
            <tr>
              <td>Surgical Procedures</td>
              <td>${data.workload.surgeries}</td>
            </tr>
            <tr>
              <td>Laboratory Tests</td>
              <td>${data.workload.laboratoryTests}</td>
            </tr>
            <tr>
              <td>Radiology Examinations</td>
              <td>${data.workload.radiologyExams}</td>
            </tr>
            <tr>
              <td>Pharmacy Prescriptions</td>
              <td>${data.workload.pharmacyPrescriptions}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p>
          <p>This report is required by Kenya Ministry of Health for health information management</p>
        </div>
      </body>
    </html>
  `
}

/**
 * Generate and download PDF using browser print functionality
 */
function downloadPDF(html: string, filename: string) {
  const safeHtml = sanitizePrintText(html)
  const blob = new Blob(["\uFEFF", safeHtml], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, "_blank")

  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        // Clean up after printing
        setTimeout(() => {
          URL.revokeObjectURL(url)
        }, 1000)
      }, 250)
    }
  } else {
    // Fallback: create download link
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }
}

/**
 * Generate MOH 717 PDF report
 */
export async function generateMOH717PDF(data: MOH717Data) {
  const html = generateMOH717HTML(data)
  downloadPDF(html, `MOH_717_${data.period.start}_${data.period.end}`)
}

/**
 * Generate MOH 731 Plus PDF report
 */
export async function generateMOH731PlusPDF(data: MOH731PlusData) {
  const periodStart = format(new Date(data.period.start), "dd MMM yyyy")
  const periodEnd = format(new Date(data.period.end), "dd MMM yyyy")

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>MOH 731 Plus - Key Populations Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header img { max-width: 150px; height: auto; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header h2 { margin: 5px 0; font-size: 16px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print { @page { size: A4; margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${resolveFacilityLogoUrl()}" alt="Facility logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display: none;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">KIPLOMBE</h1>
            <h2 style="margin: 5px 0; font-size: 18px; color: #333;">Medical Centre</h2>
          </div>
          <h1 style="margin-top: 15px;">REPUBLIC OF KENYA</h1>
          <h2>MINISTRY OF HEALTH</h2>
          <h2>MOH 731 Plus - KEY POPULATIONS REPORT</h2>
        </div>
        <div>
          <p><strong>Facility Name:</strong> ${data.facilityName}</p>
          <p><strong>Facility Code:</strong> ${data.facilityCode}</p>
          <p><strong>Reporting Period:</strong> ${periodStart} to ${periodEnd}</p>
        </div>
        <table>
          <thead>
            <tr><th>Service</th><th>Count</th></tr>
          </thead>
          <tbody>
            <tr><td>HIV Testing</td><td>${data.keyPopulations.hivTesting}</td></tr>
            <tr><td>HIV Positive Cases</td><td>${data.keyPopulations.hivPositive}</td></tr>
            <tr><td>Patients on ART</td><td>${data.keyPopulations.onART}</td></tr>
            <tr><td>Viral Load Tests</td><td>${data.keyPopulations.viralLoad}</td></tr>
            <tr><td>Tuberculosis Cases</td><td>${data.keyPopulations.tuberculosis}</td></tr>
            <tr><td>STI Services</td><td>${data.keyPopulations.stiServices}</td></tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p>
        </div>
      </body>
    </html>
  `
  downloadPDF(html, `MOH_731Plus_${data.period.start}_${data.period.end}`)
}

/**
 * Generate MOH 705 PDF report
 */
export async function generateMOH705PDF(data: MOH705Data) {
  const periodStart = format(new Date(data.period.start), "dd MMM yyyy")
  const periodEnd = format(new Date(data.period.end), "dd MMM yyyy")

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>MOH 705 - Morbidity Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header img { max-width: 150px; height: auto; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header h2 { margin: 5px 0; font-size: 16px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print { @page { size: A4; margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${resolveFacilityLogoUrl()}" alt="Facility logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display: none;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">KIPLOMBE</h1>
            <h2 style="margin: 5px 0; font-size: 18px; color: #333;">Medical Centre</h2>
          </div>
          <h1 style="margin-top: 15px;">REPUBLIC OF KENYA</h1>
          <h2>MINISTRY OF HEALTH</h2>
          <h2>MOH 705 - MORBIDITY REPORT</h2>
        </div>
        <div>
          <p><strong>Facility Name:</strong> ${data.facilityName}</p>
          <p><strong>Facility Code:</strong> ${data.facilityCode}</p>
          <p><strong>Reporting Period:</strong> ${periodStart} to ${periodEnd}</p>
        </div>
        <table>
          <thead>
            <tr><th>Condition/Disease</th><th>Cases</th></tr>
          </thead>
          <tbody>
            <tr><td>Malaria</td><td>${data.morbidity.malaria}</td></tr>
            <tr><td>Respiratory Infections</td><td>${data.morbidity.respiratoryInfections}</td></tr>
            <tr><td>Diarrheal Diseases</td><td>${data.morbidity.diarrhealDiseases}</td></tr>
            <tr><td>Skin Diseases</td><td>${data.morbidity.skinDiseases}</td></tr>
            <tr><td>Eye Diseases</td><td>${data.morbidity.eyeDiseases}</td></tr>
            <tr><td>Injuries</td><td>${data.morbidity.injuries}</td></tr>
            <tr><td>Other Conditions</td><td>${data.morbidity.otherConditions}</td></tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p>
        </div>
      </body>
    </html>
  `
  downloadPDF(html, `MOH_705_${data.period.start}_${data.period.end}`)
}

/**
 * Generate MOH 711 PDF report
 */
export async function generateMOH711PDF(data: MOH711Data) {
  const periodStart = format(new Date(data.period.start), "dd MMM yyyy")
  const periodEnd = format(new Date(data.period.end), "dd MMM yyyy")

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>MOH 711 - Immunization Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header img { max-width: 150px; height: auto; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header h2 { margin: 5px 0; font-size: 16px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print { @page { size: A4; margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${resolveFacilityLogoUrl()}" alt="Facility logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display: none;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">KIPLOMBE</h1>
            <h2 style="margin: 5px 0; font-size: 18px; color: #333;">Medical Centre</h2>
          </div>
          <h1 style="margin-top: 15px;">REPUBLIC OF KENYA</h1>
          <h2>MINISTRY OF HEALTH</h2>
          <h2>MOH 711 - IMMUNIZATION REPORT</h2>
        </div>
        <div>
          <p><strong>Facility Name:</strong> ${data.facilityName}</p>
          <p><strong>Facility Code:</strong> ${data.facilityCode}</p>
          <p><strong>Reporting Period:</strong> ${periodStart} to ${periodEnd}</p>
        </div>
        <table>
          <thead>
            <tr><th>Vaccine Type</th><th>Doses Administered</th></tr>
          </thead>
          <tbody>
            <tr><td>BCG (Tuberculosis)</td><td>${data.immunization.bcg}</td></tr>
            <tr><td>OPV (Oral Polio Vaccine)</td><td>${data.immunization.opv}</td></tr>
            <tr><td>DPT (Diphtheria, Pertussis, Tetanus)</td><td>${data.immunization.dpt}</td></tr>
            <tr><td>Measles</td><td>${data.immunization.measles}</td></tr>
            <tr><td>Tetanus Toxoid</td><td>${data.immunization.tetanus}</td></tr>
            <tr><td>Hepatitis B</td><td>${data.immunization.hepatitisB}</td></tr>
            <tr><td>Pentavalent</td><td>${data.immunization.pentavalent}</td></tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p>
        </div>
      </body>
    </html>
  `
  downloadPDF(html, `MOH_711_${data.period.start}_${data.period.end}`)
}

/**
 * Generate MOH 708 PDF report
 */
export async function generateMOH708PDF(data: MOH708Data) {
  const periodStart = format(new Date(data.period.start), "dd MMM yyyy")
  const periodEnd = format(new Date(data.period.end), "dd MMM yyyy")

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>MOH 708 - Maternal & Child Health Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header img { max-width: 150px; height: auto; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header h2 { margin: 5px 0; font-size: 16px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print { @page { size: A4; margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${resolveFacilityLogoUrl()}" alt="Facility logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display: none;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">KIPLOMBE</h1>
            <h2 style="margin: 5px 0; font-size: 18px; color: #333;">Medical Centre</h2>
          </div>
          <h1 style="margin-top: 15px;">REPUBLIC OF KENYA</h1>
          <h2>MINISTRY OF HEALTH</h2>
          <h2>MOH 708 - MATERNAL & CHILD HEALTH REPORT</h2>
        </div>
        <div>
          <p><strong>Facility Name:</strong> ${data.facilityName}</p>
          <p><strong>Facility Code:</strong> ${data.facilityCode}</p>
          <p><strong>Reporting Period:</strong> ${periodStart} to ${periodEnd}</p>
        </div>
        <table>
          <thead>
            <tr><th>Service</th><th>Count</th></tr>
          </thead>
          <tbody>
            <tr><td>Antenatal Care Visits</td><td>${data.mch.antenatalVisits}</td></tr>
            <tr><td>Deliveries</td><td>${data.mch.deliveries}</td></tr>
            <tr><td>Postnatal Care Visits</td><td>${data.mch.postnatalVisits}</td></tr>
            <tr><td>Family Planning Services</td><td>${data.mch.familyPlanning}</td></tr>
            <tr><td>Child Health Clinic Visits</td><td>${data.mch.childClinic}</td></tr>
            <tr><td>Growth Monitoring</td><td>${data.mch.growthMonitoring}</td></tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p>
        </div>
      </body>
    </html>
  `
  downloadPDF(html, `MOH_708_${data.period.start}_${data.period.end}`)
}

/**
 * Generate MOH 730 PDF report
 */
export async function generateMOH730PDF(data: MOH730Data) {
  const periodStart = format(new Date(data.period.start), "dd MMM yyyy")
  const periodEnd = format(new Date(data.period.end), "dd MMM yyyy")

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>MOH 730 - Facility Information Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .header img { max-width: 150px; height: auto; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header h2 { margin: 5px 0; font-size: 16px; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print { @page { size: A4; margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${resolveFacilityLogoUrl()}" alt="Facility logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display: none;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">KIPLOMBE</h1>
            <h2 style="margin: 5px 0; font-size: 18px; color: #333;">Medical Centre</h2>
          </div>
          <h1 style="margin-top: 15px;">REPUBLIC OF KENYA</h1>
          <h2>MINISTRY OF HEALTH</h2>
          <h2>MOH 730 - FACILITY INFORMATION REPORT</h2>
        </div>
        <div>
          <p><strong>Facility Name:</strong> ${data.facilityName}</p>
          <p><strong>Facility Code:</strong> ${data.facilityCode}</p>
          <p><strong>Reporting Period:</strong> ${periodStart} to ${periodEnd}</p>
        </div>
        <table>
          <thead>
            <tr><th>Category</th><th>Information</th></tr>
          </thead>
          <tbody>
            <tr><td>Total Beds</td><td>${data.facility.beds}</td></tr>
            <tr><td>Total Staff</td><td>${data.facility.staff}</td></tr>
            <tr><td>Medical Equipment</td><td>${data.facility.equipment}</td></tr>
            <tr><td>Infrastructure</td><td>${data.facility.infrastructure || "N/A"}</td></tr>
            <tr><td>Services Offered</td><td>${data.facility.services.join(", ") || "N/A"}</td></tr>
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p>
        </div>
      </body>
    </html>
  `
  downloadPDF(html, `MOH_730_${data.period.start}_${data.period.end}`)
}

function escapeHtml(value: unknown): string {
  return sanitizePrintText(String(value ?? ""))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function baseMohStyles(): string {
  return `
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; font-size: 12px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #000; padding-bottom: 10px; }
    .header img { max-width: 120px; height: auto; }
    h1 { font-size: 16px; margin: 8px 0 4px; }
    h2 { font-size: 14px; margin: 4px 0 12px; }
    .meta { margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
    th { background: #f0f0f0; }
    td.num { text-align: right; }
    .footer { margin-top: 24px; font-size: 10px; color: #666; }
  `
}

/**
 * Generic indicator summary PDF (MOH reports)
 */
export async function generateMOHIndicatorPDF(opts: {
  code: string
  title: string
  facilityName: string
  facilityCode: string
  period: { start: string; end: string } | null
  indicators: Record<string, unknown>
}) {
  const logoUrl = resolveFacilityLogoUrl()
  const periodLabel = opts.period
    ? `${format(new Date(opts.period.start), "dd MMM yyyy")} - ${format(new Date(opts.period.end), "dd MMM yyyy")}`
    : "Point in time"

  const rows = Object.entries(opts.indicators)
    .filter(([, v]) => v !== null && v !== undefined && !Array.isArray(v) && typeof v !== "object")
    .map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim()
      return `<tr><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(value)}</td></tr>`
    })
    .join("")

  const nested = Object.entries(opts.indicators).filter(([, v]) => Array.isArray(v))
  let nestedHtml = ""
  for (const [key, arr] of nested) {
    const list = arr as Record<string, unknown>[]
    if (!list.length) continue
    const cols = Object.keys(list[0])
    nestedHtml += `<h3 style="margin-top:18px">${escapeHtml(key)}</h3><table><thead><tr>${cols
      .map((c) => `<th>${escapeHtml(c)}</th>`)
      .join("")}</tr></thead><tbody>${list
      .map(
        (row) =>
          `<tr>${cols.map((c) => `<td>${escapeHtml(row[c])}</td>`).join("")}</tr>`
      )
      .join("")}</tbody></table>`
  }

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>${escapeHtml(opts.title)}</title><style>${baseMohStyles()}</style></head>
    <body>
      <div class="header">
        <img src="${logoUrl}" alt="Facility logo" />
        <h1>${MOH_KENYA_HEALTH_BANNER}</h1>
        <h2>${escapeHtml(opts.title)}</h2>
      </div>
      <div class="meta">
        <div><strong>Facility:</strong> ${escapeHtml(opts.facilityName)} (${escapeHtml(opts.facilityCode)})</div>
        <div><strong>Period:</strong> ${escapeHtml(periodLabel)}</div>
        <div><strong>Report code:</strong> ${escapeHtml(opts.code)}</div>
      </div>
      <table>
        <thead><tr><th>Indicator</th><th>Value</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="2">No indicator values</td></tr>`}</tbody>
      </table>
      ${nestedHtml}
      <div class="footer"><p>Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p></div>
    </body></html>`

  const periodPart = opts.period ? `${opts.period.start}_${opts.period.end}` : format(new Date(), "yyyy-MM-dd")
  downloadPDF(html, `MOH_${opts.code}_${periodPart}`)
}

/**
 * Generic register / line-list PDF
 */
export async function generateMOHRegisterPDF(opts: {
  code: string
  title: string
  facilityName: string
  facilityCode: string
  period: { start: string; end: string }
  rows: Record<string, unknown>[]
}) {
  const logoUrl = resolveFacilityLogoUrl()
  const periodLabel = `${format(new Date(opts.period.start), "dd MMM yyyy")} - ${format(
    new Date(opts.period.end),
    "dd MMM yyyy"
  )}`
  const rows = opts.rows || []
  const cols =
    rows.length > 0
      ? Object.keys(rows[0]).filter((c) => !["notes"].includes(c) || rows.length < 100)
      : ["message"]

  const body =
    rows.length === 0
      ? `<tr><td colspan="${cols.length}">No records in period</td></tr>`
      : rows
          .map(
            (row) =>
              `<tr>${cols.map((c) => `<td>${escapeHtml(row[c])}</td>`).join("")}</tr>`
          )
          .join("")

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>${escapeHtml(opts.title)}</title><style>${baseMohStyles()} td, th { font-size: 10px; }</style></head>
    <body>
      <div class="header">
        <img src="${logoUrl}" alt="Facility logo" />
        <h1>REPUBLIC OF KENYA — MINISTRY OF HEALTH</h1>
        <h2>${escapeHtml(opts.title)}</h2>
      </div>
      <div class="meta">
        <div><strong>Facility:</strong> ${escapeHtml(opts.facilityName)} (${escapeHtml(opts.facilityCode)})</div>
        <div><strong>Period:</strong> ${escapeHtml(periodLabel)}</div>
        <div><strong>Records:</strong> ${rows.length} (max 500)</div>
      </div>
      <table>
        <thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="footer"><p>Generated on ${format(new Date(), "dd MMM yyyy 'at' HH:mm")}</p></div>
    </body></html>`

  downloadPDF(html, `MOH_${opts.code}_${opts.period.start}_${opts.period.end}`)
}

