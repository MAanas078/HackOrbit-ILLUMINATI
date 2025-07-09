"use client"

import { useState, useEffect, useRef } from "react"
import axios from "axios"
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet"
import {
  FiCpu,
  FiHardDrive,
  FiServer,
  FiMonitor,
  FiFilter,
  FiSearch,
  FiMapPin,
  FiList,
  FiNavigation,
  FiX,
  FiArrowRight,
} from "react-icons/fi"
import { useNavigate } from "react-router-dom"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

// Fix Leaflet icon issue
import icon from "leaflet/dist/images/marker-icon.png"
import iconShadow from "leaflet/dist/images/marker-shadow.png"

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

// Custom marker icons
const createCustomIcon = (color, selected = false) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; border: ${
      selected ? "3px solid white" : "2px solid white"
    }; border-radius: 50%; width: ${selected ? "18px" : "14px"}; height: ${
      selected ? "18px" : "14px"
    }; box-shadow: 0 0 ${selected ? "8px" : "0"} rgba(255,255,255,0.5);"></div>`,
    className: "custom-marker",
    iconSize: [selected ? 18 : 14, selected ? 18 : 14],
    iconAnchor: [selected ? 9 : 7, selected ? 9 : 7],
  })
}

// Map center component
function MapCenterController({ center, zoom }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])

  return null
}

// Device connections component
function DeviceConnections({ devices, selectedDevice, userLocation }) {
  const map = useMap()

  // Function to get device position as [lat, lng]
  const getDevicePosition = (device) => {
    if (device && device.coordinates && device.coordinates.lat && device.coordinates.lng) {
      return [device.coordinates.lat, device.coordinates.lng]
    }
    return null
  }

  // Create connections from selected device to other devices
  const connections = []

  if (selectedDevice) {
    const selectedPos = getDevicePosition(selectedDevice)

    if (selectedPos) {
      // Connect to user location if available
      if (userLocation) {
        connections.push({
          positions: [selectedPos, userLocation],
          color: "#3B82F6", // blue for user connection
          distance: calculateDistance(selectedPos[0], selectedPos[1], userLocation[0], userLocation[1]),
          isUser: true,
        })
      }

      // Connect to other devices (limit to 5 closest to avoid clutter)
      const otherDevices = devices
        .filter((d) => d._id !== selectedDevice._id)
        .map((d) => ({
          device: d,
          position: getDevicePosition(d),
          distance: d.coordinates
            ? calculateDistance(selectedPos[0], selectedPos[1], d.coordinates.lat, d.coordinates.lng)
            : Number.POSITIVE_INFINITY,
        }))
        .filter((d) => d.position)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5)

      otherDevices.forEach((d) => {
        connections.push({
          positions: [selectedPos, d.position],
          color: "#8B5CF6", // purple for device connections
          distance: d.distance,
          deviceId: d.device._id,
        })
      })
    }
  }

  return (
    <>
      {connections.map((connection, idx) => (
        <div key={`connection-${idx}`}>
          <Polyline
            positions={connection.positions}
            pathOptions={{
              color: connection.color,
              weight: 2,
              opacity: 0.7,
              dashArray: "5, 5",
            }}
          />
          {/* Distance label */}
          <Marker
            position={getMidpoint(connection.positions[0], connection.positions[1])}
            icon={L.divIcon({
              html: `<div class="distance-label">${connection.distance.toFixed(1)} km</div>`,
              className: "distance-marker",
              iconSize: [80, 20],
              iconAnchor: [40, 10],
            })}
            interactive={false}
          />
        </div>
      ))}
    </>
  )
}

