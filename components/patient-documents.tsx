"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Eye, Plus, AlertCircle, Loader2, Trash2, Upload } from "lucide-react"
import { openAuthenticatedBlob, patientApi } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth/auth-context"
import { cn } from "@/lib/utils"

type Document = {
  documentId: number
  documentName: string
  documentType?: string
  category?: string
  uploadDate: string
  uploadedBy?: number
  uploadedByFirstName?: string
  uploadedByLastName?: string
  fileSize?: number
  mimeType?: string
  notes?: string
}

type PreviewKind = "pdf" | "image" | "text" | "unsupported"

/** Above encounter side sheets (z 143) and nested encounter dialogs (z 161). */
const PATIENT_DOC_DIALOG_OVERLAY = "!z-[164]"
const PATIENT_DOC_DIALOG_CONTENT = "z-[165]"

function resolvePreviewKind(mimeType: string | undefined, filename: string): PreviewKind {
  const mime = (mimeType || "").toLowerCase()
  const name = filename.toLowerCase()
  if (mime.includes("pdf") || name.endsWith(".pdf")) return "pdf"
  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(name)) return "image"
  if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv")) return "text"
  return "unsupported"
}

export function PatientDocuments({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    documentName: "",
    documentType: "",
    category: "",
    notes: "",
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [publishingConsent, setPublishingConsent] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewKind, setPreviewKind] = useState<PreviewKind>("unsupported")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const { user } = useAuth()

  type PreviewCacheEntry = {
    blob: Blob
    objectUrl: string | null
    previewText: string | null
    kind: PreviewKind
    etag: string | null
  }
  const previewCacheRef = useRef(new Map<number, PreviewCacheEntry>())

  useEffect(() => {
    const cache = previewCacheRef.current
    return () => {
      for (const entry of cache.values()) {
        if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl)
      }
      cache.clear()
    }
  }, [patientId])

  const closePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewDoc(null)
    setPreviewBlob(null)
    setPreviewText(null)
    setPreviewKind("unsupported")
    setPreviewUrl(null)
  }, [])

  function authHeaders(json = false): HeadersInit {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("jwt_token") ||
      localStorage.getItem("auth_token")
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    if (json) headers["Content-Type"] = "application/json"
    return headers
  }

  useEffect(() => {
    loadDocuments()
  }, [patientId])

  const loadDocuments = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true)
      }
      setError(null)

      const docs = await patientApi.getDocuments(patientId)
      setDocuments(Array.isArray(docs) ? docs : [])
    } catch (err: any) {
      console.error("Error loading documents:", err)
      setError(err.message || "Failed to load documents")
    } finally {
      if (!options?.silent) {
        setLoading(false)
      }
    }
  }

  const handleOpenForm = () => {
    setFormOpen(true)
    setFormError(null)
    setSelectedFile(null)
    setFormData({
      documentName: "",
      documentType: "",
      category: "",
      notes: "",
    })
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setFormError(null)
    setSelectedFile(null)
    setFormData({
      documentName: "",
      documentType: "",
      category: "",
      notes: "",
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        setFormError("File size must be less than 10MB")
        return
      }
      setSelectedFile(file)
      setFormError(null)
      // Auto-fill document name if empty
      if (!formData.documentName) {
        setFormData({ ...formData, documentName: file.name })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!selectedFile) {
      setFormError("Please select a file to upload")
      return
    }

    if (!formData.documentName.trim()) {
      setFormError("Document name is required")
      return
    }

    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", selectedFile)
      uploadFormData.append("documentName", formData.documentName.trim())
      uploadFormData.append("documentType", formData.documentType || formData.category || "")
      uploadFormData.append("category", formData.category || formData.documentType || "")
      uploadFormData.append("uploadDate", format(new Date(), "yyyy-MM-dd"))
      uploadFormData.append("notes", formData.notes.trim() || "")
      if (user?.id) {
        uploadFormData.append("uploadedBy", user.id.toString())
      }

      const created = await patientApi.createDocument(patientId, uploadFormData)
      if (created?.documentId) {
        setDocuments((prev) => [created, ...prev.filter((d) => d.documentId !== created.documentId)])
      } else {
        void loadDocuments({ silent: true })
      }
      toast({
        title: "Success",
        description: "Document uploaded successfully.",
      })

      handleCloseForm()
    } catch (err: any) {
      console.error("Error uploading document:", err)
      const errorMessage = err.message || "Failed to upload document"
      setFormError(errorMessage)
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const fetchDocumentBlob = async (doc: Document) => {
    const cached = previewCacheRef.current.get(doc.documentId)
    const { blob, filename, etag, notModified } = await patientApi.downloadDocument(
      patientId,
      doc.documentId.toString(),
      doc.documentName || "document",
      cached?.etag ?? undefined
    )
    if (notModified && cached) {
      return { blob: cached.blob, filename: doc.documentName || filename }
    }
    const typed =
      doc.mimeType && blob.type !== doc.mimeType ? new Blob([blob], { type: doc.mimeType }) : blob
    return { blob: typed, filename, etag }
  }

  const handleDownload = async (doc: Document) => {
    if (!doc.documentId) return
    try {
      const { blob, filename } = await fetchDocumentBlob(doc)
      openAuthenticatedBlob(blob, filename, "download")
    } catch (err: any) {
      console.error("Error downloading document:", err)
      toast({
        title: "Could not download document",
        description: err.message || "Authorization failed or file is missing",
        variant: "destructive",
      })
    }
  }

  const handleView = async (doc: Document) => {
    if (!doc.documentId) return

    const cached = previewCacheRef.current.get(doc.documentId)
    if (cached) {
      setPreviewDoc(doc)
      setPreviewOpen(true)
      setPreviewLoading(false)
      setPreviewKind(cached.kind)
      setPreviewBlob(cached.blob)
      setPreviewText(cached.previewText)
      setPreviewUrl(cached.objectUrl)
      return
    }

    setPreviewDoc(doc)
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewBlob(null)
    setPreviewText(null)
    setPreviewUrl(null)
    try {
      const { blob, filename, etag } = await fetchDocumentBlob(doc)
      const kind = resolvePreviewKind(doc.mimeType || blob.type, filename || doc.documentName)
      let objectUrl: string | null = null
      let previewText: string | null = null

      if (kind === "text") {
        const text = await blob.text()
        previewText = text.slice(0, 500_000)
      } else if (kind === "pdf" || kind === "image") {
        objectUrl = URL.createObjectURL(blob)
      }

      previewCacheRef.current.set(doc.documentId, {
        blob,
        objectUrl,
        previewText,
        kind,
        etag: etag ?? null,
      })

      setPreviewKind(kind)
      setPreviewBlob(blob)
      setPreviewText(previewText)
      setPreviewUrl(objectUrl)
    } catch (err: any) {
      console.error("Error loading document preview:", err)
      toast({
        title: "Could not preview document",
        description: err.message || "Authorization failed or file is missing",
        variant: "destructive",
      })
      closePreview()
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDelete = async (document: Document) => {
    if (!document.documentId) return

    if (!confirm(`Are you sure you want to delete "${document.documentName}"?`)) {
      return
    }

    try {
      await patientApi.deleteDocument(patientId, document.documentId.toString())
      const cached = previewCacheRef.current.get(document.documentId)
      if (cached?.objectUrl) URL.revokeObjectURL(cached.objectUrl)
      previewCacheRef.current.delete(document.documentId)
      toast({
        title: "Success",
        description: "Document deleted successfully.",
      })
      loadDocuments()
    } catch (err: any) {
      console.error("Error deleting document:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getUploadedByName = (doc: Document) => {
    if (doc.uploadedByFirstName || doc.uploadedByLastName) {
      return `${doc.uploadedByFirstName || ''} ${doc.uploadedByLastName || ''}`.trim()
    }
    return "Unknown"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">Medical Documents</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const data = await patientApi.getDataExport(patientId)
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `patient-${patientId}-data-export.json`
                    a.click()
                    URL.revokeObjectURL(url)
                    toast({ title: "Data export downloaded", description: "Portability bundle (PRI-DATAPORT)" })
                  } catch (err: any) {
                    toast({
                      title: "Export failed",
                      description: err.message || "Could not export patient data",
                      variant: "destructive",
                    })
                  }
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Export chart JSON
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={publishingConsent}
                onClick={async () => {
                  try {
                    setPublishingConsent(true)
                    const res = await fetch(
                      `/api/integrations/fhir/publish/consent/${encodeURIComponent(patientId)}`,
                      { method: "POST", headers: authHeaders(true) }
                    )
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) throw new Error(data.message || "Publish failed")
                    toast({
                      title: "FHIR Consent published",
                      description: data.mode ? `Mode: ${data.mode}` : "Check FHIR export log",
                    })
                  } catch (err: any) {
                    toast({
                      title: "Consent publish failed",
                      description: err.message || "Could not publish Consent bundle",
                      variant: "destructive",
                    })
                  } finally {
                    setPublishingConsent(false)
                  }
                }}
              >
                {publishingConsent ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1 h-4 w-4" />
                )}
                Publish FHIR Consent
              </Button>
              <Button size="sm" onClick={handleOpenForm}>
                <Plus className="h-4 w-4 mr-1" />
                Upload Document
              </Button>
            </div>
          </div>

          {documents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.documentId}>
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          className="text-left text-primary underline-offset-2 hover:underline"
                          onClick={() => void handleView(doc)}
                        >
                          {doc.documentName}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.category || doc.documentType || "Uncategorized"}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(doc.uploadDate), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{doc.mimeType?.split('/')[1]?.toUpperCase() || "N/A"}</TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>{getUploadedByName(doc)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleView(doc)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No documents uploaded for this patient
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document preview */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          if (!open) closePreview()
          else setPreviewOpen(true)
        }}
      >
        <DialogContent
          data-encounter-layer
          overlayClassName={PATIENT_DOC_DIALOG_OVERLAY}
          className={cn(
            "flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0",
            PATIENT_DOC_DIALOG_CONTENT
          )}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle className="truncate pr-8">{previewDoc?.documentName || "Document preview"}</DialogTitle>
            <DialogDescription>
              {previewDoc
                ? `${previewDoc.category || previewDoc.documentType || "Document"} · ${format(new Date(previewDoc.uploadDate), "MMM dd, yyyy")}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[240px] flex-1 overflow-auto bg-muted/30 p-4">
            {previewLoading ? (
              <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Loading preview…
              </div>
            ) : previewKind === "pdf" && previewUrl ? (
              <iframe
                title={previewDoc?.documentName || "Document"}
                src={previewUrl}
                className="h-[min(70vh,720px)] w-full rounded-md border bg-white"
              />
            ) : previewKind === "image" && previewUrl ? (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt={previewDoc?.documentName || "Document"}
                  className="max-h-[70vh] max-w-full rounded-md border bg-white object-contain"
                />
              </div>
            ) : previewKind === "text" && previewText != null ? (
              <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-md border bg-background p-4 text-xs">
                {previewText}
              </pre>
            ) : previewDoc ? (
              <div className="flex h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted-foreground">
                <p>
                  In-browser preview is not available for this file type
                  {previewDoc.mimeType ? ` (${previewDoc.mimeType})` : ""}.
                </p>
                <p>Use Download to open it in Word, Excel, or another app on your device.</p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-3">
            <Button type="button" variant="outline" onClick={closePreview}>
              Close
            </Button>
            {previewDoc ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (previewBlob && previewDoc) {
                    openAuthenticatedBlob(
                      previewBlob,
                      previewDoc.documentName || "document",
                      "download"
                    )
                    return
                  }
                  void handleDownload(previewDoc)
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          data-encounter-layer
          overlayClassName={PATIENT_DOC_DIALOG_OVERLAY}
          className={cn("max-w-2xl", PATIENT_DOC_DIALOG_CONTENT)}
        >
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a medical document for this patient. Maximum file size: 10MB
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {formError}
              </div>
            )}

            <div>
              <Label htmlFor="file">File *</Label>
              <div className="mt-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dicom"
                  required
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="documentName">Document Name *</Label>
              <Input
                id="documentName"
                value={formData.documentName}
                onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                required
                placeholder="e.g., Discharge Summary - Jan 2023"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="documentType">Document Type</Label>
                <Select
                  value={formData.documentType}
                  onValueChange={(value) => setFormData({ ...formData, documentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Discharge Summary">Discharge Summary</SelectItem>
                    <SelectItem value="Diagnostic Report">Diagnostic Report</SelectItem>
                    <SelectItem value="Imaging">Imaging</SelectItem>
                    <SelectItem value="Laboratory Report">Laboratory Report</SelectItem>
                    <SelectItem value="Administrative">Administrative</SelectItem>
                    <SelectItem value="Procedure Report">Procedure Report</SelectItem>
                    <SelectItem value="Billing">Billing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Optional category"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this document..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm} disabled={uploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || !selectedFile}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
