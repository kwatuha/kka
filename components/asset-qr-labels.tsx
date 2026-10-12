"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Printer, Download, Loader2, QrCode } from "lucide-react"
import { assetApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { QRCodeWrapper } from "@/components/qr-code-wrapper"
import { generateAssetVerificationUrl } from "@/lib/utils/url"

interface AssetQRLabelsProps {
  onPrint?: (assetId: number) => void
}

export function AssetQRLabels({ onPrint }: AssetQRLabelsProps) {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAssets, setSelectedAssets] = useState<Set<number>>(new Set())
  useEffect(() => {
    loadAssets()
  }, [])

  const loadAssets = async () => {
    try {
      setLoading(true)
      const data = await assetApi.getAll()
      setAssets(data || [])
    } catch (error: any) {
      console.error("Error loading assets:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load assets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateQRUrl = (assetId: number, assetCode: string) => {
    // Use the utility function to generate the verification URL
    // This ensures consistent URL generation across the app
    return generateAssetVerificationUrl(assetId, assetCode)
  }

  const handleSelectAsset = (assetId: number) => {
    setSelectedAssets((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(assetId)) {
        newSet.delete(assetId)
      } else {
        newSet.add(assetId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      setSelectedAssets(new Set())
    } else {
      setSelectedAssets(new Set(filteredAssets.map((a) => a.assetId)))
    }
  }

  const handlePrintLabels = () => {
    if (selectedAssets.size === 0) {
      toast({
        title: "No assets selected",
        description: "Please select at least one asset to print labels",
        variant: "destructive",
      })
      return
    }

    // Open print dialog with selected assets
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const selectedAssetsData = assets.filter((a) => selectedAssets.has(a.assetId))

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset QR Code Labels</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .labels-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              page-break-inside: avoid;
            }
            .label {
              border: 2px solid #000;
              padding: 15px;
              text-align: center;
              page-break-inside: avoid;
              min-height: 150px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .label-header {
              font-size: 12px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .label-qr {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 10px 0;
            }
            .label-info {
              font-size: 10px;
              margin-top: 10px;
            }
            .label-code {
              font-weight: bold;
              font-size: 14px;
              margin-top: 5px;
            }
            .label-name {
              font-size: 11px;
              margin-top: 5px;
              word-wrap: break-word;
            }
          </style>
        </head>
        <body>
          <div class="labels-grid">
            ${selectedAssetsData
              .map(
                (asset) => `
              <div class="label">
                <div class="label-header">ASSET LABEL</div>
                <div class="label-qr">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                    generateQRUrl(asset.assetId, asset.assetCode)
                  )}" alt="QR Code" />
                </div>
                <div class="label-info">
                  <div class="label-code">${asset.assetCode || "N/A"}</div>
                  <div class="label-name">${asset.assetName || "N/A"}</div>
                  ${asset.location ? `<div style="font-size: 9px; margin-top: 3px;">Location: ${asset.location}</div>` : ""}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const filteredAssets = assets.filter((asset) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      asset.assetName?.toLowerCase().includes(query) ||
      asset.assetCode?.toLowerCase().includes(query) ||
      asset.location?.toLowerCase().includes(query) ||
      asset.category?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Asset QR Code Labels</CardTitle>
          <CardDescription>
            Generate and print QR code labels for assets. When scanned, the QR code will open a verification page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search assets..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSelectAll}>
                {selectedAssets.size === filteredAssets.length ? "Deselect All" : "Select All"}
              </Button>
              <Button onClick={handlePrintLabels} disabled={selectedAssets.size === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Print Selected ({selectedAssets.size})
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading assets...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => {
                const isSelected = selectedAssets.has(asset.assetId)
                const qrUrl = generateQRUrl(asset.assetId, asset.assetCode)

                return (
                  <Card
                    key={asset.assetId}
                    className={`cursor-pointer transition-all ${
                      isSelected ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => handleSelectAsset(asset.assetId)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{asset.assetCode || "N/A"}</CardTitle>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectAsset(asset.assetId)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4"
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm font-medium">{asset.assetName || "N/A"}</div>
                        {asset.location && (
                          <div className="text-xs text-muted-foreground">Location: {asset.location}</div>
                        )}
                        {asset.category && (
                          <div className="text-xs text-muted-foreground">Category: {asset.category}</div>
                        )}
                        <div className="flex justify-center py-2 bg-white rounded border">
                          <QRCodeWrapper
                            value={qrUrl}
                            size={120}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground text-center break-all">
                          {qrUrl}
                        </div>
                        {asset.isCritical && (
                          <Badge variant="destructive" className="text-xs">
                            Critical Asset
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {filteredAssets.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No assets found. {searchQuery && "Try adjusting your search."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
