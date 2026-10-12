/**
 * Utility functions for generating PDF and print versions of radiology orders and results
 */

import { buildDocumentHeaderHtml } from "@/lib/facility-profile"

interface RadiologyOrder {
  orderNumber: string
  orderDate: string
  patientName: string
  patientNumber?: string
  doctorName: string
  priority: string
  status: string
  clinicalIndication?: string
  examName?: string
  examCode?: string
  category?: string
  bodyPart?: string
  scheduledDate?: string
  notes?: string
}

/**
 * Generate HTML for radiology order print/PDF
 */
export function generateRadiologyOrderHTML(order: RadiologyOrder): string {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Radiology Order - ${order.orderNumber}</title>
        <style>
          @media print {
            @page { margin: 15mm; }
            body { margin: 0; }
            .no-print { display: none; }
          }
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header img {
            max-width: 150px;
            height: auto;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 10px 0 5px 0;
            font-size: 24px;
            font-weight: bold;
          }
          .header h2 {
            margin: 5px 0;
            font-size: 18px;
            color: #666;
          }
          .info-section {
            margin: 20px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: bold;
            color: #555;
          }
          .results-section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #fff;
          }
          .results-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 2px solid #000;
          }
          .results-content {
            white-space: pre-wrap;
            line-height: 1.6;
            font-size: 14px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #000;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${buildDocumentHeaderHtml(null, typeof window !== "undefined" ? window.location.origin : "", {
            documentTitle: "RADIOLOGY EXAMINATION ORDER",
            subtitle: `Order Number: ${order.orderNumber}`,
          })}
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Order Number:</span>
            <span>${order.orderNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Order Date:</span>
            <span>${formatDate(order.orderDate)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Patient Name:</span>
            <span>${order.patientName}</span>
          </div>
          ${order.patientNumber ? `
          <div class="info-row">
            <span class="info-label">Patient Number:</span>
            <span>${order.patientNumber}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Doctor:</span>
            <span>${order.doctorName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Examination:</span>
            <span>${order.examName || 'Unknown Examination'}${order.examCode ? ` (${order.examCode})` : ''}</span>
          </div>
          ${order.category ? `
          <div class="info-row">
            <span class="info-label">Category:</span>
            <span>${order.category}</span>
          </div>
          ` : ''}
          ${order.bodyPart ? `
          <div class="info-row">
            <span class="info-label">Body Part:</span>
            <span>${order.bodyPart}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Priority:</span>
            <span>${order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span>${formatStatus(order.status)}</span>
          </div>
          ${order.scheduledDate ? `
          <div class="info-row">
            <span class="info-label">Scheduled Date:</span>
            <span>${formatDateTime(order.scheduledDate)}</span>
          </div>
          ` : ''}
          ${order.clinicalIndication ? `
          <div class="info-row">
            <span class="info-label">Clinical Indication:</span>
            <span>${order.clinicalIndication}</span>
          </div>
          ` : ''}
        </div>

        ${order.notes ? `
        <div class="results-section">
          <div class="results-title">Examination Results/Notes</div>
          <div class="results-content">${order.notes}</div>
        </div>
        ` : ''}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>This is a computer-generated report. No signature required.</p>
        </div>
      </body>
    </html>
  `
}

/**
 * Print radiology order
 */
export function printRadiologyOrder(order: RadiologyOrder) {
  const html = generateRadiologyOrderHTML(order)
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    alert('Please allow popups to print this document')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

/**
 * Download radiology order as PDF (using print dialog)
 */
export function downloadRadiologyOrderPDF(order: RadiologyOrder) {
  printRadiologyOrder(order) // Uses browser's print to PDF functionality
}

/**
 * Generate HTML for combined radiology orders report
 */
export function generateCombinedRadiologyReportHTML(
  orders: Array<RadiologyOrder>,
  filters?: {
    dateFrom?: string
    dateTo?: string
    doctorName?: string
    patientName?: string
  }
): string {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const filterDescription = filters
    ? [
        filters.dateFrom && filters.dateTo
          ? `Date Range: ${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`
          : filters.dateFrom
          ? `Date: ${formatDate(filters.dateFrom)}`
          : null,
        filters.doctorName ? `Doctor: ${filters.doctorName}` : null,
        filters.patientName ? `Patient: ${filters.patientName}` : null,
      ]
        .filter(Boolean)
        .join(' | ')
    : null

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Radiology Report - Combined</title>
        <style>
          @media print {
            @page { margin: 15mm; }
            body { margin: 0; }
            .no-print { display: none; }
            .order-section { page-break-inside: avoid; }
          }
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header img {
            max-width: 150px;
            height: auto;
            margin-bottom: 10px;
          }
          .header h1 {
            margin: 10px 0 5px 0;
            font-size: 24px;
            font-weight: bold;
          }
          .header h2 {
            margin: 5px 0;
            font-size: 18px;
            color: #666;
          }
          .filter-info {
            margin: 15px 0;
            padding: 10px;
            background-color: #f0f0f0;
            border-radius: 5px;
            font-size: 12px;
            text-align: center;
          }
          .order-section {
            margin: 30px 0;
            padding: 20px;
            border: 2px solid #ddd;
            border-radius: 5px;
            background-color: #fff;
            page-break-inside: avoid;
          }
          .order-header {
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .order-header h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
            color: #000;
          }
          .info-section {
            margin: 15px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #eee;
            font-size: 12px;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: bold;
            color: #555;
          }
          .results-section {
            margin: 15px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #fff;
          }
          .results-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
          }
          .results-content {
            white-space: pre-wrap;
            line-height: 1.6;
            font-size: 12px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #000;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .summary {
            margin: 20px 0;
            padding: 15px;
            background-color: #e8f4f8;
            border-radius: 5px;
            text-align: center;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${buildDocumentHeaderHtml(null, typeof window !== "undefined" ? window.location.origin : "", {
            documentTitle: "RADIOLOGY EXAMINATION REPORT",
            subtitle: "Combined Orders and Results",
          })}
        </div>

        ${filterDescription ? `
        <div class="filter-info">
          <strong>Report Filters:</strong> ${filterDescription}
        </div>
        ` : ''}

        <div class="summary">
          Total Orders: ${orders.length} |
          Completed: ${orders.filter(o => o.status === 'completed').length} |
          Pending: ${orders.filter(o => o.status === 'pending').length} |
          In Progress: ${orders.filter(o => o.status === 'in_progress').length}
        </div>

        ${orders.map((order, index) => `
          <div class="order-section">
            <div class="order-header">
              <h3>Order #${index + 1}: ${order.orderNumber}</h3>
            </div>

            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Order Number:</span>
                <span>${order.orderNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Order Date:</span>
                <span>${formatDate(order.orderDate)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Patient Name:</span>
                <span>${order.patientName}</span>
              </div>
              ${order.patientNumber ? `
              <div class="info-row">
                <span class="info-label">Patient Number:</span>
                <span>${order.patientNumber}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Doctor:</span>
                <span>${order.doctorName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Examination:</span>
                <span>${order.examName || 'Unknown Examination'}${order.examCode ? ` (${order.examCode})` : ''}</span>
              </div>
              ${order.category ? `
              <div class="info-row">
                <span class="info-label">Category:</span>
                <span>${order.category}</span>
              </div>
              ` : ''}
              ${order.bodyPart ? `
              <div class="info-row">
                <span class="info-label">Body Part:</span>
                <span>${order.bodyPart}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">Priority:</span>
                <span>${order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span>${formatStatus(order.status)}</span>
              </div>
              ${order.scheduledDate ? `
              <div class="info-row">
                <span class="info-label">Scheduled Date:</span>
                <span>${formatDateTime(order.scheduledDate)}</span>
              </div>
              ` : ''}
              ${order.clinicalIndication ? `
              <div class="info-row">
                <span class="info-label">Clinical Indication:</span>
                <span>${order.clinicalIndication}</span>
              </div>
              ` : ''}
            </div>

            ${order.notes ? `
            <div class="results-section">
              <div class="results-title">Examination Results/Notes</div>
              <div class="results-content">${order.notes}</div>
            </div>
            ` : '<div class="results-section"><div class="results-content" style="color: #666; font-style: italic;">No results or notes recorded yet.</div></div>'}
          </div>
        `).join('')}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>This is a computer-generated report. No signature required.</p>
        </div>
      </body>
    </html>
  `
}

/**
 * Print combined radiology orders report
 */
export function printCombinedRadiologyReport(
  orders: Array<RadiologyOrder>,
  filters?: {
    dateFrom?: string
    dateTo?: string
    doctorName?: string
    patientName?: string
  }
) {
  const html = generateCombinedRadiologyReportHTML(orders, filters)
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    alert('Please allow popups to print this document')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

/**
 * Download combined radiology orders report as PDF
 */
export function downloadCombinedRadiologyReportPDF(
  orders: Array<RadiologyOrder>,
  filters?: {
    dateFrom?: string
    dateTo?: string
    doctorName?: string
    patientName?: string
  }
) {
  printCombinedRadiologyReport(orders, filters) // Uses browser's print to PDF functionality
}
