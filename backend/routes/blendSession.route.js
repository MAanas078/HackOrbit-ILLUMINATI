import express from 'express';
import { verifyToken } from '../middleware/verifyToken.js';
import {
  createBlendSession,
  uploadBlendFile,
  updateBlendSessionStatus,
  runBlenderRender,
  downloadRenderOutput,
  getRenderResult,
  getRenderedFilePreview,
  upload
} from "../controllers/blendSession.controller.js";
import { Device } from '../models/device.model.js';
import BlendSession from '../models/blendSession.model.js';
import User from '../models/user.model.js';

const router = express.Router();

// Create new Blender rental session
router.post("/", verifyToken, createBlendSession);

// Upload Blender files
router.post(
  "/:sessionId/upload", 
  verifyToken,
  upload.array('files', 10),
  uploadBlendFile
);

// Update session status (accept/reject/complete)
router.put("/:sessionId/status", verifyToken, updateBlendSessionStatus);

// Run Blender render (device owner)
router.post("/:sessionId/render", verifyToken, runBlenderRender);

// Download render output
router.get("/:sessionId/download", verifyToken, downloadRenderOutput);

// Get render result and progress
router.get("/:sessionId/result", verifyToken, getRenderResult);

// Get preview of rendered file
router.get("/:sessionId/preview/:fileName", verifyToken, getRenderedFilePreview);

// Get all sessions for renter
router.get("/renter", verifyToken, async (req, res) => {
  try {
    const sessions = await BlendSession.find({ renter: req.userId })
      .populate({
        path: 'device',
        select: 'name deviceName owner price specs deviceType'
      })
      .sort({ createdAt: -1 });
    
    return res.status(200).json({ 
      success: true, 
      sessions 
    });
  } catch (error) {
    console.error("Error fetching renter's sessions:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get all sessions for device owner
router.get("/owner", verifyToken, async (req, res) => {
  try {
    // First find all devices owned by the user
    const userDevices = await Device.find({ owner: req.userId });
    const deviceIds = userDevices.map(device => device._id);
    
    // Then find all sessions for those devices
    const sessions = await BlendSession.find({ device: { $in: deviceIds } })
      .populate({
        path: 'device',
        select: 'name deviceName specs price deviceType'
      })
      .populate({
        path: 'renter',
        select: 'username email'
      })
      .sort({ createdAt: -1 });
    
    return res.status(200).json({ 
      success: true, 
      sessions 
    });
  } catch (error) {
    console.error("Error fetching owner's sessions:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get session details by ID
router.get("/:sessionId", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await BlendSession.findById(sessionId)
      .populate({
        path: 'device',
        select: 'name deviceName owner price specs deviceType'
      })
      .populate({
        path: 'renter',
        select: 'username email'
      });
    
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    
    // Check authorization - only renter or device owner can access
    const device = await Device.findById(session.device._id);
    if (
      session.renter._id.toString() !== req.userId && 
      device.owner.toString() !== req.userId
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    return res.status(200).json({ 
      success: true, 
      session 
    });
  } catch (error) {
    console.error("Error fetching session details:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get user info for a session (for device owner to see renter info or vice versa)
router.get("/:sessionId/users", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await BlendSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    
    const device = await Device.findById(session.device);
    
    // Check authorization
    if (
      session.renter.toString() !== req.userId && 
      device.owner.toString() !== req.userId
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    // If requester is renter, return device owner info
    // If requester is device owner, return renter info
    let userInfo;
    if (session.renter.toString() === req.userId) {
      const owner = await User.findById(device.owner).select('-password');
      userInfo = {
        role: 'owner',
        user: owner
      };
    } else {
      const renter = await User.findById(session.renter).select('-password');
      userInfo = {
        role: 'renter',
        user: renter
      };
    }
    
    return res.status(200).json({
      success: true,
      userInfo
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;