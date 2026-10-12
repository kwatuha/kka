"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Loader2, Activity } from "lucide-react"
import { triageApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export function CriticalVitalsConfiguration() {
  const [criticalVitalRanges, setCriticalVitalRanges] = useState<any[]>([])
  const [loadingCriticalVitalRanges, setLoadingCriticalVitalRanges] = useState(false)
  const [addCriticalVitalRangeOpen, setAddCriticalVitalRangeOpen] = useState(false)
  const [editCriticalVitalRange, setEditCriticalVitalRange] = useState<any | null>(null)
  const [vitalParameter, setVitalParameter] = useState("")
  const [unit, setUnit] = useState("")
  const [criticalLowValue, setCriticalLowValue] = useState<string>("")
  const [criticalHighValue, setCriticalHighValue] = useState<string>("")
  const [criticalVitalDescription, setCriticalVitalDescription] = useState("")
  const [savingCriticalVitalRange, setSavingCriticalVitalRange] = useState(false)

  useEffect(() => {
    loadCriticalVitalRanges()
  }, [])

  const loadCriticalVitalRanges = async () => {
    try {
      setLoadingCriticalVitalRanges(true)
      const data = await triageApi.getCriticalVitalRanges()
      setCriticalVitalRanges(data)
    } catch (err: any) {
      console.error('Error loading critical vital ranges:', err)
      toast({
        title: "Error loading critical vital ranges",
        description: err.message || "Failed to load critical vital ranges",
        variant: "destructive",
      })
    } finally {
      setLoadingCriticalVitalRanges(false)
    }
  }

  const handleOpenAddCriticalVitalRange = () => {
    setEditCriticalVitalRange(null)
    setVitalParameter("")
    setUnit("")
    setCriticalLowValue("")
    setCriticalHighValue("")
    setCriticalVitalDescription("")
    setAddCriticalVitalRangeOpen(true)
  }

  const handleOpenEditCriticalVitalRange = (range: any) => {
    setEditCriticalVitalRange(range)
    setVitalParameter(range.vitalParameter)
    setUnit(range.unit || "")
    setCriticalLowValue(range.criticalLowValue?.toString() || "")
    setCriticalHighValue(range.criticalHighValue?.toString() || "")
    setCriticalVitalDescription(range.description || "")
    setAddCriticalVitalRangeOpen(true)
  }

  const handleSaveCriticalVitalRange = async () => {
    if (!vitalParameter) {
      toast({
        title: "Error",
        description: "Please enter vital parameter name",
        variant: "destructive",
      })
      return
    }

    if (!criticalLowValue && !criticalHighValue) {
      toast({
        title: "Error",
        description: "Please enter at least one critical value (low or high)",
        variant: "destructive",
      })
      return
    }

    setSavingCriticalVitalRange(true)
    try {
      const data = {
        vitalParameter,
        unit: unit || undefined,
        criticalLowValue: criticalLowValue ? parseFloat(criticalLowValue) : undefined,
        criticalHighValue: criticalHighValue ? parseFloat(criticalHighValue) : undefined,
        description: criticalVitalDescription || undefined
      }

      if (editCriticalVitalRange) {
        await triageApi.updateCriticalVitalRange(editCriticalVitalRange.criticalVitalId.toString(), data)
        toast({
          title: "Critical vital range updated",
          description: "Critical vital range has been updated successfully",
        })
      } else {
        await triageApi.createCriticalVitalRange(data)
        toast({
          title: "Critical vital range added",
          description: "Critical vital range has been added successfully",
        })
      }

      setAddCriticalVitalRangeOpen(false)
      setEditCriticalVitalRange(null)
      setVitalParameter("")
      setUnit("")
      setCriticalLowValue("")
      setCriticalHighValue("")
      setCriticalVitalDescription("")
      await loadCriticalVitalRanges()
    } catch (err: any) {
      toast({
        title: editCriticalVitalRange ? "Error updating critical vital range" : "Error adding critical vital range",
        description: err.message || "Failed to save critical vital range",
        variant: "destructive",
      })
      console.error('Error saving critical vital range:', err)
    } finally {
      setSavingCriticalVitalRange(false)
    }
  }

  const handleDeleteCriticalVitalRange = async (id: string) => {
    if (!confirm('Are you sure you want to delete this critical vital range?')) {
      return
    }

    try {
      await triageApi.deleteCriticalVitalRange(id)
      toast({
        title: "Critical vital range deleted",
        description: "Critical vital range has been deleted successfully",
      })
      await loadCriticalVitalRanges()
    } catch (err: any) {
      toast({
        title: "Error deleting critical vital range",
        description: err.message || "Failed to delete critical vital range",
        variant: "destructive",
      })
      console.error('Error deleting critical vital range:', err)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <div>
                <CardTitle>Critical Vitals Configuration</CardTitle>
                <CardDescription>Define critical value ranges for vital signs that indicate life-threatening conditions requiring immediate medical attention</CardDescription>
              </div>
            </div>
            <Button onClick={handleOpenAddCriticalVitalRange}>
              <Plus className="mr-2 h-4 w-4" />
              Add Critical Range
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCriticalVitalRanges ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading critical vital ranges...</span>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vital Parameter</TableHead>
                    <TableHead>Critical Range</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalVitalRanges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No critical vital ranges configured. Add ranges that indicate life-threatening conditions (e.g., Heart Rate &lt; 40 bpm, Blood Pressure &lt; 90/60 mmHg, Temperature &gt; 40°C).
                      </TableCell>
                    </TableRow>
                  ) : (
                    criticalVitalRanges.map((range) => {
                      const rangeText = range.criticalLowValue && range.criticalHighValue
                        ? `< ${range.criticalLowValue} or > ${range.criticalHighValue} ${range.unit || ''}`
                        : range.criticalLowValue
                        ? `< ${range.criticalLowValue} ${range.unit || ''}`
                        : range.criticalHighValue
                        ? `> ${range.criticalHighValue} ${range.unit || ''}`
                        : 'Positive'
                      return (
                        <TableRow key={range.criticalVitalId}>
                          <TableCell className="font-medium">{range.vitalParameter}</TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="font-mono">
                              {rangeText}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm text-muted-foreground truncate">{range.description || "-"}</p>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditCriticalVitalRange(range)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCriticalVitalRange(range.criticalVitalId.toString())}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Critical Vital Range Dialog */}
      <Dialog open={addCriticalVitalRangeOpen} onOpenChange={(open) => {
        setAddCriticalVitalRangeOpen(open)
        if (!open) {
          setEditCriticalVitalRange(null)
          setVitalParameter("")
          setUnit("")
          setCriticalLowValue("")
          setCriticalHighValue("")
          setCriticalVitalDescription("")
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editCriticalVitalRange ? 'Edit Critical Vital Range' : 'Add Critical Vital Range'}</DialogTitle>
            <DialogDescription>
              Define a critical value range for a vital sign that indicates a life-threatening condition requiring immediate medical attention
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vital Parameter *</Label>
              <Select value={vitalParameter} onValueChange={setVitalParameter} disabled={!!editCriticalVitalRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vital parameter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="systolicBP">Systolic Blood Pressure</SelectItem>
                  <SelectItem value="diastolicBP">Diastolic Blood Pressure</SelectItem>
                  <SelectItem value="heartRate">Heart Rate</SelectItem>
                  <SelectItem value="respiratoryRate">Respiratory Rate</SelectItem>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="oxygenSaturation">Oxygen Saturation (SpO2)</SelectItem>
                  <SelectItem value="glasgowComaScale">Glasgow Coma Scale (GCS)</SelectItem>
                  <SelectItem value="bloodGlucose">Blood Glucose</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                placeholder="e.g., mmHg, bpm, °C, %"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Critical Low Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 90"
                  value={criticalLowValue}
                  onChange={(e) => setCriticalLowValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Value &lt; this is critical</p>
              </div>
              <div className="space-y-2">
                <Label>Critical High Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 40"
                  value={criticalHighValue}
                  onChange={(e) => setCriticalHighValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Value &gt; this is critical</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                placeholder="Describe why this range indicates a life-threatening condition..."
                value={criticalVitalDescription}
                onChange={(e) => setCriticalVitalDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddCriticalVitalRangeOpen(false)
                setEditCriticalVitalRange(null)
                setVitalParameter("")
                setUnit("")
                setCriticalLowValue("")
                setCriticalHighValue("")
                setCriticalVitalDescription("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCriticalVitalRange}
              disabled={savingCriticalVitalRange || !vitalParameter || (!criticalLowValue && !criticalHighValue)}
            >
              {savingCriticalVitalRange ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                editCriticalVitalRange ? "Update Range" : "Add Range"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

