"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, X } from "lucide-react"

export interface PatientSearchFilters {
  status?: string
  startDate?: Date
  endDate?: Date
}

interface PatientSearchProps {
  onSearch: (query: string, filters: PatientSearchFilters) => void
}

export function PatientSearch({ onSearch }: PatientSearchProps) {
  const [query, setQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [startDateStr, setStartDateStr] = useState("")
  const [endDateStr, setEndDateStr] = useState("")

  const handleSearch = () => {
    const filters: PatientSearchFilters = {}

    if (status) {
      filters.status = status
    }

    if (startDateStr) {
      filters.startDate = new Date(startDateStr)
    }

    if (endDateStr) {
      filters.endDate = new Date(endDateStr)
    }

    onSearch(query, filters)
  }

  const handleReset = () => {
    setQuery("")
    setStatus(undefined)
    setStartDateStr("")
    setEndDateStr("")
    onSearch("", {})
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, ID, or contact..."
            className="w-full pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button onClick={handleSearch}>Search</Button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-md">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status || "all"} onValueChange={(value) => setStatus(value === "all" ? undefined : value)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Registration From</Label>
            <Input id="startDate" type="date" value={startDateStr} onChange={(e) => setStartDateStr(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Registration To</Label>
            <Input id="endDate" type="date" value={endDateStr} onChange={(e) => setEndDateStr(e.target.value)} />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <X className="mr-2 h-4 w-4" />
              Reset Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
