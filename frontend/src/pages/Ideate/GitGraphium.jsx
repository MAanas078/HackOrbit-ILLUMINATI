"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import * as THREE from "three"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text, Line, Html, Environment, RoundedBox, Billboard, Trail } from "@react-three/drei"
import { XR, useXR, Interactive } from "@react-three/xr"
import {
  Search,
  GitHub,
  Psychology as Brain,
  Visibility as Eye,
  Code,
  Folder,
  Description as FileText,
  ViewInAr as Vr,
  ThreeDRotation as Glasses,
  Laptop,
  ChevronRight,
  Info,
  RestartAlt as RotateCcw,
  Fullscreen as Maximize,
  PhoneAndroid as MobileIcon,
} from "@mui/icons-material"
import {
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  Box,
  Chip,
  Tooltip,
  CircularProgress,
  Typography,
  TextField,
  InputAdornment,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  ThemeProvider,
  createTheme,
  Alert,
  Snackbar,
} from "@mui/material"
import { motion, AnimatePresence } from "framer-motion"

// Create a dark theme for MUI
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#9c27b0",
    },
    secondary: {
      main: "#2196f3",
    },
    background: {
      paper: "#1e1e2f",
      default: "#121212",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: "#1e1e2f",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
})

// Repository structure parser
const parseRepoStructure = async (repoUrl) => {
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) throw new Error("Invalid GitHub URL")

    const [, owner, repo] = match
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`

    const response = await fetch(apiUrl)
    if (!response.ok) throw new Error("Failed to fetch repository")

    const data = await response.json()
    return buildTree(data.tree)
  } catch (error) {
    console.error("Error parsing repository:", error)
    throw error
  }
}

const buildTree = (files) => {
  const root = { name: "root", type: "tree", children: [], path: "" }

  files.forEach((file) => {
    const pathParts = file.path.split("/")
    let current = root

    pathParts.forEach((part, index) => {
      const isLast = index === pathParts.length - 1
      let child = current.children.find((c) => c.name === part)

      if (!child) {
        child = {
          name: part,
          type: isLast ? file.type : "tree",
          children: [],
          path: pathParts.slice(0, index + 1).join("/"),
          sha: isLast ? file.sha : null,
          size: isLast ? file.size : null,
        }
        current.children.push(child)
      }

      current = child
    })
  })

  return root
}

// Device detection
const isMobileDevice = () => {
  return (
    typeof navigator !== "undefined" &&
    (navigator.userAgent.match(/Android/i) ||
      navigator.userAgent.match(/webOS/i) ||
      navigator.userAgent.match(/iPhone/i) ||
      navigator.userAgent.match(/iPad/i) ||
      navigator.userAgent.match(/iPod/i) ||
      navigator.userAgent.match(/BlackBerry/i) ||
      navigator.userAgent.match(/Windows Phone/i))
  )
}

// VR Pointer Ray - Only used inside XR context
const VRPointer = () => {
  const { controllers, isPresenting } = useXR()

  if (!isPresenting) return null

  return controllers.map((controller) => (
    <mesh key={controller.controller.uuid} position={[0, 0, 0]}>
      <Trail
        width={0.05}
        color="white"
        length={5}
        decay={1}
        local={false}
        stride={0}
        interval={1}
        attenuation={(width) => width}
      >
        <mesh position={[0, 0, -10]} visible={false}>
          <sphereGeometry args={[0.01]} />
          <meshBasicMaterial color="white" />
        </mesh>
      </Trail>
    </mesh>
  ))
}

// 3D Node Component
const Node = ({ node, position, onNodeClick, isSelected, level = 0, isVR = false, isPresenting = false }) => {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
      if (hovered) {
        meshRef.current.scale.setScalar(1.2)
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
      }
    }
  })

  const getNodeColor = () => {
    if (isSelected) return "#ff6b6b"
    if (hovered) return "#4ecdc4"
    if (node.type === "tree") return "#74b9ff"
    const ext = node.name.split(".").pop()?.toLowerCase()
    const colorMap = {
      js: "#f7df1e",
      jsx: "#61dafb",
      ts: "#3178c6",
      tsx: "#3178c6",
      py: "#3776ab",
      html: "#e34f26",
      css: "#1572b6",
      json: "#000000",
      md: "#083fa1",
      txt: "#ffffff",
    }
    return colorMap[ext] || "#95a5a6"
  }

  const getNodeSize = () => {
    if (node.type === "tree") return 0.8
    return Math.min(0.6, Math.max(0.3, (node.size || 1000) / 10000))
  }

  const nodeComponent = isVR ? (
    <Interactive onSelect={() => onNodeClick(node)}>
      <group position={position}>
        <mesh
          ref={meshRef}
          onClick={() => !isPresenting && onNodeClick(node)}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          {node.type === "tree" ? (
            <octahedronGeometry args={[getNodeSize(), 0]} />
          ) : (
            <sphereGeometry args={[getNodeSize(), 16, 16]} />
          )}
          <meshPhongMaterial
            color={getNodeColor()}
            transparent
            opacity={0.8}
            emissive={getNodeColor()}
            emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : 0.1}
          />
        </mesh>

        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          <Text
            position={[0, getNodeSize() + 0.5, 0]}
            fontSize={0.3}
            color={hovered || isSelected ? "#ffffff" : "#cccccc"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {node.name}
          </Text>
        </Billboard>

        {isSelected && (
          <Billboard follow={true}>
            <RoundedBox
              position={[0, getNodeSize() + 1.2, 0]}
              args={[node.name.length * 0.2 + 1, 1.2, 0.1]}
              radius={0.1}
              smoothness={4}
            >
              <meshBasicMaterial color="#111827" transparent opacity={0.8} />
              <Html position={[0, 0, 0.06]} transform occlude>
                <div
                  style={{
                    backgroundColor: "transparent",
                    color: "white",
                    fontSize: "12px",
                    padding: "8px",
                    width: "192px",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{node.name}</div>
                  <div style={{ color: "#d1d5db" }}>Type: {node.type}</div>
                  {node.size && <div style={{ color: "#d1d5db" }}>Size: {node.size} bytes</div>}
                </div>
              </Html>
            </RoundedBox>
          </Billboard>
        )}
      </group>
    </Interactive>
  ) : (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => onNodeClick(node)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {node.type === "tree" ? (
          <octahedronGeometry args={[getNodeSize(), 0]} />
        ) : (
          <sphereGeometry args={[getNodeSize(), 16, 16]} />
        )}
        <meshPhongMaterial
          color={getNodeColor()}
          transparent
          opacity={0.8}
          emissive={getNodeColor()}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : 0.1}
        />
      </mesh>

      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <Text
          position={[0, getNodeSize() + 0.5, 0]}
          fontSize={0.3}
          color={hovered || isSelected ? "#ffffff" : "#cccccc"}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {node.name}
        </Text>
      </Billboard>

      {isSelected && (
        <Billboard follow={true}>
          <RoundedBox
            position={[0, getNodeSize() + 1.2, 0]}
            args={[node.name.length * 0.2 + 1, 1.2, 0.1]}
            radius={0.1}
            smoothness={4}
          >
            <meshBasicMaterial color="#111827" transparent opacity={0.8} />
            <Html position={[0, 0, 0.06]} transform occlude>
              <div
                style={{
                  backgroundColor: "transparent",
                  color: "white",
                  fontSize: "12px",
                  padding: "8px",
                  width: "192px",
                  pointerEvents: "none",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{node.name}</div>
                <div style={{ color: "#d1d5db" }}>Type: {node.type}</div>
                {node.size && <div style={{ color: "#d1d5db" }}>Size: {node.size} bytes</div>}
              </div>
            </Html>
          </RoundedBox>
        </Billboard>
      )}
    </group>
  )

  return nodeComponent
}

// 3D Tree Component
const Tree3D = ({ treeData, onNodeClick, selectedNode, isVR = false, isPresenting = false }) => {
  const { camera } = useThree()
  const [nodes, setNodes] = useState([])
  const [connections, setConnections] = useState([])

  useEffect(() => {
    if (!treeData) return

    const nodePositions = new Map()
    const nodeList = []
    const connectionList = []

    const positionNodes = (node, depth = 0, parentPos = [0, 0, 0], siblingIndex = 0, totalSiblings = 1) => {
      const radius = Math.max(5, depth * 3)
      const angleStep = (Math.PI * 2) / Math.max(totalSiblings, 1)
      const angle = angleStep * siblingIndex

      const x = parentPos[0] + Math.cos(angle) * radius
      const y = parentPos[1] - depth * 2
      const z = parentPos[2] + Math.sin(angle) * radius

      const position = [x, y, z]
      nodePositions.set(node, position)
      nodeList.push({ node, position })

      if (depth > 0) {
        connectionList.push({
          start: parentPos,
          end: position,
        })
      }

      if (node.children && node.children.length > 0) {
        node.children.forEach((child, index) => {
          positionNodes(child, depth + 1, position, index, node.children.length)
        })
      }
    }

    positionNodes(treeData)
    setNodes(nodeList)
    setConnections(connectionList)
  }, [treeData])

  const focusOnNode = (nodePosition) => {
    if (!isPresenting) {
      camera.position.set(nodePosition[0] + 5, nodePosition[1] + 3, nodePosition[2] + 5)
      camera.lookAt(nodePosition[0], nodePosition[1], nodePosition[2])
    }
  }

  const handleNodeClick = (node) => {
    const nodeData = nodes.find((n) => n.node === node)
    if (nodeData) {
      focusOnNode(nodeData.position)
    }
    onNodeClick(node)
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {connections.map((connection, index) => (
        <Line
          key={index}
          points={[connection.start, connection.end]}
          color="#555555"
          lineWidth={2}
          transparent
          opacity={0.6}
        />
      ))}

      {nodes.map(({ node, position }, index) => (
        <Node
          key={`${node.path}-${index}`}
          node={node}
          position={position}
          onNodeClick={handleNodeClick}
          isSelected={selectedNode === node}
          isVR={isVR}
          isPresenting={isPresenting}
        />
      ))}
    </>
  )
}

// XR Tree Wrapper - This component handles the XR context
const XRTreeWrapper = ({ treeData, onNodeClick, selectedNode, mode }) => {
  const { isPresenting } = useXR()

  return (
    <>
      <Tree3D
        treeData={treeData}
        onNodeClick={onNodeClick}
        selectedNode={selectedNode}
        isVR={true}
        isPresenting={isPresenting}
      />
      <Environment preset="city" />
      {mode === "VR" && <VRPointer />}
    </>
  )
}

// AI Analysis Component
const AIAnalysis = ({ selectedNode, repoUrl }) => {
  const [analysis, setAnalysis] = useState("")
  const [loading, setLoading] = useState(false)

  const analyzeFile = async (node) => {
    if (!node || node.type === "tree") return

    setLoading(true)
    try {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) throw new Error("Invalid repo URL")

      const [, owner, repo] = match
      const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${node.path}`

      const response = await fetch(fileUrl)
      const data = await response.json()

      if (data.content) {
        const content = atob(data.content)

        // Simulate AI analysis (replace with actual Gemini/Groq API call)
        const mockAnalysis = generateMockAnalysis(node, content)
        setAnalysis(mockAnalysis)
      }
    } catch (error) {
      console.error("Error analyzing file:", error)
      setAnalysis("Error analyzing file content.")
    } finally {
      setLoading(false)
    }
  }

  const generateMockAnalysis = (node, content) => {
    const lines = content.split("\n").length
    const size = content.length
    const ext = node.name.split(".").pop()?.toLowerCase()

    let analysis = `📁 File: ${node.name}\n`
    analysis += `📊 Size: ${size} bytes, ${lines} lines\n`
    analysis += `🏷️ Type: ${ext || "unknown"}\n\n`

    if (ext === "js" || ext === "jsx" || ext === "ts" || ext === "tsx") {
      analysis += `🔍 Analysis: This appears to be a ${ext.toUpperCase()} file. `
      if (content.includes("import React")) {
        analysis += "It's a React component with JSX syntax. "
      }
      if (content.includes("function") || content.includes("=>")) {
        analysis += "Contains function definitions. "
      }
      if (content.includes("export")) {
        analysis += "Exports modules for use in other files."
      }
    } else if (ext === "py") {
      analysis += `🐍 Python file detected. `
      if (content.includes("def ")) {
        analysis += "Contains function definitions. "
      }
      if (content.includes("class ")) {
        analysis += "Defines classes. "
      }
    } else if (ext === "md") {
      analysis += `📖 Markdown documentation file. Contains formatted text and documentation.`
    } else if (ext === "json") {
      analysis += `⚙️ JSON configuration or data file.`
    } else {
      analysis += `📄 Text-based file with ${lines} lines of content.`
    }

    return analysis
  }

  useEffect(() => {
    if (selectedNode) {
      analyzeFile(selectedNode)
    }
  }, [selectedNode, repoUrl])

  if (!selectedNode) {
    return (
      <Card elevation={3}>
        <CardContent sx={{ textAlign: "center", py: 4 }}>
          <Eye sx={{ width: 48, height: 48, color: "text.disabled", mb: 2 }} />
          <Typography color="text.secondary">Select a node to view AI analysis</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Brain sx={{ color: "#bb86fc", width: 20, height: 20 }} />
          <Typography variant="subtitle1" fontWeight="medium">
            AI Analysis
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
            <CircularProgress size={16} />
            <Typography variant="body2">Analyzing content...</Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ whiteSpace: "pre-line", color: "text.secondary" }}>
            {analysis}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

