import React, { useState, useEffect, useRef } from "react"
import axios from "axios"
import ReactApexChart from "react-apexcharts"
import { CheckCircle, FileText, ArrowUp, ArrowDown, Minus, Loader } from "lucide-react"

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:3000'
axios.defaults.headers.common['Content-Type'] = 'application/json'
axios.defaults.withCredentials = true

// Main App Component
function IdeateAI() {
  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [activity, setActivity] = useState(null)

  // Form state
  const [projectDescription, setProjectDescription] = useState("")
  const [teamSize, setTeamSize] = useState("medium")
  const [timeline, setTimeline] = useState("medium")
  const [complexity, setComplexity] = useState("medium")

  // Refs for charts
  const timelineChartRef = useRef(null)
  const phaseChartRef = useRef(null)
  const activityChartRef = useRef(null)
  const riskMatrixRef = useRef(null)

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!projectDescription) {
      alert("Please enter a project description")
      return
    }

    setLoading(true)
    setDashboardData(null)

    try {
      const response = await axios.post("/generate", {
        projectDescription,
        teamSize,
        timeline,
        complexity,
      })

      setDashboardData(response.data)

      // Fetch initial metrics and activity
      fetchMetrics()
      fetchActivity()
    } catch (error) {
      console.error("Error:", error)
      alert("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Fetch metrics data
  const fetchMetrics = async () => {
    try {
      const response = await axios.get("/metrics")
      setMetrics(response.data)
    } catch (error) {
      console.error("Error fetching metrics:", error)
    }
  }

  // Fetch activity data
  const fetchActivity = async () => {
    try {
      const response = await axios.get("/activity")
      setActivity(response.data)
    } catch (error) {
      console.error("Error fetching activity:", error)
    }
  }

  // Set up polling for real-time updates
  useEffect(() => {
    if (dashboardData) {
      const metricsInterval = setInterval(fetchMetrics, 5000)
      const activityInterval = setInterval(fetchActivity, 5000)

      return () => {
        clearInterval(metricsInterval)
        clearInterval(activityInterval)
      }
    }
  }, [dashboardData])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
            Advanced Project Dashboard
          </h1>
          <p className="text-gray-400">Generate comprehensive project insights and visualizations</p>
        </header>

        {/* Project Input Form */}
        <div className="bg-[#111111] bg-opacity-80 backdrop-blur-md border border-white border-opacity-10 rounded-xl p-8 mb-12 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Project Description</label>
              <textarea
                rows="4"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your project, its goals, and key requirements..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Team Size</label>
                <select
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                >
                  <option value="small">Small (1-5)</option>
                  <option value="medium">Medium (6-15)</option>
                  <option value="large">Large (16+)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Timeline</label>
                <select
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                >
                  <option value="short">Short (1-3 months)</option>
                  <option value="medium">Medium (3-6 months)</option>
                  <option value="long">Long (6+ months)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Complexity</label>
                <select
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg"
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Dashboard"}
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500">
              <Loader className="h-12 w-12 text-blue-500" />
            </div>
            <p className="mt-4 text-gray-400">Generating your advanced dashboard...</p>
          </div>
        )}

        {/* Dashboard Content */}
        {dashboardData && !loading && (
          <div className="space-y-8">
            {/* Project Overview */}
            <DashboardCard title="Project Overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Project Summary</h3>
                  <div className="prose prose-invert" dangerouslySetInnerHTML={{ __html: dashboardData.summary }} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4">Project Visualization</h3>
                  <div className="rounded-lg overflow-hidden">
                    <img
                      className="w-full h-64 object-cover"
                      src={dashboardData.visualization || "/placeholder.svg"}
                      alt="Project Visualization"
                    />
                  </div>
                </div>
              </div>
            </DashboardCard>

            {/* Tech Stack */}
            <DashboardCard title="Technology Stack">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {dashboardData.techStack &&
                  Object.keys(dashboardData.techStack).map((category) => (
                    <div key={category} className="bg-black bg-opacity-5 backdrop-blur-md p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 capitalize">{category}</h3>
                      <div className="space-y-3">
                        {dashboardData.techStack[category].map((tech, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <img
                              src={tech.icon || "/placeholder.svg"}
                              alt={tech.name}
                              className="w-8 h-8 transition-transform duration-300 hover:scale-110"
                            />
                            <span>{tech.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </DashboardCard>

            {/* Development Timeline */}
            <DashboardCard title="Development Timeline">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Timeline Overview</h3>
                  {dashboardData.phases && <TimelineChart phases={dashboardData.phases} ref={timelineChartRef} />}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4">Phase Distribution</h3>
                  {dashboardData.phases && <PhaseDistributionChart phases={dashboardData.phases} ref={phaseChartRef} />}
                </div>
              </div>
            </DashboardCard>

            {/* Development Phases */}
            <DashboardCard title="Development Phases">
              <div className="space-y-6">
                {dashboardData.phases &&
                  dashboardData.phases.map((phase, index) => <PhaseCard key={index} phase={phase} index={index} />)}
              </div>
            </DashboardCard>

            {/* Real-time Metrics */}
            {metrics && (
              <DashboardCard title="Real-time Metrics">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <MetricCard
                    title="Code Quality"
                    value={metrics.code_quality?.value || 0}
                    color="blue"
                    suffix="%"
                    trend={metrics.code_quality?.trend}
                  />
                  <MetricCard
                    title="Test Coverage"
                    value={metrics.test_coverage?.value || 0}
                    color="green"
                    suffix="%"
                    trend={metrics.test_coverage?.trend}
                  />
                  <MetricCard
                    title="Build Success"
                    value={metrics.build_success?.value || 0}
                    color="purple"
                    suffix="%"
                    trend={metrics.build_success?.trend}
                  />
                  <MetricCard
                    title="Deployment Frequency"
                    value={metrics.deployment_frequency?.value || 0}
                    color="yellow"
                    trend={metrics.deployment_frequency?.trend}
                  />
                </div>
              </DashboardCard>
            )}

            {/* Activity Timeline */}
            {activity && (
              <DashboardCard title="Activity Timeline">
                <ActivityChart data={activity} ref={activityChartRef} />
              </DashboardCard>
            )}

            {/* Risk Assessment */}
            <DashboardCard title="Risk Assessment">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">Risk Matrix</h3>
                  {dashboardData.risks && <RiskMatrixChart risks={dashboardData.risks} ref={riskMatrixRef} />}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4">Risk Details</h3>
                  <div className="space-y-4">
                    {dashboardData.risks &&
                      dashboardData.risks.map((risk, index) => <RiskCard key={index} risk={risk} />)}
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>
        )}
      </div>
    </div>
  )
}

// Dashboard Card Component
const DashboardCard = ({ title, children }) => {
  return (
    <div className="bg-[#111111] bg-opacity-80 backdrop-blur-md border border-white border-opacity-10 rounded-xl p-8 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
        {title}
      </h2>
      {children}
    </div>
  )
}

// Phase Card Component
const PhaseCard = ({ phase, index }) => {
  return (
    <div className="bg-black bg-opacity-5 backdrop-blur-md p-6 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">
          {index + 1}. {phase.name}
        </h3>
        <span className="px-3 py-1 bg-blue-500 bg-opacity-20 text-blue-300 rounded-full">{phase.duration} weeks</span>
      </div>
      <p className="text-gray-300 mb-4">{phase.description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Key Tasks</h4>
          <ul className="space-y-2">
            {phase.tasks.map((task, i) => (
              <li key={i} className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-2">Deliverables</h4>
          <ul className="space-y-2">
            {phase.deliverables.map((deliverable, i) => (
              <li key={i} className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>{deliverable}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// Risk Card Component
const RiskCard = ({ risk }) => {
  const getLevelColor = (level) => {
    switch (level) {
      case "High":
        return "bg-red-500 bg-opacity-20 text-red-300"
      case "Medium":
        return "bg-yellow-500 bg-opacity-20 text-yellow-300"
      default:
        return "bg-green-500 bg-opacity-20 text-green-300"
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "increasing":
        return <ArrowUp className="h-4 w-4 text-red-400" />
      case "decreasing":
        return <ArrowDown className="h-4 w-4 text-green-400" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  return (
    <div className="bg-black bg-opacity-5 backdrop-blur-md p-4 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">{risk.name}</h4>
        <span className={`px-2 py-1 rounded-full ${getLevelColor(risk.level)}`}>{risk.level}</span>
      </div>
      <p className="text-gray-300 text-sm mb-2">{risk.mitigation}</p>
      {risk.trend && (
        <div className="flex items-center text-xs text-gray-400">
          <span className="mr-1">Trend:</span>
          {getTrendIcon(risk.trend)}
          <span className="ml-1 capitalize">{risk.trend}</span>
          {risk.status && <span className="ml-3 px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{risk.status}</span>}
        </div>
      )}
    </div>
  )
}

// Metric Card Component
const MetricCard = ({ title, value, color, suffix = "", trend }) => {
  const getCircleColor = (color) => {
    switch (color) {
      case "blue":
        return "text-blue-500"
      case "green":
        return "text-green-500"
      case "purple":
        return "text-purple-500"
      case "yellow":
        return "text-yellow-500"
      default:
        return "text-blue-500"
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return <ArrowUp className="h-4 w-4 text-green-400" />
      case "down":
        return <ArrowDown className="h-4 w-4 text-red-400" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  // Calculate stroke-dashoffset for the progress ring
  const radius = 52
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="bg-black bg-opacity-5 backdrop-blur-md p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full">
            <circle
              className="text-gray-700"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="64"
              cy="64"
            />
            <circle
              className={`${getCircleColor(color)}`}
              strokeWidth="8"
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="64"
              cy="64"
              style={{
                strokeDasharray: `${circumference} ${circumference}`,
                strokeDashoffset: offset,
                transform: "rotate(-90deg)",
                transformOrigin: "center",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">
              {value}
              {suffix}
            </span>
            {trend && <div className="flex items-center mt-1">{getTrendIcon(trend)}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

// Timeline Chart Component
const TimelineChart = React.forwardRef(({ phases }, ref) => {
  const options = {
    chart: {
      type: "bar",
      height: 350,
      toolbar: {
        show: false,
      },
      background: "transparent",
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    xaxis: {
      categories: phases.map((phase) => phase.name),
      labels: {
        style: {
          colors: "#ffffff",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#ffffff",
        },
      },
    },
    grid: {
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    colors: ["#3b82f6"],
  }

  const series = [
    {
      name: "Duration",
      data: phases.map((phase) => phase.duration),
    },
  ]

  return (
    <div ref={ref} className="h-64">
      <ReactApexChart options={options} series={series} type="bar" height={350} />
    </div>
  )
})

// Phase Distribution Chart Component
const PhaseDistributionChart = React.forwardRef(({ phases }, ref) => {
  const options = {
    chart: {
      type: "donut",
      height: 350,
      background: "transparent",
    },
    labels: phases.map((phase) => phase.name),
    colors: ["#3b82f6", "#ef4444", "#10b981", "#8b5cf6", "#f59e0b"],
    legend: {
      labels: {
        colors: "#ffffff",
      },
    },
  }

  const series = phases.map((phase) => phase.duration)

  return (
    <div ref={ref} className="h-64">
      <ReactApexChart options={options} series={series} type="donut" height={350} />
    </div>
  )
})

// Activity Chart Component
const ActivityChart = React.forwardRef(({ data }, ref) => {
  const options = {
    chart: {
      type: "area",
      height: 350,
      toolbar: {
        show: false,
      },
      background: "transparent",
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    xaxis: {
      categories: data.days,
      labels: {
        style: {
          colors: "#ffffff",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#ffffff",
        },
      },
    },
    tooltip: {
      theme: "dark",
    },
    grid: {
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    colors: ["#3b82f6", "#ef4444", "#10b981", "#8b5cf6"],
  }

  const series = [
    {
      name: "Commits",
      data: data.commits,
    },
    {
      name: "Issues",
      data: data.issues,
    },
    {
      name: "Pull Requests",
      data: data.pull_requests,
    },
    {
      name: "Deployments",
      data: data.deployments,
    },
  ]

  return (
    <div ref={ref} className="h-96">
      <ReactApexChart options={options} series={series} type="area" height={350} />
    </div>
  )
})

// Risk Matrix Chart Component
const RiskMatrixChart = React.forwardRef(({ risks }, ref) => {
  const options = {
    chart: {
      type: "scatter",
      height: 350,
      background: "transparent",
    },
    xaxis: {
      title: {
        text: "Probability",
        style: {
          color: "#ffffff",
        },
      },
      labels: {
        style: {
          colors: "#ffffff",
        },
      },
    },
    yaxis: {
      title: {
        text: "Impact",
        style: {
          color: "#ffffff",
        },
      },
      labels: {
        style: {
          colors: "#ffffff",
        },
      },
    },
    grid: {
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    colors: ["#ef4444", "#f59e0b", "#10b981"],
    markers: {
      size: [8, 10, 12],
      strokeWidth: 0,
    },
    tooltip: {
      theme: "dark",
      custom: ({ series, seriesIndex, dataPointIndex, w }) => {
        const risk = risks[dataPointIndex]
        return `
          <div class="p-2">
            <div class="font-bold">${risk.name}</div>
            <div>Impact: ${risk.impact}</div>
            <div>Probability: ${risk.probability}</div>
            <div>Level: ${risk.level}</div>
          </div>
        `
      },
    },
  }

  // Group risks by level for different colors
  const highRisks = risks.filter((r) => r.level === "High").map((r) => ({ x: r.probability, y: r.impact }))
  const mediumRisks = risks.filter((r) => r.level === "Medium").map((r) => ({ x: r.probability, y: r.impact }))
  const lowRisks = risks.filter((r) => r.level === "Low").map((r) => ({ x: r.probability, y: r.impact }))

  const series = [
    { name: "High", data: highRisks },
    { name: "Medium", data: mediumRisks },
    { name: "Low", data: lowRisks },
  ]

  return (
    <div ref={ref} className="h-64">
      <ReactApexChart options={options} series={series} type="scatter" height={350} />
    </div>
  )
})

export default IdeateAI
