"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Activity, Stethoscope, Pill, FlaskConical, Package, Heart, AlertCircle } from "lucide-react"
import { icuApi, laboratoryApi, doctorsApi, serviceChargeApi, billingApi, proceduresApi, pharmacyApi } from "@/lib/api"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-context"
import { ProcedureCombobox } from "@/components/procedure-combobox"

interface ICUManagementProps {
  icuAdmissionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ICUManagement({ icuAdmissionId, open, onOpenChange }: ICUManagementProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [doctors, setDoctors] = useState<any[]>([])

  // ICU Monitoring states
  const [monitoringDialogOpen, setMonitoringDialogOpen] = useState(false)
  const [monitoringForm, setMonitoringForm] = useState({
    monitoringDateTime: new Date().toISOString().slice(0, 16),
    heartRate: "",
    systolicBP: "",
    diastolicBP: "",
    meanArterialPressure: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    temperature: "",
    glasgowComaScale: "",
    centralVenousPressure: "",
    urineOutput: "",
    ventilatorSettings: "",
    medicationInfusions: "",
    notes: "",
  })
  const [savingMonitoring, setSavingMonitoring] = useState(false)

  // Lab Order states
  const [labOrderDialogOpen, setLabOrderDialogOpen] = useState(false)
  const [labOrderForm, setLabOrderForm] = useState({
    testTypeId: "",
    priority: "routine",
    clinicalIndication: "",
  })
  const [testTypes, setTestTypes] = useState<any[]>([])
  const [savingLabOrder, setSavingLabOrder] = useState(false)

  // Procedures states
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false)
  const [procedures, setProcedures] = useState<any[]>([])
  const [procedureForm, setProcedureForm] = useState({
    procedureId: "",
    procedureDate: new Date().toISOString().split('T')[0],
    performedBy: user?.userId?.toString() || "",
    notes: "",
    complications: "",
  })
  const [savingProcedure, setSavingProcedure] = useState(false)