// VR Mode Instructions
const VRInstructions = ({ isVisible, onClose }) => {
  if (!isVisible) return null

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.8)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%" }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight="bold" mb={2}>
            VR Mode Instructions
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <ChevronRight sx={{ color: "#bb86fc" }} />
              </ListItemIcon>
              <ListItemText primary="Use your VR controllers to point at nodes" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ChevronRight sx={{ color: "#bb86fc" }} />
              </ListItemIcon>
              <ListItemText primary="Press the trigger button to select a node" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ChevronRight sx={{ color: "#bb86fc" }} />
              </ListItemIcon>
              <ListItemText primary="Move around the space to explore the repository structure" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ChevronRight sx={{ color: "#bb86fc" }} />
              </ListItemIcon>
              <ListItemText primary="Look at node labels to see file/folder information" />
            </ListItem>
          </List>
          <Alert severity="info" sx={{ mb: 2 }}>
            Note: VR mode requires a compatible VR headset or mobile device with WebXR support.
          </Alert>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" color="primary" fullWidth onClick={onClose}>
              Close
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

// AR Mode Instructions
const ARInstructions = ({ isVisible, onClose }) => {
  if (!isVisible) return null

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0,0,0,0.8)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%" }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight="bold" mb={2}>
            AR Mode Instructions
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <ChevronRight sx={{ color: "#bb86fc" }} />
              </ListItemIcon>
              <ListItemText primary="Point your camera at a flat surface" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ChevronRight sx={{ color: "#bb86fc" }} />
              </ListItemIcon>
              <ListItemText primary="Tap to place the repository visualization" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ChevronRight sx={{ color: "#bb86fc" }} />
              </ListItemIcon>
              <ListItemText primary="Move around to view from different angles" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ChevronRight sx={{ color: "#bb86fc" }} />
              </ListItemIcon>
              <ListItemText primary="Tap on nodes to select and view details" />
            </ListItem>
          </List>
          <Alert severity="info" sx={{ mb: 2 }}>
            Note: AR mode requires a device with AR capabilities and WebXR support.
          </Alert>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" color="primary" fullWidth onClick={onClose}>
              Close
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

