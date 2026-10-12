"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { clinicalCdsApi } from "@/lib/api"

export type LabResultSavePayload = {
  orderItemId: number
  testDate: string
  notes?: string
  values: Array<{
    parameterName: string
    value: string
    unit: string
    normalRange: string
    flag: string
    notes: string
  }>
}

type Props = {
  order: any
  orderItems: any[]
  patientId?: number | null
  onSave: (data: LabResultSavePayload) => void
  onCancel: () => void
  saving: boolean
}

export function LaboratoryResultsForm({
  order,
  orderItems,
  patientId: patientIdProp,
  onSave,
  onCancel,
  saving,
}: Props) {
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [testDate, setTestDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [resultValues, setResultValues] = useState<
    Array<{ parameterName: string; value: string; unit: string; normalRange: string; flag: string; notes: string }>
  >([])
  const [cdsAlerts, setCdsAlerts] = useState<{ severity?: string; message: string }[]>([])

  const patientId = patientIdProp ?? order?.patientId ?? null

  useEffect(() => {
    if (orderItems.length > 0 && !selectedItemId) {
      const incompleteItem = orderItems.find(
        (item: any) => !item.result?.resultId || item.status !== "completed"
      )
      setSelectedItemId(incompleteItem?.itemId || orderItems[0]?.itemId || null)
    }
  }, [orderItems, selectedItemId])

  const selectedItem = orderItems.find((item: any) => item.itemId === selectedItemId)
  const hasExistingResult = selectedItem?.result && selectedItem.result.resultId

  const buildLabCdsText = useCallback(() => {
    const parts: string[] = []
    const testLabel = selectedItem?.testName || selectedItem?.testCode
    if (testLabel) parts.push(String(testLabel))
    for (const v of resultValues) {
      if (v.parameterName.trim()) {
        parts.push(`${v.parameterName} ${v.value}`.trim())
      }
      if (v.notes?.trim()) parts.push(v.notes.trim())
    }
    if (notes.trim()) parts.push(notes.trim())
    return parts.join(" ").trim()
  }, [selectedItem, resultValues, notes])

  const labCdsText = useMemo(() => buildLabCdsText(), [buildLabCdsText])

  useEffect(() => {
    if (labCdsText.length < 4) {
      setCdsAlerts([])
      return
    }
    const pid = Number(patientId || 0)
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const r = await clinicalCdsApi.evaluate({
            ...(pid > 0 ? { patientId: pid } : {}),
            clinicalText: labCdsText,
          })
          setCdsAlerts(r.alerts || [])
        } catch {
          setCdsAlerts([])
        }
      })()
    }, 600)
    return () => clearTimeout(timer)
  }, [labCdsText, patientId])

  const handleAddParameter = () => {
    setResultValues([
      ...resultValues,
      {
        parameterName: "",
        value: "",
        unit: "",
        normalRange: "",
        flag: "normal",
        notes: "",
      },
    ])
  }

  const handleRemoveParameter = (index: number) => {
    setResultValues(resultValues.filter((_, i) => i !== index))
  }

  const handleParameterChange = (index: number, field: string, value: string) => {
    const updated = [...resultValues]
    updated[index] = { ...updated[index], [field]: value }
    setResultValues(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemId) return

    onSave({
      orderItemId: selectedItemId,
      testDate,
      notes: notes || undefined,
      values: resultValues.filter((v) => v.parameterName.trim() !== ""),
    })
  }

  if (!order) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Test Item *</label>
        <select
          value={selectedItemId || ""}
          onChange={(e) => {
            setSelectedItemId(parseInt(e.target.value))
            setResultValues([])
          }}
          className="w-full rounded-md border px-3 py-2 text-sm"
          required
        >
          <option value="">Select test item</option>
          {orderItems.map((item: any) => (
            <option key={item.itemId} value={item.itemId.toString()}>
              {item.testName || item.testCode || `Item ${item.itemId}`}
              {item.result?.resultId ? " (Has Results)" : ""}
            </option>
          ))}
        </select>
      </div>

      {selectedItem && (
        <>
          {cdsAlerts.length > 0 ? (
            <Alert variant="destructive" className="border-red-600 bg-red-50 dark:bg-red-950/40">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="mb-1 font-medium">Clinical decision support (lab context)</p>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {cdsAlerts.map((a, i) => (
                    <li key={i}>{a.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium">Test Date *</label>
            <Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} required />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Result Parameters</label>
            <div className="space-y-3">
              {resultValues.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No parameters added. Click &quot;Add Parameter&quot; to add test values.
                </p>
              )}
              {resultValues.map((param, index) => (
                <div key={index} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Parameter {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParameter(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Parameter Name *"
                      value={param.parameterName}
                      onChange={(e) => handleParameterChange(index, "parameterName", e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Value *"
                      value={param.value}
                      onChange={(e) => handleParameterChange(index, "value", e.target.value)}
                      required
                    />
                    <Input
                      placeholder="Unit"
                      value={param.unit}
                      onChange={(e) => handleParameterChange(index, "unit", e.target.value)}
                    />
                    <Input
                      placeholder="Normal Range"
                      value={param.normalRange}
                      onChange={(e) => handleParameterChange(index, "normalRange", e.target.value)}
                    />
                    <select
                      value={param.flag}
                      onChange={(e) => handleParameterChange(index, "flag", e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                    <Input
                      placeholder="Notes"
                      value={param.notes}
                      onChange={(e) => handleParameterChange(index, "notes", e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddParameter} className="w-full">
                + Add Parameter
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Additional Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes or comments about the results..."
              className="min-h-[80px]"
            />
          </div>

          {hasExistingResult && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                This test item already has results. Adding new results will create a new result entry.
              </p>
            </div>
          )}
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !selectedItemId}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Results"
          )}
        </Button>
      </div>
    </form>
  )
}

export function canEnterLabResults(status?: string | null) {
  const s = (status || "").toLowerCase()
  return ["pending", "sample_collected", "in_progress", "completed"].includes(s)
}