// Helper function to get midpoint between two points
function getMidpoint(point1, point2) {
  return [(point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2]
}

// Calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const MapMarketplace = () => {
  const [devices, setDevices] = useState([])
  const [filteredDevices, setFilteredDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [maxDistance, setMaxDistance] = useState(50) // km
  const [filters, setFilters] = useState({
    deviceType: "",
    minPrice: "",
    maxPrice: "",
    searchTerm: "",
    taskType: "",
  })
  const [rentLoading, setRentLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState([20.2961, 85.8245]) // Default: Bhubaneswar
  const [zoom, setZoom] = useState(10)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [showDistances, setShowDistances] = useState(true)
  const [compareDevice, setCompareDevice] = useState(null)
  const [nearbyDevices, setNearbyDevices] = useState([])

  const mapRef = useRef(null)
  const navigate = useNavigate()

  const commonTaskTypes = ["AI Training", "3D Rendering", "Data Processing", "Gaming", "Video Encoding"]
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos = [position.coords.latitude, position.coords.longitude]
          setUserLocation(userPos)
          setMapCenter(userPos)
        },
        (error) => {
          console.warn("Geolocation error:", error)
          // Keep default location
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
      )
    }
    setMapReady(true)
  }, [])

  // Fetch devices from API
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${API_BASE}/api/device`)

        // Process devices and add distance calculation
        let devicesWithDistance = response.data.map((device) => {
          // Ensure device has coordinates
          if (!device.coordinates || !device.coordinates.lat || !device.coordinates.lng) {
            // Generate random coordinates near default location if missing
            // This is just for demonstration - in production, you'd handle missing coordinates differently
            const randomLat = mapCenter[0] + (Math.random() - 0.5) * 0.2
            const randomLng = mapCenter[1] + (Math.random() - 0.5) * 0.2
            device.coordinates = { lat: randomLat, lng: randomLng }
          }

          // Calculate distance from user if available
          if (userLocation) {
            const distance = calculateDistance(
              userLocation[0],
              userLocation[1],
              device.coordinates.lat,
              device.coordinates.lng,
            )
            return { ...device, distance: Math.round(distance * 10) / 10 }
          }
          return device
        })

        // Filter by distance if specified
        if (userLocation && maxDistance) {
          devicesWithDistance = devicesWithDistance.filter(
            (device) => !device.distance || device.distance <= maxDistance,
          )
        }

        setDevices(devicesWithDistance)
        setFilteredDevices(devicesWithDistance)
        setLoading(false)
      } catch (err) {
        console.error("API Error:", err)
        setError("Failed to load devices. Please try again later.")
        setLoading(false)
      }
    }

    fetchDevices()
  }, [userLocation, maxDistance, API_BASE, mapCenter])

  // Update nearby devices when selected device changes
  useEffect(() => {
    if (selectedDevice && devices.length > 0) {
      const selectedPos = [selectedDevice.coordinates.lat, selectedDevice.coordinates.lng]

      // Find nearby devices (excluding the selected one)
      const nearby = devices
        .filter((d) => d._id !== selectedDevice._id)
        .map((device) => {
          const devicePos = [device.coordinates.lat, device.coordinates.lng]
          const distance = calculateDistance(selectedPos[0], selectedPos[1], devicePos[0], devicePos[1])
          return { ...device, distanceFromSelected: distance }
        })
        .sort((a, b) => a.distanceFromSelected - b.distanceFromSelected)
        .slice(0, 5) // Get 5 closest devices

      setNearbyDevices(nearby)
    } else {
      setNearbyDevices([])
    }
  }, [selectedDevice, devices])

  // Apply filters
  useEffect(() => {
    let results = [...devices]

    if (filters.deviceType) {
      results = results.filter((device) => device.deviceType === filters.deviceType)
    }

    if (filters.minPrice) {
      results = results.filter((device) => device.price >= Number(filters.minPrice))
    }

    if (filters.maxPrice) {
      results = results.filter((device) => device.price <= Number(filters.maxPrice))
    }

    if (filters.taskType) {
      results = results.filter(
        (device) => device.acceptedTaskTypes && device.acceptedTaskTypes.includes(filters.taskType),
      )
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      results = results.filter(
        (device) =>
          device.deviceName.toLowerCase().includes(searchLower) ||
          device.location.toLowerCase().includes(searchLower) ||
          (device.specs &&
            Object.entries(device.specs).some(([key, value]) => value.toLowerCase().includes(searchLower))),
      )
    }

    setFilteredDevices(results)

    // If the selected device is filtered out, clear it
    if (selectedDevice && !results.find((d) => d._id === selectedDevice._id)) {
      setSelectedDevice(null)
    }
  }, [filters, devices, selectedDevice])

  const getDeviceColor = (type) => {
    switch (type) {
      case "CPU":
        return "#6366F1"
      case "GPU":
        return "#8B5CF6"
      case "RAM":
        return "#7C3AED"
      case "Storage":
        return "#6366F1"
      case "Full System":
        return "#EC4899"
      default:
        return "#6366F1"
    }
  }

  const getDeviceIcon = (type) => {
    switch (type) {
      case "CPU":
        return <FiCpu className="text-indigo-400 text-xl" />
      case "GPU":
        return <FiServer className="text-purple-400 text-xl" />
      case "RAM":
        return <FiHardDrive className="text-violet-400 text-xl" />
      case "Storage":
        return <FiHardDrive className="text-indigo-400 text-xl" />
      case "Full System":
        return <FiMonitor className="text-pink-500 text-xl" />
      default:
        return <FiServer className="text-indigo-400 text-xl" />
    }
  }

  const formatSpecs = (specs) => {
    if (!specs) return "No specifications available"

    const entries = Object.entries(specs)
    if (entries.length === 0) return "No specifications available"

    return entries.slice(0, 3).map(([key, value]) => (
      <div key={key} className="text-gray-300 text-sm">
        <span className="font-medium text-indigo-300">{key}:</span> {value}
      </div>
    ))
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSearchChange = (e) => {
    setFilters((prev) => ({
      ...prev,
      searchTerm: e.target.value,
    }))
  }

  const resetFilters = () => {
    setFilters({
      deviceType: "",
      minPrice: "",
      maxPrice: "",
      searchTerm: "",
      taskType: "",
    })
  }

  const handleRentDevice = async (deviceId) => {
    try {
      setRentLoading(true)

      // Create a rental session via API
      const response = await axios.post(`${API_BASE}/api/session`, {
        deviceId,
        language: "python", // Default language
      })

      // Navigate to the renter dashboard with new session
      navigate("/dashboard/renter", {
        state: {
          newSession: true,
          sessionId: response.data.sessionId,
        },
      })
    } catch (error) {
      console.error("Error renting device:", error)
      alert(error.response?.data?.message || "Failed to rent device")
      setRentLoading(false)
    }
  }

  const centerOnUserLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation)
      setZoom(13)
    }
  }

  const centerOnDevice = (device) => {
    if (device && device.coordinates) {
      setSelectedDevice(device)
      setMapCenter([device.coordinates.lat, device.coordinates.lng])
      setZoom(14)
    }
  }

  const selectCompareDevice = (device) => {
    setCompareDevice(device === compareDevice ? null : device)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 py-6 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                <span className="text-indigo-500">Compute</span> Zone
              </h1>
              <p className="text-gray-400 mt-2">Find nearby computing devices with optimal latency</p>
            </div>
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              <FiList className="text-lg" />
              List View
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filter Bar */}
        <div className="relative">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 mb-8 shadow-lg border border-gray-700">
            <div className="flex flex-col lg:flex-row gap-4 items-center mb-4">
              <div className="relative w-full lg:w-1/4">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search devices..."
                  className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={filters.searchTerm}
                  onChange={handleSearchChange}
                />
              </div>

              <div className="hidden md:flex flex-wrap gap-3 flex-1">
                <select
                  name="deviceType"
                  value={filters.deviceType}
                  onChange={handleFilterChange}
                  className="bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Device Types</option>
                  <option value="CPU">CPU</option>
                  <option value="GPU">GPU</option>
                  <option value="RAM">RAM</option>
                  <option value="Storage">Storage</option>
                  <option value="Full System">Full System</option>
                </select>

                <select
                  name="taskType"
                  value={filters.taskType}
                  onChange={handleFilterChange}
                  className="bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Task Types</option>
                  {commonTaskTypes.map((task) => (
                    <option key={task} value={task}>
                      {task}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">Max Distance:</span>
                  <select
                    value={maxDistance}
                    onChange={(e) => setMaxDistance(Number(e.target.value))}
                    className="bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={10}>10 km</option>
                    <option value={25}>25 km</option>
                    <option value={50}>50 km</option>
                    <option value={100}>100 km</option>
                    <option value={500}>500 km</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                className="md:hidden flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                <FiFilter className="text-sm" />
                Filters
              </button>
            </div>

            {/* Mobile Filter Panel */}
            {isFilterPanelOpen && (
              <div className="md:hidden bg-gray-900 rounded-lg p-4 mb-4 border border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Filters</h3>
                  <button onClick={() => setIsFilterPanelOpen(false)} className="text-gray-400 hover:text-white">
                    <FiX />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Device Type</label>
                    <select
                      name="deviceType"
                      value={filters.deviceType}
                      onChange={handleFilterChange}
                      className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Device Types</option>
                      <option value="CPU">CPU</option>
                      <option value="GPU">GPU</option>
                      <option value="RAM">RAM</option>
                      <option value="Storage">Storage</option>
                      <option value="Full System">Full System</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Task Type</label>
                    <select
                      name="taskType"
                      value={filters.taskType}
                      onChange={handleFilterChange}
                      className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Task Types</option>
                      {commonTaskTypes.map((task) => (
                        <option key={task} value={task}>
                          {task}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Max Distance</label>
                    <select
                      value={maxDistance}
                      onChange={(e) => setMaxDistance(Number(e.target.value))}
                      className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={10}>10 km</option>
                      <option value={25}>25 km</option>
                      <option value={50}>50 km</option>
                      <option value={100}>100 km</option>
                      <option value={500}>500 km</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Price Range</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="minPrice"
                        placeholder="Min"
                        className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={filters.minPrice}
                        onChange={handleFilterChange}
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="number"
                        name="maxPrice"
                        placeholder="Max"
                        className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={filters.maxPrice}
                        onChange={handleFilterChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="hidden md:flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Price Range:</span>
                <input
                  type="number"
                  name="minPrice"
                  placeholder="Min"
                  className="w-24 bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  name="maxPrice"
                  placeholder="Max"
                  className="w-24 bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-2 mr-2">
                  <input
                    type="checkbox"
                    id="showDistances"
                    checked={showDistances}
                    onChange={() => setShowDistances(!showDistances)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <label htmlFor="showDistances" className="text-sm text-gray-300">
                    Show Distances
                  </label>
                </div>

                {userLocation && (
                  <button
                    onClick={centerOnUserLocation}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition"
                  >
                    <FiNavigation className="text-sm" />
                    My Location
                  </button>
                )}

                <button
                  onClick={resetFilters}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-400">
            Showing <span className="text-white font-medium">{filteredDevices.length}</span> devices
            {userLocation && <span className="ml-2">within {maxDistance}km</span>}
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <FiMapPin className="text-indigo-400" />
            <span>Map View</span>
          </div>
        </div>

        {/* Map and Device Details Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <div
              className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-xl"
              style={{ height: "600px" }}
            >
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-full">
                  <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
                    <p>{error}</p>
                  </div>
                </div>
              ) : mapReady ? (
                <MapContainer
                  center={mapCenter}
                  zoom={zoom}
                  style={{ height: "100%", width: "100%" }}
                  zoomControl={false}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapCenterController center={mapCenter} zoom={zoom} />

                  {/* User location marker */}
                  {userLocation && (
                    <Marker position={userLocation} icon={createCustomIcon("#3B82F6")}>
                      <Popup>Your Location</Popup>
                    </Marker>
                  )}

                  {/* Device markers */}
                  {filteredDevices.map(
                    (device) =>
                      device.coordinates &&
                      device.coordinates.lat &&
                      device.coordinates.lng && (
                        <Marker
                          key={device._id}
                          position={[device.coordinates.lat, device.coordinates.lng]}
                          icon={createCustomIcon(
                            getDeviceColor(device.deviceType),
                            selectedDevice && selectedDevice._id === device._id,
                          )}
                          eventHandlers={{
                            click: () => {
                              centerOnDevice(device)
                            },
                          }}
                        >
                          <Popup>
                            <div className="text-black min-w-[200px]">
                              <h3 className="font-bold text-base">{device.deviceName}</h3>
                              <p className="text-xs text-gray-600">{device.deviceType}</p>
                              <p className="text-xs">{device.location}</p>
                              {device.distance && <p className="text-xs text-blue-600">{device.distance} km away</p>}
                              <p className="font-bold mt-1">${device.price.toFixed(2)}/hour</p>
                              <button
                                className="mt-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  centerOnDevice(device)
                                }}
                              >
                                Select Device
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      ),
                  )}

                  {/* Show distance lines if enabled */}
                  {showDistances && selectedDevice && (
                    <DeviceConnections devices={devices} selectedDevice={selectedDevice} userLocation={userLocation} />
                  )}
                </MapContainer>
              ) : null}
            </div>
          </div>

          {/* Device Details Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 h-full shadow-xl">
              {selectedDevice ? (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {getDeviceIcon(selectedDevice.deviceType)}
                    <span className="bg-indigo-900/50 text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded">
                      {selectedDevice.deviceType}
                    </span>
                    {selectedDevice.isAvailable ? (
                      <span className="bg-green-900/50 text-green-300 text-xs font-medium px-2.5 py-0.5 rounded ml-auto">
                        Available
                      </span>
                    ) : (
                      <span className="bg-red-900/50 text-red-300 text-xs font-medium px-2.5 py-0.5 rounded ml-auto">
                        Unavailable
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-semibold text-white mb-3">{selectedDevice.deviceName}</h3>

                  <div className="mb-4">{formatSpecs(selectedDevice.specs)}</div>

                  <div className="space-y-2 text-sm text-gray-400 mb-4">
                    <div className="flex items-center gap-2">
                      <FiMapPin className="text-indigo-400" />
                      <span>{selectedDevice.location}</span>
                    </div>
                    {selectedDevice.distance && (
                      <div>
                        <span className="text-gray-500">Distance from you:</span> {selectedDevice.distance} km
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Performance:</span> {selectedDevice.performance}/100
                    </div>
                  </div>

                  {selectedDevice.acceptedTaskTypes && selectedDevice.acceptedTaskTypes.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Supported Tasks:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedDevice.acceptedTaskTypes.map((task) => (
                          <span key={task} className="bg-violet-900/30 text-violet-300 text-xs px-2 py-1 rounded">
                            {task}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nearby devices section */}
                  {nearbyDevices.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Nearby Devices:</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {nearbyDevices.map((device) => (
                          <div
                            key={device._id}
                            className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2 cursor-pointer hover:bg-gray-700"
                            onClick={() => centerOnDevice(device)}
                          >
                            <div className="flex items-center gap-2">
                              {getDeviceIcon(device.deviceType)}
                              <div>
                                <div className="text-sm font-medium">{device.deviceName}</div>
                                <div className="text-xs text-gray-400">{device.deviceType}</div>
                              </div>
                            </div>
                            <div className="text-xs text-indigo-300">{device.distanceFromSelected.toFixed(1)} km</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-2xl font-bold text-white">
                        ${selectedDevice.price.toFixed(2)}
                        <span className="text-sm font-normal text-gray-400">/hour</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRentDevice(selectedDevice._id)}
                      className={`w-full font-medium py-3 px-4 rounded-lg transition ${
                        selectedDevice.isAvailable
                          ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                          : "bg-gray-700 text-gray-400 cursor-not-allowed"
                      }`}
                      disabled={!selectedDevice.isAvailable || rentLoading}
                    >
                      {rentLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </span>
                      ) : (
                        "Rent This Device"
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiMapPin className="text-3xl text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Select a Device</h3>
                  <p>Click on any marker on the map to view device details and rent it.</p>
                  <div className="mt-6 space-y-2 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Your Location</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      <span>CPU Devices</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span>GPU Devices</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                      <span>Full Systems</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Device List Summary */}
        {filteredDevices.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">Available Devices</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDevices.slice(0, 6).map((device) => (
                <div
                  key={device._id}
                  className={`bg-gray-800 rounded-lg p-4 border cursor-pointer transition transform hover:scale-[1.02] hover:shadow-lg ${
                    selectedDevice?._id === device._id
                      ? "border-indigo-500 bg-indigo-900/20"
                      : "border-gray-700 hover:border-indigo-500"
                  }`}
                  onClick={() => centerOnDevice(device)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getDeviceIcon(device.deviceType)}
                    <span className="font-medium text-white text-sm">{device.deviceName}</span>
                    {device.isAvailable ? (
                      <span className="bg-green-900/50 text-green-300 text-xs px-2 py-0.5 rounded-full ml-auto">
                        Available
                      </span>
                    ) : (
                      <span className="bg-red-900/50 text-red-300 text-xs px-2 py-0.5 rounded-full ml-auto">
                        Unavailable
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">{device.location}</div>
                  {device.distance && (
                    <div className="text-xs text-indigo-300 mb-1">
                      <span className="flex items-center gap-1">
                        <FiNavigation className="text-xs" />
                        {device.distance} km from you
                      </span>
                    </div>
                  )}
                  {selectedDevice &&
                    device._id !== selectedDevice._id &&
                    device.coordinates &&
                    selectedDevice.coordinates && (
                      <div className="text-xs text-violet-300 mb-1">
                        <span className="flex items-center gap-1">
                          <FiArrowRight className="text-xs" />
                          {calculateDistance(
                            selectedDevice.coordinates.lat,
                            selectedDevice.coordinates.lng,
                            device.coordinates.lat,
                            device.coordinates.lng,
                          ).toFixed(1)}{" "}
                          km from selected
                        </span>
                      </div>
                    )}
                  <div className="text-lg font-bold text-white mt-2 flex items-center justify-between">
                    <span>${device.price.toFixed(2)}/hr</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        centerOnDevice(device)
                      }}
                      className="text-xs bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 px-2 py-1 rounded transition"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {filteredDevices.length > 6 && (
              <div className="text-center mt-4">
                <span className="text-gray-400">And {filteredDevices.length - 6} more devices...</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Compute Marketplace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default MapMarketplace