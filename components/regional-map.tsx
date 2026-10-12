"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { Badge } from "@/components/ui/badge"
import { ZoomIn, ZoomOut, RotateCcw, Info, Layers, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type React from "react"

// Hospital location data with county information
const hospitals = [
  {
    id: 1,
    name: "Eldoret",
    county: "Uasin Gishu",
    lat: 0.5143,
    lng: 35.2698,
    active: false,
    beds: 120,
    doctors: 45,
    nurses: 98,
    occupancy: 78,
  },
  {
    id: 2,
    name: "Kitale",
    county: "Trans-Nzoia",
    lat: 1.0185,
    lng: 35.0023,
    active: false,
    beds: 85,
    doctors: 32,
    nurses: 76,
    occupancy: 65,
  },
  {
    id: 3,
    name: "Kimilili",
    county: "Bungoma",
    lat: 0.7713,
    lng: 34.7273,
    active: false,
    beds: 60,
    doctors: 18,
    nurses: 42,
    occupancy: 72,
  },
  {
    id: 4,
    name: "Lodwar",
    county: "Turkana",
    lat: 3.1166,
    lng: 35.6,
    active: false,
    beds: 45,
    doctors: 12,
    nurses: 28,
    occupancy: 58,
  },
  {
    id: 5,
    name: "Bungoma",
    county: "Bungoma",
    lat: 0.5635,
    lng: 34.5606,
    active: false,
    beds: 95,
    doctors: 38,
    nurses: 82,
    occupancy: 81,
  },
  {
    id: 6,
    name: "Nakuru",
    county: "Nakuru",
    lat: -0.3031,
    lng: 36.08,
    active: false,
    beds: 150,
    doctors: 62,
    nurses: 124,
    occupancy: 75,
  },
  {
    id: 7,
    name: "Nairobi",
    county: "Nairobi",
    lat: -1.2921,
    lng: 36.8219,
    active: false,
    beds: 320,
    doctors: 145,
    nurses: 290,
    occupancy: 88,
  },
  {
    id: 8,
    name: "Mombasa",
    county: "Mombasa",
    lat: -4.0435,
    lng: 39.6682,
    active: false,
    beds: 210,
    doctors: 95,
    nurses: 180,
    occupancy: 82,
  },
  {
    id: 9,
    name: "Kisumu",
    county: "Kisumu",
    lat: -0.1022,
    lng: 34.7617,
    active: false,
    beds: 175,
    doctors: 68,
    nurses: 142,
    occupancy: 79,
  },
  {
    id: 10,
    name: "Garissa",
    county: "Garissa",
    lat: -0.4536,
    lng: 39.6417,
    active: false,
    beds: 80,
    doctors: 25,
    nurses: 60,
    occupancy: 62,
  },
  {
    id: 11,
    name: "Kakuma",
    county: "Turkana",
    lat: 3.7167,
    lng: 34.8667,
    active: false,
    beds: 40,
    doctors: 10,
    nurses: 25,
    occupancy: 50,
  },
  {
    id: 12,
    name: "Malindi",
    county: "Kilifi",
    lat: -3.2138,
    lng: 40.1169,
    active: false,
    beds: 90,
    doctors: 30,
    nurses: 65,
    occupancy: 70,
  },
  {
    id: 13,
    name: "Marsabit",
    county: "Marsabit",
    lat: 2.3333,
    lng: 37.9833,
    active: false,
    beds: 55,
    doctors: 15,
    nurses: 35,
    occupancy: 60,
  },
  {
    id: 14,
    name: "Wajir",
    county: "Wajir",
    lat: 1.7471,
    lng: 40.0573,
    active: false,
    beds: 50,
    doctors: 12,
    nurses: 30,
    occupancy: 55,
  },
  {
    id: 15,
    name: "Lamu",
    county: "Lamu",
    lat: -2.2717,
    lng: 40.9019,
    active: false,
    beds: 45,
    doctors: 10,
    nurses: 25,
    occupancy: 60,
  },
]

// Function to convert lat/lng to SVG coordinates for Kenya
const convertToSvgCoords = (lat: number, lng: number) => {
  // These are calibrated conversion values for Kenya's bounding box
  const minLat = -4.8
  const maxLat = 5.0
  const minLng = 33.5
  const maxLng = 42.0

  const svgWidth = 500
  const svgHeight = 600

  // Adjust these multipliers to better position points on the map
  const x = ((lng - minLng) / (maxLng - minLng)) * svgWidth * 0.8 + 50
  const y = svgHeight - ((lat - minLat) / (maxLat - minLat)) * svgHeight * 0.8 - 100

  return { x, y }
}

// Fix the SVG path data by replacing the multi-line string with a properly formatted string
// Replace the kenyaOutlinePath variable with:

const kenyaOutlinePath =
  "M235.5,50.4 L240.2,51.8 L245.3,53.5 L249.8,55.6 L254.1,58.2 L258.7,61.3 L262.9,64.7 L266.8,68.5 L270.3,72.6 L273.5,77.1 L276.2,81.9 L278.6,87.0 L280.5,92.3 L282.0,97.8 L283.1,103.5 L283.8,109.3 L284.1,115.2 L284.0,121.1 L283.5,127.0 L282.6,132.8 L281.3,138.5 L279.7,144.1 L277.7,149.5 L275.3,154.7 L272.6,159.7 L269.6,164.4 L266.3,168.9 L262.7,173.0 L258.9,176.9 L254.8,180.4 L250.5,183.6 L246.0,186.4 L241.3,188.9 L236.5,191.0 L231.5,192.7 L226.4,194.0 L221.2,194.9 L216.0,195.4 L210.7,195.5 L205.5,195.2 L200.3,194.5 L195.1,193.4 L190.1,191.9 L185.2,190.1 L180.4,187.9 L175.9,185.3 L171.6,182.4 L167.5,179.2 L163.8,175.7 L160.3,171.9 L157.2,167.9 L154.4,163.6 L152.0,159.1 L149.9,154.4 L148.2,149.6 L146.9,144.6 L146.0,139.5 L145.5,134.4 L145.4,129.2 L145.7,124.0 L146.4,118.9 L147.5,113.8 L149.0,108.8 L150.9,104.0 L153.1,99.3 L155.7,94.8 L158.6,90.6 L161.8,86.6 L165.3,82.9 L169.1,79.5 L173.1,76.4 L177.4,73.7 L181.9,71.3 L186.6,69.3 L191.4,67.7 L196.4,66.4 L201.5,65.5 L206.7,65.0 L211.9,64.9 L217.1,65.2 L222.3,65.9 L227.4,67.0 L232.4,68.5 L235.5,50.4 M283.1,103.5 L290.5,105.2 L297.8,107.3 L305.0,109.8 L312.1,112.7 L319.0,116.0 L325.7,119.7 L332.2,123.8 L338.5,128.2 L344.5,133.0 L350.3,138.1 L355.8,143.5 L360.9,149.2 L365.8,155.2 L370.3,161.5 L374.5,168.0 L378.3,174.8 L381.7,181.8 L384.7,189.0 L387.3,196.4 L389.5,204.0 L391.3,211.7 L392.6,219.5 L393.5,227.4 L394.0,235.4 L394.0,243.4 L393.6,251.4 L392.7,259.3 L391.4,267.2 L389.6,275.0 L387.4,282.6 L384.8,290.1 L381.7,297.4 L378.3,304.5 L374.4,311.3 L370.2,317.9 L365.6,324.2 L360.7,330.2 L355.4,335.9 L349.9,341.2 L344.0,346.2 L337.9,350.8 L331.5,355.0 L324.9,358.8 L318.1,362.2 L311.1,365.2 L303.9,367.7 L296.6,369.8 L289.1,371.5 L281.5,372.7 L273.9,373.4 L266.2,373.7 L258.5,373.5 L250.8,372.8 L243.2,371.7 L235.6,370.1 L228.1,368.0 L220.8,365.5 L213.6,362.5 L206.6,359.1 L199.8,355.3 L193.3,351.1 L187.0,346.5 L181.0,341.5 L175.3,336.2 L169.9,330.5 L164.9,324.5 L160.3,318.2 L156.0,311.6 L152.2,304.8 L148.8,297.7 L145.8,290.4 L143.2,282.9 L141.1,275.3 L139.4,267.5 L138.2,259.7 L137.5,251.8 L137.2,243.8 L137.4,235.9 L138.1,228.0 L139.2,220.1 L140.8,212.3 L142.9,204.7 L145.4,197.2 L148.4,189.9 L151.8,182.8 L155.6,176.0 L159.8,169.4 L164.4,163.1 L169.3,157.1 L174.6,151.4 L180.2,146.1 L186.1,141.1 L192.3,136.5 L198.7,132.3 L205.4,128.5 L212.3,125.1 L219.4,122.1 L226.7,119.6 L234.1,117.5 L241.7,115.9 L249.3,114.7 L257.0,114.0 L264.7,113.7 L272.4,113.9 L280.1,114.6 L283.1,103.5"

// National parks and reserves based on the reference image
const nationalParks = [
  { name: "Sibiloi National Park", x: 200, y: 120, radius: 15 },
  { name: "Marsabit National Reserve", x: 250, y: 150, radius: 12 },
  { name: "Mount Kenya National Park", x: 260, y: 270, radius: 15 },
  { name: "Aberdare National Park", x: 240, y: 290, radius: 12 },
  { name: "Nairobi National Park", x: 230, y: 350, radius: 10 },
  { name: "Amboseli National Park", x: 220, y: 390, radius: 15 },
  { name: "Tsavo East National Park", x: 300, y: 370, radius: 20 },
  { name: "Tsavo West National Park", x: 270, y: 380, radius: 18 },
  { name: "Masai Mara National Reserve", x: 180, y: 350, radius: 18 },
  { name: "Samburu National Reserve", x: 250, y: 180, radius: 12 },
]

// Major lakes and geographical features based on the reference image
const geographicalFeatures = [
  { name: "Lake Victoria", type: "lake", cx: 150, cy: 330, rx: 40, ry: 25 },
  { name: "Lake Turkana", type: "lake", cx: 180, cy: 120, rx: 20, ry: 50 },
  { name: "Lake Naivasha", type: "lake", cx: 220, cy: 320, rx: 10, ry: 8 },
  { name: "Lake Nakuru", type: "lake", cx: 210, cy: 300, rx: 8, ry: 6 },
  { name: "Lake Baringo", type: "lake", cx: 230, cy: 230, rx: 7, ry: 7 },
  { name: "Mt. Kenya", type: "mountain", x: 260, y: 270 },
  { name: "Mt. Elgon", type: "mountain", x: 170, y: 230 },
  { name: "Aberdare Range", type: "mountain", x: 240, y: 290 },
  { name: "Chalbi Desert", type: "desert", x: 220, y: 100 },
  { name: "Indian Ocean", type: "ocean", x: 360, y: 380 },
]

// Major roads based on the reference image
const majorRoads = [
  { from: { x: 230, y: 350 }, to: { x: 320, y: 400 }, name: "Mombasa Road" },
  { from: { x: 230, y: 350 }, to: { x: 170, y: 320 }, name: "Kisumu Highway" },
  { from: { x: 230, y: 350 }, to: { x: 220, y: 300 }, name: "Nakuru Highway" },
  { from: { x: 220, y: 300 }, to: { x: 190, y: 250 }, name: "Eldoret Highway" },
  { from: { x: 190, y: 250 }, to: { x: 170, y: 240 }, name: "Kitale Road" },
  { from: { x: 230, y: 350 }, to: { x: 300, y: 280 }, name: "Garissa Road" },
  { from: { x: 320, y: 400 }, to: { x: 310, y: 380 }, name: "Malindi Road" },
  { from: { x: 170, y: 320 }, to: { x: 140, y: 350 }, name: "Migori Road" },
  { from: { x: 220, y: 300 }, to: { x: 180, y: 350 }, name: "Narok Road" },
  { from: { x: 230, y: 350 }, to: { x: 220, y: 380 }, name: "Kajiado Road" },
]

// Major cities for reference
const majorCities = [
  { name: "Nairobi", x: 230, y: 350 },
  { name: "Mombasa", x: 320, y: 400 },
  { name: "Kisumu", x: 170, y: 320 },
  { name: "Nakuru", x: 220, y: 300 },
  { name: "Eldoret", x: 190, y: 250 },
  { name: "Garissa", x: 300, y: 280 },
  { name: "Lodwar", x: 140, y: 110 },
  { name: "Malindi", x: 330, y: 370 },
  { name: "Kakuma", x: 120, y: 80 },
  { name: "Marsabit", x: 250, y: 150 },
  { name: "Wajir", x: 320, y: 200 },
  { name: "Lamu", x: 340, y: 350 },
  { name: "Kitale", x: 170, y: 240 },
  { name: "Kericho", x: 200, y: 300 },
  { name: "Nyeri", x: 240, y: 310 },
]

// Kenya counties with accurate coordinates based on the reference image
const counties = [
  { id: 1, name: "Turkana", centroid: { x: 140, y: 110 }, highlighted: true },
  { id: 2, name: "Trans-Nzoia", centroid: { x: 190, y: 230 }, highlighted: true },
  { id: 3, name: "Uasin Gishu", centroid: { x: 210, y: 250 }, highlighted: true },
  { id: 4, name: "Bungoma", centroid: { x: 170, y: 240 }, highlighted: true },
  { id: 5, name: "West Pokot", centroid: { x: 180, y: 190 }, highlighted: false },
  { id: 6, name: "Elgeyo-Marakwet", centroid: { x: 205, y: 200 }, highlighted: false },
  { id: 7, name: "Baringo", centroid: { x: 235, y: 205 }, highlighted: false },
  { id: 8, name: "Nandi", centroid: { x: 190, y: 265 }, highlighted: false },
  { id: 9, name: "Nakuru", centroid: { x: 220, y: 300 }, highlighted: true },
  { id: 10, name: "Nairobi", centroid: { x: 230, y: 350 }, highlighted: true },
  { id: 11, name: "Mombasa", centroid: { x: 320, y: 400 }, highlighted: true },
  { id: 12, name: "Kisumu", centroid: { x: 170, y: 320 }, highlighted: true },
  { id: 13, name: "Garissa", centroid: { x: 300, y: 280 }, highlighted: true },
  { id: 14, name: "Kilifi", centroid: { x: 310, y: 380 }, highlighted: true },
  { id: 15, name: "Marsabit", centroid: { x: 250, y: 150 }, highlighted: true },
  { id: 16, name: "Wajir", centroid: { x: 320, y: 200 }, highlighted: true },
  { id: 17, name: "Lamu", centroid: { x: 340, y: 350 }, highlighted: true },
  { id: 18, name: "Samburu", centroid: { x: 250, y: 180 }, highlighted: false },
  { id: 19, name: "Isiolo", centroid: { x: 270, y: 230 }, highlighted: false },
  { id: 20, name: "Meru", centroid: { x: 260, y: 260 }, highlighted: false },
  { id: 21, name: "Tana River", centroid: { x: 320, y: 320 }, highlighted: false },
  { id: 22, name: "Kitui", centroid: { x: 280, y: 330 }, highlighted: false },
  { id: 23, name: "Machakos", centroid: { x: 250, y: 350 }, highlighted: false },
  { id: 24, name: "Kajiado", centroid: { x: 220, y: 380 }, highlighted: false },
  { id: 25, name: "Narok", centroid: { x: 180, y: 350 }, highlighted: false },
  { id: 26, name: "Bomet", centroid: { x: 190, y: 320 }, highlighted: false },
  { id: 27, name: "Kericho", centroid: { x: 200, y: 300 }, highlighted: false },
  { id: 28, name: "Kakamega", centroid: { x: 180, y: 270 }, highlighted: false },
  { id: 29, name: "Siaya", centroid: { x: 160, y: 300 }, highlighted: false },
  { id: 30, name: "Homa Bay", centroid: { x: 150, y: 330 }, highlighted: false },
  { id: 31, name: "Migori", centroid: { x: 140, y: 350 }, highlighted: false },
  { id: 32, name: "Taita Taveta", centroid: { x: 290, y: 390 }, highlighted: false },
  { id: 33, name: "Kwale", centroid: { x: 300, y: 420 }, highlighted: false },
  { id: 34, name: "Mandera", centroid: { x: 370, y: 180 }, highlighted: false },
]

export function RegionalMap() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [hospitalData, setHospitalData] = useState(hospitals)
  const [selectedHospital, setSelectedHospital] = useState<number | null>(null)
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null)
  const [showRoads, setShowRoads] = useState(true)
  const [showFeatures, setShowFeatures] = useState(true)
  const [showParks, setShowParks] = useState(true)
  const [showCounties, setShowCounties] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  // Simulate real-time payment activities
  useEffect(() => {
    const interval = setInterval(() => {
      const randomHospitalId = Math.floor(Math.random() * hospitals.length) + 1

      setHospitalData((prev) =>
        prev.map((hospital) => ({
          ...hospital,
          active: hospital.id === randomHospitalId ? true : hospital.active,
        })),
      )

      // Reset the active state after animation
      setTimeout(() => {
        setHospitalData((prev) =>
          prev.map((hospital) => ({
            ...hospital,
            active: hospital.id === randomHospitalId ? false : hospital.active,
          })),
        )
      }, 2000)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Handle zoom in
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 2.5))
  }

  // Handle zoom out
  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.8))
  }

  // Handle reset view
  const handleReset = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left mouse button
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Handle mouse leave to stop dragging
  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // Get county statistics
  const getCountyStats = (countyName: string) => {
    const countyHospitals = hospitalData.filter((h) => h.county === countyName)
    if (countyHospitals.length === 0) return null

    const totalBeds = countyHospitals.reduce((sum, h) => sum + h.beds, 0)
    const totalDoctors = countyHospitals.reduce((sum, h) => sum + h.doctors, 0)
    const totalNurses = countyHospitals.reduce((sum, h) => sum + h.nurses, 0)
    const avgOccupancy = countyHospitals.reduce((sum, h) => sum + h.occupancy, 0) / countyHospitals.length

    return {
      hospitals: countyHospitals.length,
      beds: totalBeds,
      doctors: totalDoctors,
      nurses: totalNurses,
      occupancy: avgOccupancy.toFixed(1),
    }
  }

  return (
    <TooltipProvider>
      <div className="relative h-[600px] w-full overflow-hidden bg-background">
        {/* Map controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleReset} title="Reset View">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Layer controls */}
        <Card className="absolute top-4 left-4 z-10 p-3 bg-background/90 backdrop-blur-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="roads" className="text-xs flex items-center gap-1">
                <Layers className="h-3 w-3" /> Roads
              </Label>
              <Switch id="roads" checked={showRoads} onCheckedChange={setShowRoads} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="features" className="text-xs flex items-center gap-1">
                <Info className="h-3 w-3" /> Features
              </Label>
              <Switch id="features" checked={showFeatures} onCheckedChange={setShowFeatures} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="parks" className="text-xs flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 9l5 5v7H7v-7l5-5" />
                  <path d="M8 9l5-5 5 5" />
                  <path d="M8 9l5-5 5 5" />
                  <path d="M13 14h4" />
                  <path d="M13 19h4" />
                </svg>{" "}
                Parks
              </Label>
              <Switch id="parks" checked={showParks} onCheckedChange={setShowParks} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="counties" className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Counties
              </Label>
              <Switch id="counties" checked={showCounties} onCheckedChange={setShowCounties} />
            </div>
          </div>
        </Card>

        {/* Kenya map */}
        <div
          className="h-full w-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 500 700"
            className="w-full h-full"
            style={{
              filter: isDark ? "brightness(0.8) contrast(1.2)" : "none",
              transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
              transformOrigin: "center",
              transition: "transform 0.2s ease",
            }}
          >
            {/* Kenya outline - accurate based on the reference image */}
            <path
              d={kenyaOutlinePath}
              fill={isDark ? "#2d3748" : "#f7f3e3"} // Using a beige color similar to the map
              stroke={isDark ? "#4a5568" : "#3182ce"}
              strokeWidth="2"
              className="transition-colors duration-300"
            />

            {/* National parks and reserves */}
            {showParks &&
              nationalParks.map((park, index) => (
                <g key={`park-${index}`}>
                  <circle
                    cx={park.x}
                    cy={park.y}
                    r={park.radius}
                    fill={isDark ? "rgba(39, 103, 73, 0.3)" : "rgba(104, 211, 145, 0.3)"}
                    stroke={isDark ? "#276749" : "#68d391"}
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    className="transition-colors duration-300"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <circle cx={park.x} cy={park.y} r="3" fill="transparent" className="cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{park.name}</p>
                    </TooltipContent>
                  </Tooltip>
                  <text
                    x={park.x}
                    y={park.y + park.radius + 10}
                    fontSize="6"
                    textAnchor="middle"
                    fill={isDark ? "#e2e8f0" : "#2d3748"}
                    className="pointer-events-none transition-colors duration-300"
                  >
                    {park.name.length > 15 ? park.name.substring(0, 15) + "..." : park.name}
                  </text>
                </g>
              ))}

            {/* Major roads based on the map */}
            {showRoads &&
              majorRoads.map((road, index) => (
                <g key={`road-${index}`}>
                  <line
                    x1={road.from.x}
                    y1={road.from.y}
                    x2={road.to.x}
                    y2={road.to.y}
                    stroke={isDark ? "#a0aec0" : "#718096"}
                    strokeWidth="1.5"
                    strokeDasharray="none"
                    className="transition-colors duration-300"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <circle
                        cx={(road.from.x + road.to.x) / 2}
                        cy={(road.from.y + road.to.y) / 2}
                        r="3"
                        fill="transparent"
                        className="cursor-help"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{road.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </g>
              ))}

            {/* Geographical features */}
            {showFeatures &&
              geographicalFeatures.map((feature, index) =>
                feature.type === "lake" ? (
                  <ellipse
                    key={index}
                    cx={feature.cx}
                    cy={feature.cy || feature.y}
                    rx={feature.rx}
                    ry={feature.ry}
                    fill={isDark ? "#2c5282" : "#90cdf4"}
                    className="transition-colors duration-300"
                  />
                ) : feature.type === "mountain" ? (
                  <polygon
                    key={index}
                    points={`${feature.x - 10},${feature.y + 10} ${feature.x},${feature.y - 10} ${feature.x + 10},${
                      feature.y + 10
                    }`}
                    fill={isDark ? "#4a5568" : "#a0aec0"}
                    className="transition-colors duration-300"
                  />
                ) : feature.type === "desert" ? (
                  <circle
                    key={index}
                    cx={feature.x}
                    cy={feature.y}
                    r="15"
                    fill={isDark ? "#4a5568" : "#f6e05e"}
                    fillOpacity="0.3"
                    className="transition-colors duration-300"
                  />
                ) : (
                  <text
                    key={index}
                    x={feature.x}
                    y={feature.y}
                    fontSize="10"
                    fill={isDark ? "#90cdf4" : "#2c5282"}
                    fontStyle="italic"
                    className="transition-colors duration-300"
                  >
                    {feature.name}
                  </text>
                ),
              )}

            {/* Feature labels */}
            {showFeatures &&
              geographicalFeatures
                .filter((f) => f.type !== "ocean")
                .map((feature, index) => (
                  <text
                    key={`label-${index}`}
                    x={feature.type === "lake" ? feature.cx : feature.x}
                    y={feature.type === "lake" ? feature.cy || feature.y : feature.y - 15}
                    textAnchor="middle"
                    fontSize="8"
                    fill={isDark ? "#e2e8f0" : "#2d3748"}
                    className="pointer-events-none transition-colors duration-300"
                  >
                    {feature.name}
                  </text>
                ))}

            {/* County boundaries */}
            {showCounties &&
              counties.map((county) => (
                <g key={county.id}>
                  <circle
                    cx={county.centroid.x}
                    cy={county.centroid.y}
                    r={county.highlighted ? 25 : 20}
                    fill={
                      hoveredCounty === county.name
                        ? isDark
                          ? "rgba(66, 153, 225, 0.5)"
                          : "rgba(66, 153, 225, 0.4)"
                        : county.highlighted
                          ? isDark
                            ? "rgba(66, 153, 225, 0.3)"
                            : "rgba(66, 153, 225, 0.2)"
                          : "transparent"
                    }
                    stroke={isDark ? "#4a5568" : "#3182ce"}
                    strokeWidth="1"
                    strokeDasharray={county.highlighted ? "none" : "3,3"}
                    className="transition-colors duration-300"
                    onMouseEnter={() => setHoveredCounty(county.name)}
                    onMouseLeave={() => setHoveredCounty(null)}
                  />
                  {county.highlighted && (
                    <text
                      x={county.centroid.x}
                      y={county.centroid.y}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill={isDark ? "rgba(226, 232, 240, 0.7)" : "rgba(45, 55, 72, 0.7)"}
                      className="pointer-events-none transition-colors duration-300"
                    >
                      {county.name}
                    </text>
                  )}
                </g>
              ))}

            {/* County tooltips */}
            {hoveredCounty && showCounties && (
              <g>
                {counties.find((c) => c.name === hoveredCounty) && (
                  <foreignObject
                    x={counties.find((c) => c.name === hoveredCounty)!.centroid.x - 60}
                    y={counties.find((c) => c.name === hoveredCounty)!.centroid.y - 60}
                    width="120"
                    height="50"
                    className="pointer-events-none"
                  >
                    <div className="rounded bg-background/90 p-2 text-xs shadow-md backdrop-blur-sm">
                      <div className="font-bold">{hoveredCounty} County</div>
                      {getCountyStats(hoveredCounty) ? (
                        <div className="text-muted-foreground">
                          {getCountyStats(hoveredCounty)?.hospitals} hospitals, {getCountyStats(hoveredCounty)?.beds}{" "}
                          beds
                        </div>
                      ) : (
                        <div className="text-muted-foreground">No hospital data</div>
                      )}
                    </div>
                  </foreignObject>
                )}
              </g>
            )}

            {/* Major cities for reference */}
            {majorCities.map((city, index) => (
              <g key={index}>
                <circle cx={city.x} cy={city.y} r="3" fill="#718096" />
                <text
                  x={city.x + 10}
                  y={city.y}
                  fontSize="8"
                  fill={isDark ? "#e2e8f0" : "#2d3748"}
                  className="transition-colors duration-300"
                >
                  {city.name}
                </text>
              </g>
            ))}

            {/* Hospital locations */}
            {hospitalData.map((hospital) => {
              const coords = convertToSvgCoords(hospital.lat, hospital.lng)
              return (
                <g key={hospital.id} onClick={() => setSelectedHospital(hospital.id)}>
                  {/* Pulse animation for active hospitals */}
                  {hospital.active && (
                    <>
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r="15"
                        fill="rgba(49, 130, 206, 0.3)"
                        className="animate-ping"
                      />
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r="10"
                        fill="rgba(49, 130, 206, 0.5)"
                        className="animate-pulse"
                      />
                    </>
                  )}

                  {/* Hospital marker */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r="6"
                        fill={hospital.id === selectedHospital ? "#f56565" : "#3182ce"}
                        stroke="#fff"
                        strokeWidth="2"
                        className="cursor-pointer hover:fill-blue-400 transition-colors"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{hospital.name} Hospital</p>
                      <p className="text-xs text-muted-foreground">{hospital.county} County</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Hospital name */}
                  <text
                    x={coords.x}
                    y={coords.y - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={hospital.id === selectedHospital ? "bold" : "normal"}
                    fill={isDark ? "#e2e8f0" : "#2d3748"}
                    className="pointer-events-none transition-colors duration-300"
                  >
                    {hospital.name}
                  </text>
                </g>
              )
            })}

            {/* Legend */}
            <g transform="translate(20, 20)">
              <rect
                x="0"
                y="0"
                width="140"
                height="180"
                fill={isDark ? "rgba(45, 55, 72, 0.8)" : "rgba(255, 255, 255, 0.8)"}
                rx="4"
                className="transition-colors duration-300"
              />
              <text
                x="10"
                y="20"
                fontSize="12"
                fontWeight="bold"
                fill={isDark ? "#e2e8f0" : "#2d3748"}
                className="transition-colors duration-300"
              >
                Legend
              </text>
              <circle cx="20" cy="40" r="5" fill="#3182ce" />
              <text
                x="30"
                y="43"
                fontSize="10"
                fill={isDark ? "#e2e8f0" : "#2d3748"}
                className="transition-colors duration-300"
              >
                Hospital Location
              </text>
              <circle cx="20" cy="60" r="5" fill="#f56565" />
              <text
                x="30"
                y="63"
                fontSize="10"
                fill={isDark ? "#e2e8f0" : "#2d3748"}
                className="transition-colors duration-300"
              >
                Selected Hospital
              </text>
              <circle cx="20" cy="80" r="20" fill="rgba(66, 153, 225, 0.2)" stroke="#3182ce" strokeWidth="1" />
              <text
                x="30"
                y="83"
                fontSize="10"
                fill={isDark ? "#e2e8f0" : "#2d3748"}
                className="transition-colors duration-300"
              >
                County
              </text>
              <circle cx="20" cy="110" r="3" fill="#718096" />
              <text
                x="30"
                y="113"
                fontSize="10"
                fill={isDark ? "#e2e8f0" : "#2d3748"}
                className="transition-colors duration-300"
              >
                Major City
              </text>
              <ellipse cx="20" cy="130" rx="10" ry="5" fill={isDark ? "#2c5282" : "#90cdf4"} />
              <text
                x="30"
                y="133"
                fontSize="10"
                fill={isDark ? "#e2e8f0" : "#2d3748"}
                className="transition-colors duration-300"
              >
                Lake
              </text>
              <line x1="15" y1="150" x2="25" y2="150" stroke={isDark ? "#a0aec0" : "#718096"} strokeWidth="2" />
              <text
                x="30"
                y="153"
                fontSize="10"
                fill={isDark ? "#e2e8f0" : "#2d3748"}
                className="transition-colors duration-300"
              >
                Major Road
              </text>
              <circle
                cx="20"
                cy="170"
                r="5"
                fill={isDark ? "rgba(39, 103, 73, 0.3)" : "rgba(104, 211, 145, 0.3)"}
                stroke={isDark ? "#276749" : "#68d391"}
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <text
                x="30"
                y="173"
                fontSize="10"
                fill={isDark ? "#e2e8f0" : "#2d3748"}
                className="transition-colors duration-300"
              >
                National Park
              </text>
            </g>
          </svg>
        </div>

        {/* Hospital info card */}
        {selectedHospital && (
          <Card className="absolute bottom-4 right-4 w-72 bg-background/90 backdrop-blur-sm">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{hospitalData.find((h) => h.id === selectedHospital)?.name} Hospital</h3>
                <Badge variant="outline">{hospitalData.find((h) => h.id === selectedHospital)?.county}</Badge>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patients today:</span>
                  <span className="font-medium">{Math.floor(Math.random() * 50) + 20}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue today:</span>
                  <span className="font-medium">KES {(Math.random() * 500000 + 100000).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bed capacity:</span>
                  <span className="font-medium">{hospitalData.find((h) => h.id === selectedHospital)?.beds} beds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Medical staff:</span>
                  <span className="font-medium">
                    {hospitalData.find((h) => h.id === selectedHospital)?.doctors} doctors,{" "}
                    {hospitalData.find((h) => h.id === selectedHospital)?.nurses} nurses
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Occupancy rate:</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{
                          width: `${hospitalData.find((h) => h.id === selectedHospital)?.occupancy}%`,
                          backgroundColor:
                            hospitalData.find((h) => h.id === selectedHospital)?.occupancy! > 85
                              ? "#ef4444"
                              : hospitalData.find((h) => h.id === selectedHospital)?.occupancy! > 70
                                ? "#f59e0b"
                                : "#3b82f6",
                        }}
                      ></div>
                    </div>
                    <span className="font-medium">
                      {hospitalData.find((h) => h.id === selectedHospital)?.occupancy}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Last payment received:</span>
                  <span className="font-medium">{Math.floor(Math.random() * 30) + 2} minutes ago</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground">Last admission:</span>
                  <span className="font-medium">{Math.floor(Math.random() * 60) + 5} minutes ago</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
