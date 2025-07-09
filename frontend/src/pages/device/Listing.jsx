"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { useAuthStore } from "../../store/authStore"
import toast from "react-hot-toast"
import { Cpu, HardDrive, Monitor, Calendar, Clock, Plus, Minus, Loader2, ChevronRight, Zap, Server } from "lucide-react"

const API_URL = `${import.meta.env.VITE_API_URL}/api/device`

const DeviceListingPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [formData, setFormData] = useState({
    deviceName: "",
    deviceType: "CPU",
    price: "",
    location: "",
    isAvailable: true,
    specs: {},
    acceptedTaskTypes: [],
  })
  const [detectedSpecs, setDetectedSpecs] = useState({})
  const [availabilityHours, setAvailabilityHours] = useState([{ start: "", end: "" }])

  const deviceTypes = ["CPU", "GPU", "RAM", "Storage", "Full System"]
  const taskTypes = [
    "AI Training",
    "3D Rendering",
    "Video Encoding",
    "Data Processing",
    "Gaming",
    "Scientific Computing",
  ]

  useEffect(() => {
    if (!isAuthenticated && !user) {
      toast.error("You must be logged in to list a device")
      navigate("/login")
    }
  }, [isAuthenticated, user, navigate])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })

    if (name === "deviceType") {
      setDetectedSpecs({})
    }
  }

  const handleTaskTypeChange = (taskType) => {
    const updatedTaskTypes = [...formData.acceptedTaskTypes]

    if (updatedTaskTypes.includes(taskType)) {
      const index = updatedTaskTypes.indexOf(taskType)
      updatedTaskTypes.splice(index, 1)
    } else {
      updatedTaskTypes.push(taskType)
    }

    setFormData({ ...formData, acceptedTaskTypes: updatedTaskTypes })
  }

  const handleAvailabilityChange = (index, field, value) => {
    const updatedHours = [...availabilityHours]
    updatedHours[index][field] = value
    setAvailabilityHours(updatedHours)
  }

  const addAvailabilitySlot = () => {
    setAvailabilityHours([...availabilityHours, { start: "", end: "" }])
  }

  const removeAvailabilitySlot = (index) => {
    if (availabilityHours.length > 1) {
      const updatedHours = [...availabilityHours]
      updatedHours.splice(index, 1)
      setAvailabilityHours(updatedHours)
    }
  }

  const detectSpecs = async () => {
    if (!formData.deviceType) {
      toast.error("Please select a device type first")
      return
    }

    setDetecting(true)

    try {
      // Call the backend API with proper error handling
      const response = await axios.post(
        `${API_URL}/detect-specs`,
        {
          deviceType: formData.deviceType,
        },
        {
          withCredentials: true,
        },
      )

      if (response.data && response.data.specs) {
        const specs = response.data.specs
        setDetectedSpecs(specs)
        // Also update form data with the detected specs
        setFormData((prev) => ({
          ...prev,
          specs: specs,
        }))
        toast.success(`${formData.deviceType} specifications detected successfully`)
      } else {
        throw new Error("Invalid response format")
      }
    } catch (error) {
      console.error("Error detecting specs:", error)
      toast.error("Using mock specifications for development")
      // Fall back to mock detection
      mockDetectSpecs(formData.deviceType)
    } finally {
      setDetecting(false)
    }
  }

  // Mock detection for development testing
  const mockDetectSpecs = (deviceType) => {
    let mockSpecs = {}

    switch (deviceType) {
      case "CPU":
        mockSpecs = {
          manufacturer: "Intel",
          brand: "Core",
          model: "i7-12700K",
          cores: "12",
          physicalCores: "8",
          speed: "3.6 GHz",
        }
        break
      case "GPU":
        mockSpecs = {
          manufacturer: "NVIDIA",
          model: "GeForce RTX 3080",
          vram: "10240",
        }
        break
      case "RAM":
        mockSpecs = {
          total: "32",
          type: "DDR4",
          clockSpeed: "3200",
        }
        break
      case "Storage":
        mockSpecs = {
          type: "SSD",
          interface: "NVMe",
          size: "1000",
          vendor: "Samsung",
          model: "980 PRO",
        }
        break
      case "Full System":
        mockSpecs = {
          cpu_brand: "Intel Core i7",
          cpu_cores: "12",
          cpu_speed: "3.6",
          gpu_model: "NVIDIA GeForce RTX 3080",
          gpu_vram: "10240",
          ram_total: "32",
          storage_total: "1000",
          os: "Windows 11 Pro",
        }
        break
      default:
        mockSpecs = {}
    }

    // Update both detectedSpecs state and formData.specs
    setDetectedSpecs(mockSpecs)
    setFormData((prev) => ({
      ...prev,
      specs: mockSpecs,
    }))
    toast.success(`Mock ${deviceType} specifications generated`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Basic validation
    if (!formData.deviceName || !formData.deviceType || !formData.price || !formData.location) {
      toast.error("Please fill in all required fields")
      return
    }

    // Validate availability hours if device is available
    if (formData.isAvailable) {
      const validHours = availabilityHours.filter((slot) => slot.start && slot.end)
      if (validHours.length === 0) {
        toast.error("Please add at least one availability slot if the device is available")
        return
      }

      // Check if any time slots have end time before start time
      for (const slot of validHours) {
        if (new Date(slot.end) <= new Date(slot.start)) {
          toast.error("End time must be after start time in availability slots")
          return
        }
      }
    }

    setLoading(true)

    try {
      // Format availability hours properly
      const formattedHours = formData.isAvailable
        ? availabilityHours
            .filter((slot) => slot.start && slot.end)
            .map((slot) => ({
              start: new Date(slot.start).toISOString(),
              end: new Date(slot.end).toISOString(),
            }))
        : []

      // Ensure specs is a proper object and not empty
      const specs =
        Object.keys(formData.specs).length > 0
          ? formData.specs
          : Object.keys(detectedSpecs).length > 0
            ? detectedSpecs
            : {}

      // Prepare data in the format expected by the backend
      const deviceData = {
        deviceName: formData.deviceName,
        deviceType: formData.deviceType,
        price: Number.parseFloat(formData.price),
        location: formData.location,
        isAvailable: formData.isAvailable,
        availableHours: formattedHours, // Match the schema field name
        acceptedTaskTypes: formData.acceptedTaskTypes,
        specs: specs,
      }

      // Submit to backend API
      const response = await axios.post(API_URL, deviceData, {
        withCredentials: true,
      })

      toast.success("Device listed successfully!")
      navigate("/my-devices")
    } catch (error) {
      console.error("Error listing device:", error)
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Failed to list device"
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const getDeviceIcon = (type) => {
    switch (type) {
      case "CPU":
        return <Cpu className="w-5 h-5" />
      case "GPU":
        return <Monitor className="w-5 h-5" />
      case "RAM":
        return <Server className="w-5 h-5" />
      case "Storage":
        return <HardDrive className="w-5 h-5" />
      case "Full System":
        return <Zap className="w-5 h-5" />
      default:
        return <Cpu className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-indigo-950 text-white p-4 relative overflow-hidden mt-16">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-violet-600/20 blur-3xl -top-20 -left-20"></div>
        <div className="absolute w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl -bottom-20 -right-20"></div>
      </div>

      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:40px_40px]"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-600"></div>

          <div className="p-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-300 to-indigo-300 text-transparent bg-clip-text mb-8">
              List Your Device
            </h1>

            <form onSubmit={handleSubmit}>
              {/* Basic Device Information */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-indigo-300">Basic Information</h2>

                <div className="space-y-5">
                  <div className="relative">
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${formData.deviceName ? "opacity-30" : "opacity-0"}`}
                    ></div>
                    <div className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                      <label className="block text-indigo-200 text-sm font-medium px-4 pt-2">Device Name *</label>
                      <input
                        type="text"
                        id="deviceName"
                        name="deviceName"
                        value={formData.deviceName}
                        onChange={handleChange}
                        className="w-full bg-transparent py-2 px-4 text-white placeholder:text-indigo-200/50 focus:outline-none"
                        placeholder="e.g., My Gaming PC, RTX 3080 GPU"
                        required
                      />
                      <div
                        className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${formData.deviceName ? "scale-x-100" : ""}`}
                      ></div>
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${formData.deviceType ? "opacity-30" : "opacity-0"}`}
                    ></div>
                    <div className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                      <label className="block text-indigo-200 text-sm font-medium px-4 pt-2">Device Type *</label>
                      <div className="flex items-center px-4">
                        <div className="text-indigo-300 mr-2">{getDeviceIcon(formData.deviceType)}</div>
                        <select
                          id="deviceType"
                          name="deviceType"
                          value={formData.deviceType}
                          onChange={handleChange}
                          className="w-full bg-transparent py-2 text-white focus:outline-none"
                          required
                        >
                          {deviceTypes.map((type) => (
                            <option key={type} value={type} className="bg-indigo-950 text-white">
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div
                        className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${formData.deviceType ? "scale-x-100" : ""}`}
                      ></div>
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${formData.price ? "opacity-30" : "opacity-0"}`}
                    ></div>
                    <div className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                      <label className="block text-indigo-200 text-sm font-medium px-4 pt-2">
                        Price per Hour (USD) *
                      </label>
                      <input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="w-full bg-transparent py-2 px-4 text-white placeholder:text-indigo-200/50 focus:outline-none"
                        placeholder="e.g., 5.00"
                        min="0"
                        step="0.01"
                        required
                      />
                      <div
                        className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${formData.price ? "scale-x-100" : ""}`}
                      ></div>
                    </div>
                  </div>

                  <div className="relative">
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-lg opacity-20 blur-sm transition-all duration-300 ${formData.location ? "opacity-30" : "opacity-0"}`}
                    ></div>
                    <div className="relative bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                      <label className="block text-indigo-200 text-sm font-medium px-4 pt-2">Location *</label>
                      <input
                        type="text"
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="w-full bg-transparent py-2 px-4 text-white placeholder:text-indigo-200/50 focus:outline-none"
                        placeholder="e.g., New York, US"
                        required
                      />
                      <div
                        className={`h-0.5 bg-gradient-to-r from-violet-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left ${formData.location ? "scale-x-100" : ""}`}
                      ></div>
                    </div>
                  </div>

                  <div className="relative bg-white/5 border border-white/10 rounded-lg p-4 group hover:bg-white/10 transition-colors duration-300">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          name="isAvailable"
                          checked={formData.isAvailable}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="h-6 w-6 rounded border border-indigo-300/30 bg-white/5 peer-checked:bg-indigo-500 transition-all"></div>
                        <div className="absolute top-1 left-1 h-4 w-4 scale-0 peer-checked:scale-100 transition-transform">
                          <ChevronRight className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <span className="ml-3 text-indigo-200">Device is available for rent</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Hardware Specifications */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-indigo-300">Hardware Specifications</h2>
                  <button
                    type="button"
                    onClick={detectSpecs}
                    disabled={detecting}
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-indigo-900 disabled:opacity-50 transition-all duration-300 relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {detecting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <span>Auto-Detect Specs</span>}
                    </span>
                    <div className="absolute inset-0 bg-white/10 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500"></div>
                  </button>
                </div>

                {Object.keys(detectedSpecs).length > 0 ? (
                  <div className="bg-indigo-900/30 backdrop-blur-sm p-5 rounded-lg border border-indigo-500/20 mb-4">
                    <h3 className="font-medium mb-3 text-indigo-200">Detected Specifications:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(detectedSpecs).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium mr-2 text-indigo-300">{key.replace(/_/g, " ")}:</span>
                          <span className="text-white">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-indigo-200/70 mb-4 bg-indigo-900/20 backdrop-blur-sm p-5 rounded-lg border border-indigo-500/20">
                    Click "Auto-Detect Specs" to automatically detect your device's hardware specifications.
                  </p>
                )}
              </div>

              {/* Availability Schedule */}
              {formData.isAvailable && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-indigo-300">Availability Schedule</h2>

                  {availabilityHours.map((slot, index) => (
                    <div
                      key={index}
                      className="mb-4 bg-white/5 border border-white/10 rounded-lg p-4 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-indigo-600/5 rounded-lg opacity-20 blur-sm"></div>
                      <div className="relative z-10">
                        <div className="flex flex-wrap -mx-2">
                          <div className="w-full sm:w-5/12 px-2 mb-3 sm:mb-0">
                            <label className="block text-indigo-200 text-sm font-medium mb-2 flex items-center">
                              <Calendar className="w-4 h-4 mr-2" /> Start Time
                            </label>
                            <input
                              type="datetime-local"
                              value={slot.start}
                              onChange={(e) => handleAvailabilityChange(index, "start", e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 border border-indigo-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
                              required={formData.isAvailable}
                            />
                          </div>
                          <div className="w-full sm:w-5/12 px-2 mb-3 sm:mb-0">
                            <label className="block text-indigo-200 text-sm font-medium mb-2 flex items-center">
                              <Clock className="w-4 h-4 mr-2" /> End Time
                            </label>
                            <input
                              type="datetime-local"
                              value={slot.end}
                              onChange={(e) => handleAvailabilityChange(index, "end", e.target.value)}
                              className="w-full px-3 py-2 bg-white/5 border border-indigo-500/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white"
                              required={formData.isAvailable}
                            />
                          </div>
                          <div className="w-full sm:w-2/12 px-2 flex items-end justify-center">
                            <button
                              type="button"
                              onClick={() => removeAvailabilitySlot(index)}
                              className="px-3 py-2 text-red-400 hover:text-red-300 focus:outline-none transition-colors duration-300 bg-red-900/20 rounded-lg border border-red-500/30 flex items-center justify-center"
                              disabled={availabilityHours.length <= 1}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addAvailabilitySlot}
                    className="mt-2 flex items-center text-indigo-400 hover:text-indigo-300 focus:outline-none transition-colors duration-300 bg-indigo-900/30 px-4 py-2 rounded-lg border border-indigo-500/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Time Slot
                  </button>
                </div>
              )}

              {/* Accepted Task Types */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-indigo-300">Accepted Task Types</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/5 border border-white/10 rounded-lg p-5">
                  {taskTypes.map((taskType) => (
                    <label key={taskType} className="flex items-center cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.acceptedTaskTypes.includes(taskType)}
                          onChange={() => handleTaskTypeChange(taskType)}
                          className="sr-only peer"
                        />
                        <div className="h-5 w-5 rounded border border-indigo-300/30 bg-white/5 peer-checked:bg-indigo-500 transition-all"></div>
                        <div className="absolute top-1 left-1 h-3 w-3 scale-0 peer-checked:scale-100 transition-transform">
                          <ChevronRight className="h-3 w-3 text-white" />
                        </div>
                      </div>
                      <span className="ml-3 text-indigo-200 group-hover:text-white transition-colors duration-300">
                        {taskType}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-indigo-900 disabled:opacity-50 transition-all duration-300 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <span className="flex items-center justify-center space-x-2">
                        <span>List Device</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/10 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500"></div>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeviceListingPage
