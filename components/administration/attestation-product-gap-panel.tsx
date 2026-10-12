"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ClipboardCheck, ExternalLink, Loader2 } from "lucide-react"
import { evidenceApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"

type MatrixRow = {
  id: string
  pdfSection: string
  claim: string
  productLevel: string
  demoPath?: string
  demoHint?: string
  gapAction?: string
}

function levelVariant(level: string) {
  if (level === "full") return "default" as const
  if (level === "partial") return "secondary" as const
  if (level === "external") return "outline" as const
  return "destructive" as const
}

export function AttestationProductGapPanel() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<MatrixRow[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [pendingOutside, setPendingOutside] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        const data = await evidenceApi.getAttestationProductMatrix()
        setItems(data.items || [])
        setSummary(data)
        setPendingOutside(data.pendingOutsideProduct || [])
      } catch (err: any) {
        toast({
          title: "Could not load attestation matrix",
          description: err.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <Card id="attestation-product-gap">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          DHA attestation vs product (PDF alignment)
        </CardTitle>
        <CardDescription>
          Compares submitted PDF claims (92% score) with what the HMIS actually delivers for facilities.
          Use this to close gaps in software — portal re-attestation is separate when DHA allows edits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading matrix…
          </div>
        ) : (
          <>
            {summary?.counts ? (
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="default">Full: {summary.counts.full}</Badge>
                <Badge variant="secondary">Partial: {summary.counts.partial}</Badge>
                <Badge variant="outline">External/HIE: {summary.counts.external}</Badge>
                <Badge variant="destructive">Ops/hosting: {summary.counts.ops}</Badge>
              </div>
            ) : null}
            {pendingOutside.length ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium mb-1">Cannot fix in app alone</p>
                <ul className="list-disc pl-5 text-muted-foreground space-y-0.5">
                  {pendingOutside.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PDF section</TableHead>
                    <TableHead>Claim</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Demo / action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs">{row.pdfSection}</TableCell>
                      <TableCell className="text-sm max-w-[240px]">{row.claim}</TableCell>
                      <TableCell>
                        <Badge variant={levelVariant(row.productLevel)}>{row.productLevel}</Badge>
                      </TableCell>
                      <TableCell className="text-xs space-y-1 max-w-[280px]">
                        {row.demoPath ? (
                          <Button variant="link" className="h-auto p-0 text-xs" asChild>
                            <Link href={row.demoPath}>
                              Open in HMIS
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        ) : null}
                        {row.demoHint ? <p className="text-muted-foreground">{row.demoHint}</p> : null}
                        {row.gapAction ? <p>{row.gapAction}</p> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">
              Full write-up:{" "}
              <code className="text-[10px]">docs/DHA_ATTESTATION_PRODUCT_ALIGNMENT.md</code> · Portal
              field corrections: Evidence pack → Portal guide JSON.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