// Check WebXR Support
const checkXRSupport = async (mode) => {
  if (typeof navigator === "undefined" || !navigator.xr) {
    return false
  }

  try {
    return await navigator.xr.isSessionSupported(mode)
  } catch (error) {
    console.error(`Error checking ${mode} support:`, error)
    return false
  }
}

// Debug XR Session
const debugXRSession = async (mode) => {
  console.log(`Attempting to start ${mode} session...`)

  if (typeof navigator === "undefined" || !navigator.xr) {
    console.error("WebXR API not available")
    return { success: false, message: "WebXR API not available on this device/browser" }
  }

  try {
    const isSupported = await navigator.xr.isSessionSupported(mode)
    console.log(`${mode} supported:`, isSupported)

    if (!isSupported) {
      return {
        success: false,
        message: `${mode} mode is not supported on this device/browser`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error(`Error checking ${mode} support:`, error)
    return {
      success: false,
      message: `Error checking ${mode} support: ${error.message}`,
    }
  }
}

// Main Component
const GitHubVisualizer = () => {
  const [repoUrl, setRepoUrl] = useState("")
  const [treeData, setTreeData] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [viewMode, setViewMode] = useState("3d")
  const [showVRInstructions, setShowVRInstructions] = useState(false)
  const [showARInstructions, setShowARInstructions] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [vrSupported, setVrSupported] = useState(false)
  const [arSupported, setArSupported] = useState(false)
  const [showXRAlert, setShowXRAlert] = useState(false)
  const [xrAlertMessage, setXRAlertMessage] = useState("")
  const [isMobile, setIsMobile] = useState(false)
  const [xrSessionActive, setXrSessionActive] = useState(false)
  const [debugInfo, setDebugInfo] = useState("")
  const canvasRef = useRef(null)
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"))

  // Check device type and XR support on component mount
  useEffect(() => {
    const checkDeviceAndSupport = async () => {
      const mobile = isMobileDevice()
      setIsMobile(mobile)
      console.log("Device detected as:", mobile ? "Mobile" : "Desktop")

      try {
        const vrSupport = await checkXRSupport("immersive-vr")
        const arSupport = await checkXRSupport("immersive-ar")
        console.log("VR supported:", vrSupport)
        console.log("AR supported:", arSupport)
        setVrSupported(vrSupport)
        setArSupported(arSupport)
      } catch (error) {
        console.error("Error checking XR support:", error)
      }
    }

    checkDeviceAndSupport()
  }, [])

  const handleVisualize = async () => {
    if (!repoUrl.trim()) return

    setLoading(true)
    setError("")
    setTreeData(null)
    setSelectedNode(null)

    try {
      const data = await parseRepoStructure(repoUrl)
      setTreeData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleNodeClick = (node) => {
    setSelectedNode(node)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      canvasRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const handleTabChange = async (event, newValue) => {
    if (newValue === "vr") {
      const result = await debugXRSession("immersive-vr")
      if (!result.success) {
        setXRAlertMessage(result.message)
        setShowXRAlert(true)
        return
      }
    }

    if (newValue === "ar") {
      const result = await debugXRSession("immersive-ar")
      if (!result.success) {
        setXRAlertMessage(result.message)
        setShowXRAlert(true)
        return
      }
    }

    setViewMode(newValue)
    if (newValue === "vr") {
      setShowVRInstructions(true)
    } else if (newValue === "ar") {
      setShowARInstructions(true)
    }
  }

  // Handle XR Session Start
  const handleXRSessionStart = async (mode) => {
    try {
      setDebugInfo(`Starting ${mode} session...`)
      console.log(`Starting ${mode} session...`)

      if (!navigator.xr) {
        throw new Error("WebXR not supported in this browser")
      }

      const isSupported = await navigator.xr.isSessionSupported(mode)
      if (!isSupported) {
        throw new Error(`${mode} not supported on this device`)
      }

      let sessionInit = {}
      if (mode === "immersive-ar") {
        sessionInit = {
          requiredFeatures: ["hit-test"],
          optionalFeatures: ["dom-overlay"],
        }
        if (isMobile) {
          sessionInit.domOverlay = { root: document.body }
        }
      } else if (mode === "immersive-vr") {
        sessionInit = {
          optionalFeatures: ["local-floor", "bounded-floor"],
        }
      }

      const session = await navigator.xr.requestSession(mode, sessionInit)
      console.log(`${mode} session started:`, session)
      setDebugInfo(`${mode} session started successfully`)
      setXrSessionActive(true)

      session.addEventListener("end", () => {
        console.log(`${mode} session ended`)
        setXrSessionActive(false)
        setDebugInfo("")
      })

      return true
    } catch (error) {
      console.error(`Error starting ${mode} session:`, error)
      setDebugInfo(`Error: ${error.message}`)
      setXRAlertMessage(`Error starting ${mode} session: ${error.message}`)
      setShowXRAlert(true)
      return false
    }
  }

  // Custom VR Button Component
  const CustomVRButton = () => {
    return (
      <Box sx={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<Vr />}
          onClick={() => handleXRSessionStart("immersive-vr")}
        >
          Enter VR
        </Button>
      </Box>
    )
  }

  // Custom AR Button Component
  const CustomARButton = () => {
    return (
      <Box sx={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<Glasses />}
          onClick={() => handleXRSessionStart("immersive-ar")}
        >
          Enter AR
        </Button>
      </Box>
    )
  }

  // Debug Info Component
  const DebugInfoPanel = ({ show, info }) => {
    if (!show) return null

    return (
      <Box
        sx={{
          position: "fixed",
          bottom: 40,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 2,
            bgcolor: "rgba(0,0,0,0.7)",
            maxWidth: "90%",
            borderRadius: 2,
          }}
        >
          <Typography variant="body2" color="white">
            {info || "Waiting for debug info..."}
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #121212 0%, #311b92 50%, #121212 100%)",
          color: "white",
          pb: 6,
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", p: 2, pt: 4 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              fontWeight="bold"
              mb={2}
              sx={{
                background: "linear-gradient(90deg, #00bcd4 0%, #9c27b0 50%, #f50057 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textFillColor: "transparent",
              }}
            >
              GitGraphium
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: "auto" }}>
              Explore GitHub repositories in 3D, AR, and VR with interactive visualization and AI-powered insights.
            </Typography>

            {/* Device Type Indicator */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 1 }}>
              <Chip
                icon={isMobile ? <MobileIcon fontSize="small" /> : <Laptop fontSize="small" />}
                label={`Detected: ${isMobile ? "Mobile Device" : "Desktop"}`}
                variant="outlined"
                size="small"
                sx={{ bgcolor: "rgba(255,255,255,0.1)" }}
              />
              {vrSupported && (
                <Chip
                  icon={<Vr fontSize="small" />}
                  label="VR Supported"
                  variant="outlined"
                  size="small"
                  color="success"
                  sx={{ ml: 1, bgcolor: "rgba(255,255,255,0.1)" }}
                />
              )}
              {arSupported && (
                <Chip
                  icon={<Glasses fontSize="small" />}
                  label="AR Supported"
                  variant="outlined"
                  size="small"
                  color="success"
                  sx={{ ml: 1, bgcolor: "rgba(255,255,255,0.1)" }}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: isSmallScreen ? "column" : "row",
                gap: 2,
                maxWidth: 800,
                mx: "auto",
              }}
            >
              <TextField
                fullWidth
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <GitHub />
                    </InputAdornment>
                  ),
                }}
                onKeyPress={(e) => e.key === "Enter" && handleVisualize()}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleVisualize}
                disabled={loading || !repoUrl.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <Search />}
                sx={{
                  minWidth: 120,
                  background: "linear-gradient(90deg, #9c27b0 0%, #2196f3 100%)",
                  "&:hover": {
                    background: "linear-gradient(90deg, #7b1fa2 0%, #1976d2 100%)",
                  },
                }}
              >
                {loading ? "Loading..." : "Visualize"}
              </Button>
            </Box>
          </Box>

          {error && (
            <Paper
              elevation={3}
              sx={{
                maxWidth: 800,
                mx: "auto",
                mb: 3,
                p: 2,
                bgcolor: "rgba(244, 67, 54, 0.1)",
                border: "1px solid rgba(244, 67, 54, 0.3)",
                color: "#ef5350",
              }}
            >
              {error}
            </Paper>
          )}

          <Box sx={{ mb: 3, maxWidth: 1200, mx: "auto" }}>
            <Box
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Tabs value={viewMode} onChange={handleTabChange} textColor="secondary" indicatorColor="secondary">
                <Tab icon={<Laptop sx={{ fontSize: 16, mr: 1 }} />} iconPosition="start" label="3D View" value="3d" />
                <Tab icon={<Vr sx={{ fontSize: 16, mr: 1 }} />} iconPosition="start" label="VR Mode" value="vr" />
                <Tab icon={<Glasses sx={{ fontSize: 16, mr: 1 }} />} iconPosition="start" label="AR Mode" value="ar" />
              </Tabs>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Reset camera">
                  <IconButton
                    size="small"
                    onClick={() => {
                      if (canvasRef.current) {
                        const camera = canvasRef.current.__r3f.fiber.camera
                        camera.position.set(10, 5, 10)
                        camera.lookAt(0, 0, 0)
                      }
                    }}
                  >
                    <RotateCcw fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Toggle fullscreen">
                  <IconButton size="small" onClick={toggleFullscreen}>
                    <Maximize fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {viewMode === "3d" && (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 3 }}>
                <Paper
                  ref={canvasRef}
                  elevation={4}
                  sx={{
                    height: 600,
                    overflow: "hidden",
                    borderRadius: 2,
                  }}
                >
                  {treeData ? (
                    <Canvas camera={{ position: [10, 5, 10], fov: 60 }}>
                      <Suspense fallback={null}>
                        <Tree3D
                          treeData={treeData}
                          onNodeClick={handleNodeClick}
                          selectedNode={selectedNode}
                          isVR={false}
                          isPresenting={false}
                        />
                        <OrbitControls
                          enablePan={true}
                          enableZoom={true}
                          enableRotate={true}
                          maxDistance={50}
                          minDistance={2}
                        />
                        <Environment preset="city" />
                      </Suspense>
                    </Canvas>
                  ) : (
                    <Box
                      sx={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "text.disabled",
                      }}
                    >
                      <Box sx={{ textAlign: "center" }}>
                        <Code sx={{ width: 64, height: 64, mx: "auto", mb: 2, opacity: 0.5 }} />
                        <Typography>Enter a GitHub URL to start exploring</Typography>
                      </Box>
                    </Box>
                  )}
                </Paper>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <AIAnalysis selectedNode={selectedNode} repoUrl={repoUrl} />

                  {selectedNode && (
                    <Card elevation={3}>
                      <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                          {selectedNode.type === "tree" ? (
                            <Folder sx={{ color: "#64b5f6", width: 20, height: 20 }} />
                          ) : (
                            <FileText sx={{ color: "#81c784", width: 20, height: 20 }} />
                          )}
                          <Typography variant="subtitle1" fontWeight="medium">
                            Node Details
                          </Typography>
                        </Box>
                        <Box sx={{ "& > div": { mb: 1 } }}>
                          <Box>
                            <Typography component="span" color="text.secondary">
                              Name:{" "}
                            </Typography>
                            <Typography component="span">{selectedNode.name}</Typography>
                          </Box>
                          <Box>
                            <Typography component="span" color="text.secondary">
                              Type:{" "}
                            </Typography>
                            <Typography component="span">{selectedNode.type}</Typography>
                          </Box>
                          <Box>
                            <Typography component="span" color="text.secondary">
                              Path:{" "}
                            </Typography>
                            <Typography component="span">{selectedNode.path}</Typography>
                          </Box>
                          {selectedNode.size && (
                            <Box>
                              <Typography component="span" color="text.secondary">
                                Size:{" "}
                              </Typography>
                              <Typography component="span">{selectedNode.size} bytes</Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              </Box>
            )}

            {viewMode === "vr" && (
              <Box>
                <Paper
                  elevation={4}
                  sx={{
                    height: 600,
                    overflow: "hidden",
                    borderRadius: 2,
                    position: "relative",
                  }}
                >
                  {treeData ? (
                    <>
                      <CustomVRButton />
                      <Canvas camera={{ position: [10, 5, 10], fov: 60 }}>
                        <XR
                          onSessionStart={() => {
                            console.log("XR session started")
                            setXrSessionActive(true)
                          }}
                          onSessionEnd={() => {
                            console.log("XR session ended")
                            setXrSessionActive(false)
                          }}
                        >
                          <Suspense fallback={null}>
                            <XRTreeWrapper
                              treeData={treeData}
                              onNodeClick={handleNodeClick}
                              selectedNode={selectedNode}
                              mode="VR"
                            />
                            <OrbitControls
                              enablePan={true}
                              enableZoom={true}
                              enableRotate={true}
                              maxDistance={50}
                              minDistance={2}
                            />
                          </Suspense>
                        </XR>
                      </Canvas>
                    </>
                  ) : (
                    <Box
                      sx={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "text.disabled",
                      }}
                    >
                      <Box sx={{ textAlign: "center" }}>
                        <Vr sx={{ width: 64, height: 64, mx: "auto", mb: 2, opacity: 0.5 }} />
                        <Typography>Enter a GitHub URL to start exploring in VR</Typography>
                      </Box>
                    </Box>
                  )}
                </Paper>

                <Paper elevation={3} sx={{ mt: 3, p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Info sx={{ color: "#64b5f6", width: 20, height: 20 }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      VR Mode Instructions
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Use your VR controllers to point at nodes and press the trigger to select them. Move around the
                    space to explore the repository structure from different angles.
                  </Typography>

                  {isMobile ? (
                    <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2">
                        Your device has been detected as a mobile device. Click the "Enter VR" button above to start the
                        VR experience.
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2">
                        VR mode works best on mobile devices with WebXR support or with a VR headset connected.
                      </Typography>
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    color="secondary"
                    sx={{ mt: 2 }}
                    startIcon={<Vr />}
                    onClick={() => setShowVRInstructions(true)}
                  >
                    View VR Instructions
                  </Button>
                </Paper>
              </Box>
            )}

            {viewMode === "ar" && (
              <Box>
                <Paper
                  elevation={4}
                  sx={{
                    height: 600,
                    overflow: "hidden",
                    borderRadius: 2,
                    position: "relative",
                  }}
                >
                  {treeData ? (
                    <>
                      <CustomARButton />
                      <Canvas camera={{ position: [10, 5, 10], fov: 60 }}>
                        <XR
                          mode="AR"
                          onSessionStart={() => {
                            console.log("AR session started")
                            setXrSessionActive(true)
                          }}
                          onSessionEnd={() => {
                            console.log("AR session ended")
                            setXrSessionActive(false)
                          }}
                        >
                          <Suspense fallback={null}>
                            <XRTreeWrapper
                              treeData={treeData}
                              onNodeClick={handleNodeClick}
                              selectedNode={selectedNode}
                              mode="AR"
                            />
                          </Suspense>
                        </XR>
                      </Canvas>
                    </>
                  ) : (
                    <Box
                      sx={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "text.disabled",
                      }}
                    >
                      <Box sx={{ textAlign: "center" }}>
                        <Glasses sx={{ width: 64, height: 64, mx: "auto", mb: 2, opacity: 0.5 }} />
                        <Typography>Enter a GitHub URL to start exploring in AR</Typography>
                      </Box>
                    </Box>
                  )}
                </Paper>

                <Paper elevation={3} sx={{ mt: 3, p: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <Info sx={{ color: "#64b5f6", width: 20, height: 20 }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      AR Mode Instructions
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Point your camera at a flat surface and tap to place the repository visualization. Move around to
                    view from different angles and tap on nodes to select them.
                  </Typography>

                  {isMobile ? (
                    <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2">
                        Your device has been detected as a mobile device. Click the "Enter AR" button above to start the
                        AR experience.
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="body2">
                        AR mode requires a mobile device with AR capabilities and WebXR support.
                      </Typography>
                    </Alert>
                  )}

                  <Button
                    variant="contained"
                    color="secondary"
                    sx={{ mt: 2 }}
                    startIcon={<Glasses />}
                    onClick={() => setShowARInstructions(true)}
                  >
                    View AR Instructions
                  </Button>
                </Paper>
              </Box>
            )}
          </Box>
        </Box>

        <AnimatePresence>
          {showVRInstructions && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <VRInstructions isVisible={showVRInstructions} onClose={() => setShowVRInstructions(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showARInstructions && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ARInstructions isVisible={showARInstructions} onClose={() => setShowARInstructions(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <Snackbar
          open={showXRAlert}
          autoHideDuration={6000}
          onClose={() => setShowXRAlert(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={() => setShowXRAlert(false)} severity="warning" sx={{ width: "100%" }}>
            {xrAlertMessage}
          </Alert>
        </Snackbar>

        {/* Debug Info Panel */}
        <DebugInfoPanel show={!!debugInfo} info={debugInfo} />

        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: "background.paper",
            borderTop: "1px solid",
            borderColor: "divider",
            p: 1,
            textAlign: "center",
          }}
        >
          <Chip
            label="GitGraphium - 3D GitHub Repository Visualizer with AR/VR Support"
            variant="outlined"
            size="small"
            sx={{ bgcolor: "background.paper", color: "text.secondary" }}
          />
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default GitHubVisualizer