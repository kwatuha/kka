"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Clock, AlertTriangle, ClipboardCheck, Loader2 } from "lucide-react"
import { assetApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-context"
import { format } from "date-fns"

interface CriticalAssetsDailyLogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CriticalAssetsDailyLog({ open: openProp, onOpenChange: onOpenChangeProp }: CriticalAssetsDailyLogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(openProp || false)
  const [criticalAssets, setCriticalAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [verifications, setVerifications] = useState<Record<number, any>>({})
  const [stats, setStats] = useState<any>(null)

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (onOpenChangeProp) {
      onOpenChangeProp(newOpen)
    }
  }

  useEffect(() => {
    if (open) {
      loadCriticalAssets()
      loadStats()
    }
  }, [open])

  const loadCriticalAssets = async () => {
    try {
      setLoading(true)
      const data = await assetApi.getCriticalAssets()
      setCriticalAssets(data || [])

      // Initialize verifications with existing data or defaults
      const initialVerifications: Record<number, any> = {}
      data?.forEach((asset: any) => {
        initialVerifications[asset.assetId] = {
          isPresent: asset.verifiedToday !== null ? asset.verifiedToday : true,
          notes: asset.verificationNotes || "",
          issues: asset.issues || "",
          location: asset.location || "",
          condition: asset.condition || "good",
        }
      })
      setVerifications(initialVerifications)
    } catch (error: any) {
      console.error("Error loading critical assets:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load critical assets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await assetApi.getCriticalStats()
      setStats(data)
    } catch (error: any) {
      console.error("Error loading stats:", error)
    }
  }

  const handleVerificationChange = (assetId: number, field: string, value: any) => {
    setVerifications((prev) => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: value,
      },
    }))
  }

  const handleBulkVerify = async () => {
    if (!user?.userId) {
      toast({
        title: "Error",
        description: "User information not available",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      const today = new Date().toISOString().split("T")[0]
      const verificationArray = criticalAssets.map((asset) => ({
        assetId: asset.assetId,
        isPresent: verifications[asset.assetId]?.isPresent ?? true,
        notes: verifications[asset.assetId]?.notes || "",
        issues: verifications[asset.assetId]?.issues || "",
        location: verifications[asset.assetId]?.location || asset.location || "",
        condition: verifications[asset.assetId]?.condition || "good",
      }))

      await assetApi.bulkVerify({
        verifications: verificationArray,
        verifiedBy: user.userId,
      })

      toast({
        title: "Success",
        description: "Critical assets verified successfully",
      })

      loadCriticalAssets()
      loadStats()
    } catch (error: any) {
      console.error("Error verifying assets:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to verify assets",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSingleVerify = async (assetId: number) => {
    if (!user?.userId) {
      toast({
        title: "Error",
        description: "User information not available",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      const today = new Date().toISOString().split("T")[0]
      const asset = criticalAssets.find((a) => a.assetId === assetId)
      const verification = verifications[assetId] || {
        isPresent: true,
        notes: "",
        issues: "",
        location: asset?.location || "",
        condition: "good",
      }

      await assetApi.createDailyLog({
        assetId,
        logDate: today,
        isPresent: verification.isPresent,
        verifiedBy: user.userId,
        notes: verification.notes,
        issues: verification.issues,
        location: verification.location,
        condition: verification.condition,
      })

      toast({
        title: "Success",
        description: "Asset verified successfully",
      })

      loadCriticalAssets()
      loadStats()
    } catch (error: any) {
      console.error("Error verifying asset:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to verify asset",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const verifiedCount = criticalAssets.filter((a) => a.verifiedToday !== null).length
  const missingCount = criticalAssets.filter((a) => a.verifiedToday === false).length
  const pendingCount = criticalAssets.filter((a) => a.verifiedToday === null).length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Critical Assets Daily Verification
          </DialogTitle>
          <DialogDescription>
            Verify presence of all critical assets before hospital close. Today: {format(new Date(), "PPP")}
          </DialogDescription>
        </DialogHeader>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Critical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.today?.totalCritical || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.today?.verified || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Missing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.today?.missing || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.today?.pending || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {pendingCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {pendingCount} critical asset{pendingCount !== 1 ? "s" : ""} still need verification before hospital close.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading critical assets...</span>
          </div>
        ) : criticalAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No critical assets registered.</p>
            <p className="text-sm mt-2">Mark assets as critical in the assets management page.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {criticalAssets.length} critical asset{criticalAssets.length !== 1 ? "s" : ""} to verify
              </p>
              <Button
                onClick={handleBulkVerify}
                disabled={submitting || pendingCount === 0}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Verify All
                  </>
                )}
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Verified By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalAssets.map((asset) => {
                    const verification = verifications[asset.assetId] || {
                      isPresent: asset.verifiedToday !== null ? asset.verifiedToday : true,
                      notes: asset.verificationNotes || "",
                      issues: asset.issues || "",
                      location: asset.location || "",
                      condition: asset.condition || "good",
                    }
                    const isVerified = asset.verifiedToday !== null

                    return (
                      <TableRow key={asset.assetId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{asset.assetName}</div>
                            <div className="text-sm text-muted-foreground">{asset.assetCode}</div>
                            {asset.category && (
                              <div className="text-xs text-muted-foreground">{asset.category}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={verification.location}
                            onChange={(e) => handleVerificationChange(asset.assetId, "location", e.target.value)}
                            placeholder="Location"
                            className="w-32"
                            disabled={isVerified}
                          />
                        </TableCell>
                        <TableCell>
                          {isVerified ? (
                            asset.verifiedToday ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Missing
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={verification.isPresent}
                              onCheckedChange={(checked) =>
                                handleVerificationChange(asset.assetId, "isPresent", checked)
                              }
                              disabled={isVerified}
                            />
                            <Label className="text-sm">
                              {verification.isPresent ? "Yes" : "No"}
                            </Label>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={verification.condition}
                            onValueChange={(value) => handleVerificationChange(asset.assetId, "condition", value)}
                            disabled={isVerified}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="fair">Fair</SelectItem>
                              <SelectItem value="poor">Poor</SelectItem>
                              <SelectItem value="needs_repair">Needs Repair</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={verification.issues}
                            onChange={(e) => handleVerificationChange(asset.assetId, "issues", e.target.value)}
                            placeholder="Issues..."
                            className="w-40"
                            disabled={isVerified}
                          />
                        </TableCell>
                        <TableCell>
                          {asset.verifiedByFirstName && asset.verifiedByLastName ? (
                            <div className="text-sm">
                              {asset.verifiedByFirstName} {asset.verifiedByLastName}
                              {asset.verifiedAt && (
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(asset.verifiedAt), "HH:mm")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isVerified ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSingleVerify(asset.assetId)}
                              disabled={submitting}
                            >
                              Update
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSingleVerify(asset.assetId)}
                              disabled={submitting}
                            >
                              Verify
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleBulkVerify} disabled={submitting || pendingCount === 0}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify All ({pendingCount} pending)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
