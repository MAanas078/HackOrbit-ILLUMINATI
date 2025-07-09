import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
   createSession,
   getOwnerSessions,
   getRenterSessions,
   updateSessionStatus,
   uploadCode,
   getExecutionResult,
   getPendingExecution,
   executeCodeOnLender,
   getSecurityAnalytics,
   getSessionAnalysis,
   rebuildBaseImages,
   getBaseImageStatus
} from "../controllers/session.controller.js";

const router = express.Router();

// Create a new session (rent a device)
router.post("/", verifyToken, createSession);

// Get all sessions for device owner
router.get("/owner", verifyToken, getOwnerSessions);

// Get all sessions for a renter
router.get("/renter", verifyToken, getRenterSessions);

// Accept/reject/complete a session
router.put("/:sessionId/status", verifyToken, updateSessionStatus);

// Upload encrypted code from renter (new approach)
router.post("/:sessionId/upload", verifyToken, uploadCode);

// Get pending execution requests for lender
router.get("/pending-execution", verifyToken, getPendingExecution);

// Execute code on lender's device
router.post("/:sessionId/execute", verifyToken, executeCodeOnLender);

// Get execution result
router.get("/:sessionId/result", verifyToken, getExecutionResult);

// NEW: Security Analytics Endpoints
// Get security analytics for device owner/platform
router.get("/security-analytics", verifyToken, getSecurityAnalytics);

// Get detailed analysis for a specific session
router.get("/:sessionId/analysis", verifyToken, getSessionAnalysis);

// NEW: Docker Base Image Management Endpoints for Performance Optimization
// Get status of Docker base images
router.get("/docker/base-images/status", verifyToken, getBaseImageStatus);

// Rebuild Docker base images (for device owners)
router.post("/docker/base-images/rebuild", verifyToken, rebuildBaseImages);

export default router;