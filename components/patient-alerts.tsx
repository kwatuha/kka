import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type PatientAlert = {
  type: string
  severity: string
  description: string
}

interface PatientAlertsProps {
  alerts: PatientAlert[]
  patientId?: string
}

export function PatientAlerts({ alerts, patientId }: PatientAlertsProps) {
  // If no alerts are provided, show a default message
  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Important Alerts</CardTitle>
          <CardDescription>Critical information about this patient</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">No alerts found for this patient.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Important Alerts</CardTitle>
        <CardDescription>Critical information about this patient</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert, index) => (
          <Alert
            key={index}
            variant={alert.severity === "high" ? "destructive" : alert.severity === "medium" ? "default" : "outline"}
          >
            {alert.severity === "high" ? (
              <AlertCircle className="h-4 w-4" />
            ) : alert.severity === "medium" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            <AlertTitle className="capitalize">{alert.type}</AlertTitle>
            <AlertDescription>{alert.description}</AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  )
}
