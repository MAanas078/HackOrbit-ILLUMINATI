import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import {
  createDevice,
  deleteDevice,
  detectDeviceSpecs,
  findAvailableDevices,
  getAllDevices,
  getDeviceById,
  getUserDevices,
  updateDevice,
  validateSpecs
} from "../controllers/device.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/check-auth", verifyToken, AuthController.checkAuth);

// Create a new device
router.post("/", verifyToken, createDevice);

// Get all devices with optional filtering
router.get("/", getAllDevices);

// Find available devices matching specific requirements
router.post("/search", findAvailableDevices);

// Get logged-in user's devices
router.get("/my-devices", verifyToken, getUserDevices);

// Add this to your device router file
router.post("/detect-specs", verifyToken, detectDeviceSpecs);

// Get a single device by ID
router.get("/:id", getDeviceById);

// Update a device
router.put("/:id", verifyToken, updateDevice);

// Delete a device
router.delete("/:id", verifyToken, deleteDevice);

export default router;