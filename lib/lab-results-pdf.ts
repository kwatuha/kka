/**
 * Utility functions for generating PDF and print versions of lab results and test orders
 */

import { buildDocumentHeaderHtml } from "@/lib/facility-profile"

interface LabTestResult {
  testName: string
  date: string
  time: string
  category: string
  status: string
  orderedBy: string
  performedBy: string
  clinicalIndication?: string
  results: Array<{
    parameter: string
    value: string
    unit: string
    referenceRange: string
    flag: string
  }>
}

interface LabTestOrder {
  orderNumber: string
  orderDate: string
  patientName: string
  patientNumber?: string
  doctorName: string
  priority: string
  status: string
  clinicalIndication?: string
  testNames?: string
  items: Array<{
    testName: string
    testCode?: string
    category?: string
    status: string
    notes?: string
    result?: {
      testDate: string
      status: string
      performedByFirstName?: string
      performedByLastName?: string
      verifiedByFirstName?: string
      verifiedByLastName?: string
      verifiedAt?: string
      values?: Array<{
        parameterName: string
        value: string
        unit: string
        normalRange: string
        flag: string
        notes?: string
      }>
      notes?: string
    }
  }>
}

/**
 * Generate HTML for lab test result print/PDF
 */
export function generateLabResultHTML(result: LabTestResult): string {
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

  const getFlagBadge = (flag: string) => {
    const colors: Record<string, string> = {
      normal: '#10b981',
      low: '#f59e0b',
      high: '#f59e0b',
      critical: '#ef4444'
    }
    const color = colors[flag] || '#6b7280'
    return `<span style="display: inline-block; padding: 2px 8px; background-color: ${color}; color: white; border-radius: 4px; font-size: 11px; font-weight: bold;">${flag.toUpperCase()}</span>`
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lab Test Result - ${result.testName}</title>
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
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
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
          ${buildDocumentHeaderHtml(null, window.location.origin, {
            documentTitle: "LABORATORY TEST RESULT",
            subtitle: result.testName,
          })}
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Test Name:</span>
            <span>${result.testName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Category:</span>
            <span>${result.category}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Test Date:</span>
            <span>${formatDate(result.date)} at ${result.time}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span>${result.status}</span>
          </div>
          ${result.clinicalIndication ? `
          <div class="info-row">
            <span class="info-label">Clinical Indication:</span>
            <span>${result.clinicalIndication}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Ordered By:</span>
            <span>${result.orderedBy}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Performed By:</span>
            <span>${result.performedBy}</span>
          </div>
        </div>

        ${result.results && result.results.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Result</th>
              <th>Unit</th>
              <th>Reference Range</th>
              <th>Flag</th>
            </tr>
          </thead>
          <tbody>
            ${result.results.map(r => `
              <tr>
                <td>${r.parameter}</td>
                <td style="font-weight: bold;">${r.value}</td>
                <td>${r.unit || '-'}</td>
                <td>${r.referenceRange || '-'}</td>
                <td>${getFlagBadge(r.flag)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p style="text-align: center; padding: 20px; color: #666;">No result values available</p>'}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>This is a computer-generated report. No signature required.</p>
        </div>
      </body>
    </html>
  `
}

/**
 * Generate HTML for lab test order print/PDF
 */
export function generateLabOrderHTML(order: LabTestOrder): string {
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

  const formatStatus = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getFlagBadge = (flag: string) => {
    const colors: Record<string, string> = {
      normal: '#10b981',
      low: '#f59e0b',
      high: '#f59e0b',
      critical: '#ef4444'
    }
    const color = colors[flag] || '#6b7280'
    return `<span style="display: inline-block; padding: 2px 8px; background-color: ${color}; color: white; border-radius: 4px; font-size: 11px; font-weight: bold;">${flag.toUpperCase()}</span>`
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lab Test Order - ${order.orderNumber}</title>
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
          .test-item {
            margin: 15px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #fff;
          }
          .test-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
          }
          .test-item-title {
            font-weight: bold;
            font-size: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
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
          ${buildDocumentHeaderHtml(null, window.location.origin, {
            documentTitle: "LABORATORY TEST ORDER",
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
            <span class="info-label">Priority:</span>
            <span>${order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span>${formatStatus(order.status)}</span>
          </div>
          ${order.clinicalIndication ? `
          <div class="info-row">
            <span class="info-label">Clinical Indication:</span>
            <span>${order.clinicalIndication}</span>
          </div>
          ` : ''}
          ${order.testNames ? `
          <div class="info-row">
            <span class="info-label">Tests:</span>
            <span>${order.testNames}</span>
          </div>
          ` : ''}
        </div>

        ${order.items && order.items.length > 0 ? `
        <h3 style="margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px;">Test Items</h3>
        ${order.items.map(item => `
          <div class="test-item">
            <div class="test-item-header">
              <div>
                <div class="test-item-title">${item.testName}</div>
                ${item.testCode ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">Code: ${item.testCode}</div>` : ''}
                ${item.category ? `<div style="font-size: 12px; color: #666;">Category: ${item.category}</div>` : ''}
              </div>
              <span style="padding: 4px 12px; background-color: #f5f5f5; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${formatStatus(item.status)}
              </span>
            </div>
            ${item.notes ? `<p style="margin: 10px 0; font-size: 12px; color: #666;"><strong>Notes:</strong> ${item.notes}</p>` : ''}

            ${item.result ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                <div style="margin-bottom: 10px;">
                  <strong style="font-size: 14px;">Test Results</strong>
                  <span style="margin-left: 10px; padding: 2px 8px; background-color: #10b981; color: white; border-radius: 4px; font-size: 11px; font-weight: bold;">
                    ${formatStatus(item.result.status)}
                  </span>
                </div>
                <div style="font-size: 11px; color: #666; margin-bottom: 10px;">
                  <div>Test Date: ${formatDate(item.result.testDate)}</div>
                  ${item.result.performedByFirstName ? `<div>Performed by: ${item.result.performedByFirstName} ${item.result.performedByLastName || ''}</div>` : ''}
                  ${item.result.verifiedByFirstName ? `<div>Verified by: ${item.result.verifiedByFirstName} ${item.result.verifiedByLastName || ''}${item.result.verifiedAt ? ` on ${formatDate(item.result.verifiedAt)}` : ''}</div>` : ''}
                </div>

                ${item.result.values && item.result.values.length > 0 ? `
                <table>
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Value</th>
                      <th>Unit</th>
                      <th>Normal Range</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${item.result.values.map(v => `
                      <tr>
                        <td>${v.parameterName}</td>
                        <td style="font-weight: bold;">${v.value || '-'}</td>
                        <td>${v.unit || '-'}</td>
                        <td>${v.normalRange || '-'}</td>
                        <td>${getFlagBadge(v.flag || 'normal')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                ` : ''}

                ${item.result.notes ? `
                <div style="margin-top: 10px; padding: 10px; background-color: #f9f9f9; border-radius: 4px;">
                  <strong style="font-size: 12px;">Notes:</strong>
                  <p style="margin: 5px 0 0 0; font-size: 12px;">${item.result.notes}</p>
                </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `).join('')}
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
 * Print lab test result
 */
export function printLabResult(result: LabTestResult) {
  const html = generateLabResultHTML(result)
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
 * Download lab test result as PDF (using print dialog)
 */
export function downloadLabResultPDF(result: LabTestResult) {
  printLabResult(result) // Uses browser's print to PDF functionality
}

/**
 * Print lab test order
 */
export function printLabOrder(order: LabTestOrder) {
  const html = generateLabOrderHTML(order)
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
 * Download lab test order as PDF (using print dialog)
 */
export function downloadLabOrderPDF(order: LabTestOrder) {
  printLabOrder(order) // Uses browser's print to PDF functionality
}

/**
 * Generate HTML for combined lab orders and results report
 */
export function generateCombinedLabReportHTML(
  orders: Array<LabTestOrder>,
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

  const formatStatus = (status: string) => {
    return status.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getFlagBadge = (flag: string) => {
    const colors: Record<string, string> = {
      normal: '#10b981',
      low: '#f59e0b',
      high: '#f59e0b',
      critical: '#ef4444'
    }
    const color = colors[flag] || '#6b7280'
    return `<span style="display: inline-block; padding: 2px 8px; background-color: ${color}; color: white; border-radius: 4px; font-size: 11px; font-weight: bold;">${flag.toUpperCase()}</span>`
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
        <title>Lab Test Report - Combined</title>
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
          .test-item {
            margin: 15px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #fff;
          }
          .test-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
          }
          .test-item-title {
            font-weight: bold;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
            font-weight: bold;
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
            documentTitle: "LABORATORY TEST REPORT",
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
          Total Tests: ${orders.reduce((sum, o) => sum + (o.items?.length || 0), 0)} |
          Completed Tests: ${orders.reduce((sum, o) => sum + (o.items?.filter((i: any) => i.result?.status === 'verified').length || 0), 0)}
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
                <span class="info-label">Priority:</span>
                <span>${order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status:</span>
                <span>${formatStatus(order.status)}</span>
              </div>
              ${order.clinicalIndication ? `
              <div class="info-row">
                <span class="info-label">Clinical Indication:</span>
                <span>${order.clinicalIndication}</span>
              </div>
              ` : ''}
            </div>

            ${order.items && order.items.length > 0 ? `
            <h4 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Test Items</h4>
            ${order.items.map((item: any) => `
              <div class="test-item">
                <div class="test-item-header">
                  <div>
                    <div class="test-item-title">${item.testName}</div>
                    ${item.testCode ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">Code: ${item.testCode}</div>` : ''}
                    ${item.category ? `<div style="font-size: 11px; color: #666;">Category: ${item.category}</div>` : ''}
                  </div>
                  <span style="padding: 4px 12px; background-color: #f5f5f5; border-radius: 4px; font-size: 11px; font-weight: bold;">
                    ${formatStatus(item.status)}
                  </span>
                </div>
                ${item.notes ? `<p style="margin: 10px 0; font-size: 11px; color: #666;"><strong>Notes:</strong> ${item.notes}</p>` : ''}

                ${item.result ? `
                  <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
                    <div style="margin-bottom: 10px;">
                      <strong style="font-size: 12px;">Test Results</strong>
                      <span style="margin-left: 10px; padding: 2px 8px; background-color: #10b981; color: white; border-radius: 4px; font-size: 10px; font-weight: bold;">
                        ${formatStatus(item.result.status)}
                      </span>
                    </div>
                    <div style="font-size: 10px; color: #666; margin-bottom: 10px;">
                      <div>Test Date: ${formatDate(item.result.testDate)}</div>
                      ${item.result.performedByFirstName ? `<div>Performed by: ${item.result.performedByFirstName} ${item.result.performedByLastName || ''}</div>` : ''}
                      ${item.result.verifiedByFirstName ? `<div>Verified by: ${item.result.verifiedByFirstName} ${item.result.verifiedByLastName || ''}${item.result.verifiedAt ? ` on ${formatDate(item.result.verifiedAt)}` : ''}</div>` : ''}
                    </div>

                    ${item.result.values && item.result.values.length > 0 ? `
                    <table>
                      <thead>
                        <tr>
                          <th>Parameter</th>
                          <th>Value</th>
                          <th>Unit</th>
                          <th>Normal Range</th>
                          <th>Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${item.result.values.map((v: any) => `
                          <tr>
                            <td>${v.parameterName}</td>
                            <td style="font-weight: bold;">${v.value || '-'}</td>
                            <td>${v.unit || '-'}</td>
                            <td>${v.normalRange || '-'}</td>
                            <td>${getFlagBadge(v.flag || 'normal')}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                    ` : ''}

                    ${item.result.notes ? `
                    <div style="margin-top: 10px; padding: 10px; background-color: #f9f9f9; border-radius: 4px;">
                      <strong style="font-size: 11px;">Notes:</strong>
                      <p style="margin: 5px 0 0 0; font-size: 11px;">${item.result.notes}</p>
                    </div>
                    ` : ''}
                  </div>
                ` : '<div style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-radius: 4px; font-size: 11px; color: #856404;"><strong>Status:</strong> Results pending</div>'}
              </div>
            `).join('')}
            ` : '<p style="text-align: center; padding: 20px; color: #666;">No test items in this order</p>'}
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
 * Print combined lab orders and results report
 */
export function printCombinedLabReport(
  orders: Array<LabTestOrder>,
  filters?: {
    dateFrom?: string
    dateTo?: string
    doctorName?: string
    patientName?: string
  }
) {
  const html = generateCombinedLabReportHTML(orders, filters)
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
 * Download combined lab orders and results report as PDF
 */
export function downloadCombinedLabReportPDF(
  orders: Array<LabTestOrder>,
  filters?: {
    dateFrom?: string
    dateTo?: string
    doctorName?: string
    patientName?: string
  }
) {
  printCombinedLabReport(orders, filters) // Uses browser's print to PDF functionality
}
