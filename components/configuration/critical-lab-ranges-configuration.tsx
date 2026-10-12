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
import { Plus, Edit, Trash2, Loader2, FlaskConical } from "lucide-react"
import { laboratoryApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

export function CriticalLabRangesConfiguration() {
  const [criticalValueRanges, setCriticalValueRanges] = useState<any[]>([])
  const [loadingCriticalValueRanges, setLoadingCriticalValueRanges] = useState(false)
  const [allTestTypes, setAllTestTypes] = useState<any[]>([])
  const [addCriticalRangeOpen, setAddCriticalRangeOpen] = useState(false)
  const [editCriticalRange, setEditCriticalRange] = useState<any | null>(null)
  const [selectedTestTypeId, setSelectedTestTypeId] = useState<string>("")
  const [parameterName, setParameterName] = useState("")
  const [unit, setUnit] = useState("")
  const [criticalLowValue, setCriticalLowValue] = useState<string>("")
  const [criticalHighValue, setCriticalHighValue] = useState<string>("")
  const [criticalRangeDescription, setCriticalRangeDescription] = useState("")
  const [savingCriticalRange, setSavingCriticalRange] = useState(false)

  useEffect(() => {
    loadCriticalValueRanges()
    loadAllTestTypes()
  }, [])

  const loadCriticalValueRanges = async () => {
    try {
      setLoadingCriticalValueRanges(true)
      const data = await laboratoryApi.getCriticalValueRanges()
      setCriticalValueRanges(data)
    } catch (err: any) {
      console.error('Error loading critical value ranges:', err)
      toast({
        title: "Error loading critical value ranges",
        description: err.message || "Failed to load critical value ranges",
        variant: "destructive",
      })
    } finally {
      setLoadingCriticalValueRanges(false)
    }
  }

  const loadAllTestTypes = async () => {
    try {
      const data = await laboratoryApi.getTestTypes()
      setAllTestTypes(data)
    } catch (err: any) {
      console.error('Error loading test types:', err)
    }
  }

  const handleOpenAddCriticalRange = () => {
    setEditCriticalRange(null)
    setSelectedTestTypeId("")
    setParameterName("")
    setUnit("")
    setCriticalLowValue("")
    setCriticalHighValue("")
    setCriticalRangeDescription("")
    setAddCriticalRangeOpen(true)
  }

  const handleOpenEditCriticalRange = (range: any) => {
    setEditCriticalRange(range)
    setSelectedTestTypeId(range.testTypeId.toString())
    setParameterName(range.parameterName)
    setUnit(range.unit || "")
    setCriticalLowValue(range.criticalLowValue?.toString() || "")
    setCriticalHighValue(range.criticalHighValue?.toString() || "")
    setCriticalRangeDescription(range.description || "")
    setAddCriticalRangeOpen(true)
  }

  const handleSaveCriticalRange = async () => {
    if (!selectedTestTypeId || !parameterName) {
      toast({
        title: "Error",
        description: "Please select a test type and enter parameter name",
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

    setSavingCriticalRange(true)
    try {
      const data = {
        testTypeId: parseInt(selectedTestTypeId),
        parameterName,
        unit: unit || undefined,
        criticalLowValue: criticalLowValue ? parseFloat(criticalLowValue) : undefined,
        criticalHighValue: criticalHighValue ? parseFloat(criticalHighValue) : undefined,
        description: criticalRangeDescription || undefined
      }

      if (editCriticalRange) {
        await laboratoryApi.updateCriticalValueRange(editCriticalRange.criticalRangeId.toString(), data)
        toast({
          title: "Critical value range updated",
          description: "Critical value range has been updated successfully",
        })
      } else {
        await laboratoryApi.createCriticalValueRange(data)
        toast({
          title: "Critical value range added",
          description: "Critical value range has been added successfully",
        })
      }

      setAddCriticalRangeOpen(false)
      setEditCriticalRange(null)
      setSelectedTestTypeId("")
      setParameterName("")
      setUnit("")
      setCriticalLowValue("")
      setCriticalHighValue("")
      setCriticalRangeDescription("")
      await loadCriticalValueRanges()
    } catch (err: any) {
      toast({
        title: editCriticalRange ? "Error updating critical value range" : "Error adding critical value range",
        description: err.message || "Failed to save critical value range",
        variant: "destructive",
      })
      console.error('Error saving critical value range:', err)
    } finally {
      setSavingCriticalRange(false)
    }
  }

  const handleDeleteCriticalRange = async (id: string) => {
    if (!confirm('Are you sure you want to delete this critical value range?')) {
      return
    }

    try {
      await laboratoryApi.deleteCriticalValueRange(id)
      toast({
        title: "Critical value range deleted",
        description: "Critical value range has been deleted successfully",
      })
      await loadCriticalValueRanges()
    } catch (err: any) {
      toast({
        title: "Error deleting critical value range",
        description: err.message || "Failed to delete critical value range",
        variant: "destructive",
      })
      console.error('Error deleting critical value range:', err)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              <div>
                <CardTitle>Critical Lab Value Ranges Configuration</CardTitle>
                <CardDescription>Define critical value ranges for lab parameters that indicate life-threatening conditions requiring immediate medical attention</CardDescription>
              </div>
            </div>
            <Button onClick={handleOpenAddCriticalRange}>
              <Plus className="mr-2 h-4 w-4" />
              Add Critical Range
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCriticalValueRanges ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading critical value ranges...</span>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Critical Range</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalValueRanges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No critical value ranges configured. Add ranges that indicate life-threatening conditions (e.g., Hemoglobin &lt; 7 g/dL, Potassium &gt; 6.5 mmol/L).
                      </TableCell>
                    </TableRow>
                  ) : (
                    criticalValueRanges.map((range) => {
                      const rangeText = range.criticalLowValue && range.criticalHighValue
                        ? `< ${range.criticalLowValue} or > ${range.criticalHighValue} ${range.unit || ''}`
                        : range.criticalLowValue
                        ? `< ${range.criticalLowValue} ${range.unit || ''}`
                        : range.criticalHighValue
                        ? `> ${range.criticalHighValue} ${range.unit || ''}`
                        : 'Positive'
                      return (
                        <TableRow key={range.criticalRangeId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{range.testName}</div>
                              <div className="text-xs text-muted-foreground">{range.testCode}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{range.parameterName}</TableCell>
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
                                onClick={() => handleOpenEditCriticalRange(range)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCriticalRange(range.criticalRangeId.toString())}
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

      {/* Add/Edit Critical Value Range Dialog */}
      <Dialog open={addCriticalRangeOpen} onOpenChange={(open) => {
        setAddCriticalRangeOpen(open)
        if (!open) {
          setEditCriticalRange(null)
          setSelectedTestTypeId("")
          setParameterName("")
          setUnit("")
          setCriticalLowValue("")
          setCriticalHighValue("")
          setCriticalRangeDescription("")
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editCriticalRange ? 'Edit Critical Value Range' : 'Add Critical Value Range'}</DialogTitle>
            <DialogDescription>
              Define a critical value range that indicates a life-threatening condition requiring immediate medical attention
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Test Type *</Label>
              <Select value={selectedTestTypeId} onValueChange={setSelectedTestTypeId} disabled={!!editCriticalRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a test type" />
                </SelectTrigger>
                <SelectContent>
                  {allTestTypes.map((testType) => (
                    <SelectItem key={testType.testTypeId} value={testType.testTypeId.toString()}>
                      {testType.testName} ({testType.testCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parameter Name *</Label>
                <Input
                  placeholder="e.g., Hemoglobin, Potassium"
                  value={parameterName}
                  onChange={(e) => setParameterName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input
                  placeholder="e.g., g/dL, mmol/L"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Critical Low Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 7.0"
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
                  placeholder="e.g., 6.5"
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
                value={criticalRangeDescription}
                onChange={(e) => setCriticalRangeDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddCriticalRangeOpen(false)
                setEditCriticalRange(null)
                setSelectedTestTypeId("")
                setParameterName("")
                setUnit("")
                setCriticalLowValue("")
                setCriticalHighValue("")
                setCriticalRangeDescription("")
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCriticalRange}
              disabled={savingCriticalRange || !selectedTestTypeId || !parameterName || (!criticalLowValue && !criticalHighValue)}
            >
              {savingCriticalRange ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                editCriticalRange ? "Update Range" : "Add Range"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