  // Medications/Prescriptions states
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false)
  const [medications, setMedications] = useState<any[]>([])
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicationId: "",
    dosage: "",
    frequency: "",
    duration: "",
    quantity: "",
    instructions: "",
  })
  const [savingPrescription, setSavingPrescription] = useState(false)
  const [isQuantityManuallyEdited, setIsQuantityManuallyEdited] = useState(false)

  // Orders/Consumables states
  const [consumables, setConsumables] = useState<any[]>([])
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [orderForm, setOrderForm] = useState({
    chargeId: "",
    quantity: 1,
    notes: "",
  })
  const [savingOrder, setSavingOrder] = useState(false)

  useEffect(() => {
    if (open && icuAdmissionId) {
      loadOverview()
      loadDoctors()
    }
  }, [open, icuAdmissionId])

  useEffect(() => {
    if (monitoringDialogOpen) {
      setMonitoringForm({
        monitoringDateTime: new Date().toISOString().slice(0, 16),
        heartRate: "",
        systolicBP: "",
        diastolicBP: "",
        meanArterialPressure: "",
        respiratoryRate: "",
        oxygenSaturation: "",
        temperature: "",
        glasgowComaScale: "",
        centralVenousPressure: "",
        urineOutput: "",
        ventilatorSettings: "",
        medicationInfusions: "",
        notes: "",
      })
    }
  }, [monitoringDialogOpen])

  useEffect(() => {
    if (orderDialogOpen) {
      loadConsumables()
    }
  }, [orderDialogOpen])

  useEffect(() => {
    if (prescriptionDialogOpen) {
      loadMedications()
      setPrescriptionForm({
        medicationId: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: "",
        instructions: "",
      })
      setIsQuantityManuallyEdited(false)
    }
  }, [prescriptionDialogOpen])

  // Auto-calculate quantity based on dosage, frequency, and duration
  useEffect(() => {
    if (isQuantityManuallyEdited || !prescriptionDialogOpen) return

    const extractNumber = (text: string) => {
      const match = text.match(/(\d+\.?\d*)/)
      return match ? parseFloat(match[1]) : 0
    }

    const dosage = extractNumber(prescriptionForm.dosage || "")
    const frequencyText = (prescriptionForm.frequency || "").toLowerCase()
    const duration = extractNumber(prescriptionForm.duration || "")

    // Extract frequency - handle common patterns
    let frequency = extractNumber(prescriptionForm.frequency || "")
    if (frequency === 0) {
      if (frequencyText.includes("once") || frequencyText.includes("1x")) frequency = 1
      else if (frequencyText.includes("twice") || frequencyText.includes("2x")) frequency = 2
      else if (frequencyText.includes("three") || frequencyText.includes("thrice") || frequencyText.includes("3x")) frequency = 3
      else if (frequencyText.includes("four") || frequencyText.includes("4x")) frequency = 4
      else if (frequencyText.includes("five") || frequencyText.includes("5x")) frequency = 5
      else if (frequencyText.includes("six") || frequencyText.includes("6x")) frequency = 6
    }

    // Calculate quantity: dosage * frequency * duration
    if (dosage > 0 && frequency > 0 && duration > 0) {
      const calculatedQuantity = Math.ceil(dosage * frequency * duration)
      setPrescriptionForm(prev => ({
        ...prev,
        quantity: calculatedQuantity.toString()
      }))
    }
  }, [prescriptionForm.dosage, prescriptionForm.frequency, prescriptionForm.duration, prescriptionDialogOpen, isQuantityManuallyEdited])

  useEffect(() => {
    if (procedureDialogOpen) {
      loadProcedures()
      setProcedureForm({
        procedureId: "",
        procedureDate: new Date().toISOString().split('T')[0],
        performedBy: user?.userId?.toString() || "",
        notes: "",
        complications: "",
      })
    }
  }, [procedureDialogOpen, user])

  useEffect(() => {
    if (prescriptionDialogOpen) {
      loadMedications()
      setPrescriptionForm({
        medicationId: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: "",
        instructions: "",
      })
      setIsQuantityManuallyEdited(false)
    }
  }, [prescriptionDialogOpen])

  const loadOverview = async () => {
    try {
      setLoading(true)
      const data = await icuApi.getAdmissionOverview(icuAdmissionId)
      setOverview(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load ICU admission overview",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDoctors = async () => {
    try {
      const doctorsList = await doctorsApi.getAll()
      setDoctors(doctorsList || [])
    } catch (error) {
      console.error("Error loading doctors:", error)
    }
  }

  const loadConsumables = async () => {
    try {
      const consumablesList = await serviceChargeApi.getAll(undefined, undefined, undefined, undefined, 'Consumable')
      setConsumables(consumablesList || [])
    } catch (error) {
      console.error("Error loading consumables:", error)
    }
  }

  const loadProcedures = async () => {
    try {
      const proceduresList = await proceduresApi.getAll(undefined, undefined, true)
      setProcedures(proceduresList || [])
    } catch (error) {
      console.error("Error loading procedures:", error)
    }
  }

  const loadMedications = async () => {
    try {
      const medicationsList = await pharmacyApi.getMedications()
      setMedications(medicationsList || [])
    } catch (error) {
      console.error("Error loading medications:", error)
    }
  }

  const handleSaveMonitoring = async () => {
    try {
      setSavingMonitoring(true)
      await icuApi.createMonitoring(icuAdmissionId, {
        ...monitoringForm,
        recordedBy: user?.userId,
      })
      toast({
        title: "Success",
        description: "Monitoring data recorded successfully",
      })
      setMonitoringDialogOpen(false)
      setMonitoringForm({
        monitoringDateTime: new Date().toISOString().slice(0, 16),
        heartRate: "",
        systolicBP: "",
        diastolicBP: "",
        meanArterialPressure: "",
        respiratoryRate: "",
        oxygenSaturation: "",
        temperature: "",
        glasgowComaScale: "",
        centralVenousPressure: "",
        urineOutput: "",
        ventilatorSettings: "",
        medicationInfusions: "",
        notes: "",
      })
      loadOverview()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to record monitoring data",
        variant: "destructive",
      })
    } finally {
      setSavingMonitoring(false)
    }
  }

  const handleSaveLabOrder = async () => {
    if (!labOrderForm.testTypeId) {
      toast({
        title: "Error",
        description: "Please select a test type",
        variant: "destructive",
      })
      return
    }

    try {
      setSavingLabOrder(true)
      const patientId = overview?.icuAdmission?.patientId
      if (!patientId) {
        throw new Error("Patient ID not found")
      }

      await laboratoryApi.createOrder({
        patientId: patientId.toString(),
        admissionId: overview?.icuAdmission?.admissionId,
        orderedBy: user?.userId,
        orderDate: new Date().toISOString().split('T')[0],
        priority: labOrderForm.priority,
        clinicalIndication: labOrderForm.clinicalIndication,
        items: [{
          testTypeId: parseInt(labOrderForm.testTypeId),
          notes: labOrderForm.clinicalIndication || null,
        }],
      })

      toast({
        title: "Success",
        description: "Lab order created successfully",
      })
      setLabOrderDialogOpen(false)
      setLabOrderForm({
        testTypeId: "",
        priority: "routine",
        clinicalIndication: "",
      })
      loadOverview()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create lab order",
        variant: "destructive",
      })
    } finally {
      setSavingLabOrder(false)
    }
  }

  useEffect(() => {
    if (labOrderDialogOpen) {
      loadTestTypes()
    }
  }, [labOrderDialogOpen])

  const loadTestTypes = async () => {
    try {
      const types = await laboratoryApi.getTestTypes()
      setTestTypes(types)
    } catch (error) {
      console.error("Error loading test types:", error)
    }
  }

  const handleSaveOrder = async () => {
    if (!orderForm.chargeId) {
      toast({
        title: "Error",
        description: "Please select a consumable",
        variant: "destructive",
      })
      return
    }

    if (!orderForm.quantity || orderForm.quantity < 1) {
      toast({
        title: "Error",
        description: "Quantity must be at least 1",
        variant: "destructive",
      })
      return
    }

    try {
      setSavingOrder(true)
      const patientId = overview?.icuAdmission?.patientId
      if (!patientId) {
        throw new Error("Patient ID not found")
      }

      const consumable = consumables.find((c: any) => c.chargeId?.toString() === orderForm.chargeId)
      if (!consumable) {
        throw new Error("Selected consumable not found")
      }

      const unitPrice = consumable.cost ? parseFloat(consumable.cost) : 0
      const quantity = orderForm.quantity || 1
      const totalPrice = unitPrice * quantity

      const invoiceData = {
        patientId: patientId,
        admissionId: overview?.icuAdmission?.admissionId,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        items: [{
          description: consumable.name || 'Consumable',
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
          chargeId: consumable.chargeId,
        }],
        notes: `Consumables ordered during ICU stay. ${orderForm.notes || ''}`.trim(),
      }

      await billingApi.createInvoice(invoiceData)

      toast({
        title: "Success",
        description: "Order created successfully",
      })
      setOrderDialogOpen(false)
      setOrderForm({
        chargeId: "",
        quantity: 1,
        notes: "",
      })
      loadOverview()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      })
    } finally {
      setSavingOrder(false)
    }
  }

  const handleSaveProcedure = async () => {
    if (!procedureForm.procedureId) {
      toast({
        title: "Error",
        description: "Please select a procedure",
        variant: "destructive",
      })
      return
    }

    try {
      setSavingProcedure(true)
      const patientId = overview?.icuAdmission?.patientId
      if (!patientId) {
        throw new Error("Patient ID not found")
      }

      await proceduresApi.createPatientProcedure({
        patientId: patientId.toString(),
        procedureId: parseInt(procedureForm.procedureId),
        procedureDate: procedureForm.procedureDate,
        performedBy: parseInt(procedureForm.performedBy),
        notes: procedureForm.notes || null,
        complications: procedureForm.complications || null,
        admissionId: overview?.icuAdmission?.admissionId,
      })

      toast({
        title: "Success",
        description: "Procedure created successfully",
      })
      setProcedureDialogOpen(false)
      setProcedureForm({
        procedureId: "",
        procedureDate: new Date().toISOString().split('T')[0],
        performedBy: user?.userId?.toString() || "",
        notes: "",
        complications: "",
      })
      loadOverview()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create procedure",
        variant: "destructive",
      })
    } finally {
      setSavingProcedure(false)
    }
  }

  const handleSavePrescription = async () => {
    if (!prescriptionForm.medicationId || !prescriptionForm.dosage || !prescriptionForm.frequency || !prescriptionForm.duration) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (medication, dosage, frequency, duration)",
        variant: "destructive",
      })
      return
    }

    try {
      setSavingPrescription(true)
      const patientId = overview?.icuAdmission?.patientId
      if (!patientId) {
        throw new Error("Patient ID not found")
      }

      const prescriptionData = {
        patientId: patientId.toString(),
        doctorId: user?.userId?.toString() || "",
        prescriptionDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        admissionId: overview?.icuAdmission?.admissionId,
        items: [{
          medicationId: parseInt(prescriptionForm.medicationId),
          dosage: prescriptionForm.dosage,
          frequency: prescriptionForm.frequency,
          duration: prescriptionForm.duration,
          quantity: prescriptionForm.quantity ? parseInt(prescriptionForm.quantity) : null,
          instructions: prescriptionForm.instructions || null,
        }],
      }

      await pharmacyApi.createPrescription(prescriptionData)

      toast({
        title: "Success",
        description: "Prescription created successfully",
      })
      setPrescriptionDialogOpen(false)
      setPrescriptionForm({
        medicationId: "",
        dosage: "",
        frequency: "",
        duration: "",
        quantity: "",
        instructions: "",
      })
      loadOverview()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create prescription",
        variant: "destructive",
      })
    } finally {
      setSavingPrescription(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading ICU admission details...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!overview) {
    return null
  }

  const icuAdmission = overview.icuAdmission

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>ICU Management - {icuAdmission?.firstName} {icuAdmission?.lastName}</span>
            <Badge variant={icuAdmission?.status === "critical" ? "destructive" : icuAdmission?.status === "serious" ? "default" : "secondary"}>
              {icuAdmission?.status || "N/A"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {icuAdmission?.bedNumber && `Bed: ${icuAdmission.bedNumber} • `}
            {icuAdmission?.admissionNumber && `Admission: ${icuAdmission.admissionNumber}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="procedures">Procedures</TabsTrigger>
            <TabsTrigger value="labs">Labs</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Name:</strong> {icuAdmission?.firstName} {icuAdmission?.lastName}</div>
                  <div><strong>Patient Number:</strong> {icuAdmission?.patientNumber}</div>
                  <div><strong>Admission Date:</strong> {icuAdmission?.admissionDate ? format(new Date(icuAdmission.admissionDate), "PPp") : "N/A"}</div>
                  <div><strong>Status:</strong> <Badge variant={icuAdmission?.status === "critical" ? "destructive" : "default"}>{icuAdmission?.status || "N/A"}</Badge></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ICU Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div><strong>Bed:</strong> {icuAdmission?.bedNumber || "N/A"}</div>
                  <div><strong>Bed Type:</strong> {icuAdmission?.bedType || "N/A"}</div>
                  <div><strong>Admission Reason:</strong> {icuAdmission?.admissionReason || "N/A"}</div>
                  <div><strong>Initial Condition:</strong> {icuAdmission?.initialCondition || "N/A"}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                {overview.monitoring && overview.monitoring.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>HR</TableHead>
                        <TableHead>BP</TableHead>
                        <TableHead>SpO2</TableHead>
                        <TableHead>Temp</TableHead>
                        <TableHead>GCS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview.monitoring.slice(0, 5).map((mon: any) => (
                        <TableRow key={mon.monitoringId}>
                          <TableCell>{format(new Date(mon.monitoringDateTime), "PPp")}</TableCell>
                          <TableCell>{mon.heartRate || "N/A"}</TableCell>
                          <TableCell>{mon.systolicBP && mon.diastolicBP ? `${mon.systolicBP}/${mon.diastolicBP}` : "N/A"}</TableCell>
                          <TableCell>{mon.oxygenSaturation ? `${mon.oxygenSaturation}%` : "N/A"}</TableCell>
                          <TableCell>{mon.temperature ? `${mon.temperature}°C` : "N/A"}</TableCell>
                          <TableCell>{mon.glasgowComaScale || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No monitoring data yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">ICU Monitoring</h3>
              <Dialog open={monitoringDialogOpen} onOpenChange={setMonitoringDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Record Monitoring</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Record ICU Monitoring</DialogTitle>
                    <DialogDescription>Record vital signs and monitoring parameters</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Date & Time *</Label>
                      <Input
                        type="datetime-local"
                        value={monitoringForm.monitoringDateTime}
                        onChange={(e) => setMonitoringForm({ ...monitoringForm, monitoringDateTime: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Heart Rate (bpm)</Label>
                        <Input
                          type="number"
                          value={monitoringForm.heartRate}
                          onChange={(e) => setMonitoringForm({ ...monitoringForm, heartRate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Systolic BP (mmHg)</Label>
                        <Input
                          type="number"
                          value={monitoringForm.systolicBP}
                          onChange={(e) => setMonitoringForm({ ...monitoringForm, systolicBP: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Diastolic BP (mmHg)</Label>
                        <Input
                          type="number"
                          value={monitoringForm.diastolicBP}
                          onChange={(e) => setMonitoringForm({ ...monitoringForm, diastolicBP: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Mean Arterial Pressure</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={monitoringForm.meanArterialPressure}
                          onChange={(e) => setMonitoringForm({ ...monitoringForm, meanArterialPressure: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Respiratory Rate (bpm)</Label>
                        <Input
                          type="number"
                          value={monitoringForm.respiratoryRate}
                          onChange={(e) => setMonitoringForm({ ...monitoringForm, respiratoryRate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>SpO2 (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={monitoringForm.oxygenSaturation}
                          onChange={(e) => setMonitoringForm({ ...monitoringForm, oxygenSaturation: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Temperature (°C)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={monitoringForm.temperature}
                          onChange={(e) => setMonitoringForm({ ...monitoringForm, temperature: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Glasgow Coma Scale</Label>
                        <Input
                          type="number"
                          min="3"
                          max="15"
                          value={monitoringForm.glasgowComaScale}
                          onChange={(e) => setMonitoringForm({ ...monitoringForm, glasgowComaScale: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Central Venous Pressure</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={monitoringForm.centralVenousPressure}
                          onChange={(e) => setMonitoringForm({ ...monitoringForm, centralVenousPressure: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Urine Output (ml/hour)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={monitoringForm.urineOutput}
                        onChange={(e) => setMonitoringForm({ ...monitoringForm, urineOutput: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Ventilator Settings</Label>
                      <Textarea
                        placeholder="Ventilator mode, settings, etc."
                        value={monitoringForm.ventilatorSettings}
                        onChange={(e) => setMonitoringForm({ ...monitoringForm, ventilatorSettings: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>Medication Infusions</Label>
                      <Textarea
                        placeholder="Active infusions, rates, etc."
                        value={monitoringForm.medicationInfusions}
                        onChange={(e) => setMonitoringForm({ ...monitoringForm, medicationInfusions: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Additional notes..."
                        value={monitoringForm.notes}
                        onChange={(e) => setMonitoringForm({ ...monitoringForm, notes: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setMonitoringDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveMonitoring} disabled={savingMonitoring}>
                        {savingMonitoring ? "Saving..." : "Save Monitoring"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>HR</TableHead>
                      <TableHead>BP</TableHead>
                      <TableHead>MAP</TableHead>
                      <TableHead>RR</TableHead>
                      <TableHead>SpO2</TableHead>
                      <TableHead>Temp</TableHead>
                      <TableHead>GCS</TableHead>
                      <TableHead>CVP</TableHead>
                      <TableHead>Urine Output</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.monitoring && overview.monitoring.length > 0 ? (
                      overview.monitoring.map((mon: any) => (
                        <TableRow key={mon.monitoringId}>
                          <TableCell>{format(new Date(mon.monitoringDateTime), "PPp")}</TableCell>
                          <TableCell>{mon.heartRate || "N/A"}</TableCell>
                          <TableCell>{mon.systolicBP && mon.diastolicBP ? `${mon.systolicBP}/${mon.diastolicBP}` : "N/A"}</TableCell>
                          <TableCell>{mon.meanArterialPressure || "N/A"}</TableCell>
                          <TableCell>{mon.respiratoryRate || "N/A"}</TableCell>
                          <TableCell>{mon.oxygenSaturation ? `${mon.oxygenSaturation}%` : "N/A"}</TableCell>
                          <TableCell>{mon.temperature ? `${mon.temperature}°C` : "N/A"}</TableCell>
                          <TableCell>{mon.glasgowComaScale || "N/A"}</TableCell>
                          <TableCell>{mon.centralVenousPressure || "N/A"}</TableCell>
                          <TableCell>{mon.urineOutput ? `${mon.urineOutput} ml/h` : "N/A"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          No monitoring data yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Procedures Tab */}
          <TabsContent value="procedures" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Procedures</h3>
              <Dialog open={procedureDialogOpen} onOpenChange={setProcedureDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Add Procedure</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Procedure</DialogTitle>
                    <DialogDescription>Record a procedure performed on this patient</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Procedure *</Label>
                      <ProcedureCombobox
                        value={procedureForm.procedureId || ""}
                        onValueChange={(value, procedure) => {
                          setProcedureForm({
                            ...procedureForm,
                            procedureId: value
                          })
                        }}
                        placeholder="Search procedure by name, code, or category..."
                      />
                    </div>
                    <div>
                      <Label>Procedure Date *</Label>
                      <Input
                        type="date"
                        value={procedureForm.procedureDate}
                        onChange={(e) => setProcedureForm({ ...procedureForm, procedureDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Performed By *</Label>
                      <Select value={procedureForm.performedBy} onValueChange={(v) => setProcedureForm({ ...procedureForm, performedBy: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doc: any) => (
                            <SelectItem key={doc.userId} value={doc.userId.toString()}>
                              {doc.firstName} {doc.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Procedure notes..."
                        value={procedureForm.notes}
                        onChange={(e) => setProcedureForm({ ...procedureForm, notes: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Complications</Label>
                      <Textarea
                        placeholder="Any complications..."
                        value={procedureForm.complications}
                        onChange={(e) => setProcedureForm({ ...procedureForm, complications: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setProcedureDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveProcedure} disabled={savingProcedure}>
                        {savingProcedure ? "Saving..." : "Save Procedure"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Procedure</TableHead>
                      <TableHead>Performed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.procedures && overview.procedures.length > 0 ? (
                      overview.procedures.map((proc: any) => (
                        <TableRow key={proc.procedureId}>
                          <TableCell>{format(new Date(proc.procedureDate), "PP")}</TableCell>
                          <TableCell>{proc.procedureName || proc.description || "N/A"}</TableCell>
                          <TableCell>{proc.performedByFirstName} {proc.performedByLastName}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No procedures yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Labs Tab */}
          <TabsContent value="labs" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Lab Orders</h3>
              <Dialog open={labOrderDialogOpen} onOpenChange={setLabOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Order Lab Test</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Order Lab Test</DialogTitle>
                    <DialogDescription>Create a new lab test order for this patient</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Test Type *</Label>
                      <Select value={labOrderForm.testTypeId} onValueChange={(v) => setLabOrderForm({ ...labOrderForm, testTypeId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select test type" />
                        </SelectTrigger>
                        <SelectContent>
                          {testTypes.map((type: any) => (
                            <SelectItem key={type.testTypeId} value={type.testTypeId.toString()}>
                              {type.testName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={labOrderForm.priority} onValueChange={(v) => setLabOrderForm({ ...labOrderForm, priority: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="routine">Routine</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="stat">Stat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Clinical Indication</Label>
                      <Textarea
                        placeholder="Reason for ordering this test..."
                        value={labOrderForm.clinicalIndication}
                        onChange={(e) => setLabOrderForm({ ...labOrderForm, clinicalIndication: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setLabOrderDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveLabOrder} disabled={savingLabOrder}>
                        {savingLabOrder ? "Creating..." : "Create Order"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.labOrders && overview.labOrders.length > 0 ? (
                      overview.labOrders.map((order: any) => (
                        <TableRow key={order.orderId}>
                          <TableCell>{format(new Date(order.orderDate), "PP")}</TableCell>
                          <TableCell>{order.testName || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={order.priority === "stat" ? "destructive" : order.priority === "urgent" ? "default" : "secondary"}>
                              {order.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.status || "pending"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No lab orders yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders/Consumables Tab */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Orders & Consumables</h3>
              <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Add Order</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Order Consumable</DialogTitle>
                    <DialogDescription>Order consumables/medical supplies for this patient</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Consumable *</Label>
                      <Select
                        value={orderForm.chargeId}
                        onValueChange={(v) => setOrderForm({ ...orderForm, chargeId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select consumable" />
                        </SelectTrigger>
                        <SelectContent>
                          {consumables.map((consumable: any) => (
                            <SelectItem key={consumable.chargeId} value={consumable.chargeId.toString()}>
                              {consumable.name} - {consumable.cost ? `KES ${parseFloat(consumable.cost).toFixed(2)}` : 'N/A'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={orderForm.quantity}
                        onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Additional notes about this order..."
                        value={orderForm.notes}
                        onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                        rows={3}
                      />
                    </div>

                    {orderForm.chargeId && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-lg font-semibold">
                          KES {(() => {
                            const consumable = consumables.find((c: any) => c.chargeId?.toString() === orderForm.chargeId)
                            const unitPrice = consumable?.cost ? parseFloat(consumable.cost) : 0
                            return (unitPrice * (orderForm.quantity || 1)).toFixed(2)
                          })()}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveOrder} disabled={savingOrder}>
                        {savingOrder ? "Creating..." : "Create Order"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.orders && overview.orders.length > 0 ? (
                      overview.orders.flatMap((invoice: any) =>
                        invoice.items?.map((item: any, idx: number) => (
                          <TableRow key={`${invoice.invoiceId}-${idx}`}>
                            <TableCell>{format(new Date(invoice.invoiceDate), "PP")}</TableCell>
                            <TableCell>{item.description || "N/A"}</TableCell>
                            <TableCell>{item.quantity || 1}</TableCell>
                            <TableCell>KES {item.unitPrice ? parseFloat(item.unitPrice).toFixed(2) : "0.00"}</TableCell>
                            <TableCell>KES {item.totalPrice ? parseFloat(item.totalPrice).toFixed(2) : "0.00"}</TableCell>
                            <TableCell>
                              <Badge variant={invoice.status === "paid" ? "default" : invoice.status === "waived" ? "secondary" : "outline"}>
                                {invoice.status || "pending"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )) || []
                      )
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No orders yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Prescriptions</h3>
              <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" />Add Prescription</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Prescription</DialogTitle>
                    <DialogDescription>Prescribe medication for this patient</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Medication *</Label>
                      <Select value={prescriptionForm.medicationId} onValueChange={(v) => setPrescriptionForm({ ...prescriptionForm, medicationId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select medication" />
                        </SelectTrigger>
                        <SelectContent>
                          {medications.map((med: any) => (
                            <SelectItem key={med.medicationId} value={med.medicationId.toString()}>
                              {med.name || med.medicationName} {med.strength && `(${med.strength})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Dosage *</Label>
                        <Input
                          placeholder="e.g., 500mg"
                          value={prescriptionForm.dosage}
                          onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Frequency *</Label>
                        <Input
                          placeholder="e.g., Twice daily"
                          value={prescriptionForm.frequency}
                          onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Duration *</Label>
                        <Input
                          placeholder="e.g., 7 days"
                          value={prescriptionForm.duration}
                          onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          placeholder="Auto-calculated"
                          value={prescriptionForm.quantity}
                          onChange={(e) => {
                            setPrescriptionForm({ ...prescriptionForm, quantity: e.target.value })
                            setIsQuantityManuallyEdited(true)
                          }}
                          onFocus={() => setIsQuantityManuallyEdited(true)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Instructions</Label>
                      <Textarea
                        placeholder="Special instructions for the patient..."
                        value={prescriptionForm.instructions}
                        onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setPrescriptionDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSavePrescription} disabled={savingPrescription}>
                        {savingPrescription ? "Saving..." : "Save Prescription"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Prescription Number</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.prescriptions?.length > 0 ? (
                      overview.prescriptions.map((prescription: any) => (
                        <TableRow key={prescription.prescriptionId}>
                          <TableCell>{format(new Date(prescription.prescriptionDate), "PP")}</TableCell>
                          <TableCell>{prescription.prescriptionNumber}</TableCell>
                          <TableCell>{prescription.medicationNames || "N/A"}</TableCell>
                          <TableCell>{prescription.doctorFirstName} {prescription.doctorLastName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{prescription.status || "active"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No prescriptions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

