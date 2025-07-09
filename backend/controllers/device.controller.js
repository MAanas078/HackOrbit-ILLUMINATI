import { Device } from '../models/device.model.js';
import { detectHardwareSpecs, calculatePerformanceScore, mapToObject, objectToMap } from '../utils/detectSpecs.js';

// Create a new device
export const createDevice = async (req, res) => {

if (!req.userId) {
  return res.status(401).json({ error: 'Authentication required' });
}

  try {
    // Get user ID from authenticated user
    const userId = req.userId;
    
    // Merge user input with detected hardware specs
    let deviceData = { ...req.body, owner: userId };
    
    // Ensure required fields
    if (!deviceData.deviceName) {
      return res.status(400).json({ error: 'Device name is required' });
    }
    
    if (!deviceData.deviceType) {
      return res.status(400).json({ error: 'Device type is required' });
    }
    
    if (!deviceData.price) {
      return res.status(400).json({ error: 'Price is required' });
    }
    
    if (!deviceData.location) {
      return res.status(400).json({ error: 'Location is required' });
    }
    
    // Auto-detect specs if not provided or validate provided specs
    try {
      let finalSpecs;
      const detectedSpecs = await detectHardwareSpecs(deviceData.deviceType);
      
      if (!deviceData.specs || Object.keys(deviceData.specs).length === 0) {
        // Use auto-detected specs
        finalSpecs = detectedSpecs;
      } else {
        // Convert provided specs to Map if it's not already
        const providedSpecs = objectToMap(deviceData.specs);
        
        // Validate specs
        const validationResult = validateSpecs(providedSpecs, detectedSpecs);
        
        if (!validationResult.valid) {
          return res.status(400).json({ 
            error: 'Invalid specs provided',
            message: 'The provided hardware specifications do not match detected hardware.',
            details: validationResult.discrepancies
          });
        }
        
        finalSpecs = validationResult.specs;
      }
      
      // Calculate performance score
      const performanceScore = calculatePerformanceScore(deviceData.deviceType, finalSpecs);
      
      // Convert Map to object for MongoDB storage
      deviceData.specs = mapToObject(finalSpecs);
      deviceData.performance = performanceScore;
      
      // Create device
      const device = new Device(deviceData);
      await device.save();
      
      res.status(201).json(device);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Hardware detection failed',
        message: error.message
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Add this to your device controller file
export const detectDeviceSpecs = async (req, res) => {
    try {
      const { deviceType } = req.body;
      
      if (!deviceType) {
        return res.status(400).json({ error: 'Device type is required' });
      }
      
      // Call your detectHardwareSpecs utility
      const specs = await detectHardwareSpecs(deviceType);
      
      // Convert Map to object if needed
      const specsObject = specs instanceof Map ? mapToObject(specs) : specs;
      
      res.status(200).json({ specs: specsObject });
    } catch (error) {
      console.error('Hardware detection error:', error);
      res.status(500).json({ 
        error: 'Hardware detection failed', 
        message: error.message 
      });
    }
  };
  

// Helper function to validate provided specs against detected specs
export const validateSpecs = (providedSpecs, detectedSpecs) => {
  const discrepancies = [];
  let valid = true;
  const validatedSpecs = new Map();
  
  // List of critical specs that should match exactly
  const criticalSpecs = ['manufacturer', 'brand', 'model', 'cores', 'vram'];
  
  // Check critical specs
  for (const key of criticalSpecs) {
    if (detectedSpecs.has(key) && providedSpecs.has(key)) {
      const detectedValue = detectedSpecs.get(key);
      const providedValue = providedSpecs.get(key);
      
      // Allow some tolerance for numerical values (e.g., slight differences in clock speeds)
      if (isNumeric(detectedValue) && isNumeric(providedValue)) {
        const detected = parseFloat(detectedValue);
        const provided = parseFloat(providedValue);
        
        // Allow 10% tolerance for numerical values
        if (Math.abs(detected - provided) / detected > 0.1) {
          discrepancies.push({
            key,
            provided: providedValue,
            detected: detectedValue
          });
          valid = false;
          validatedSpecs.set(key, detectedValue);
        } else {
          validatedSpecs.set(key, providedValue);
        }
      } else if (detectedValue !== providedValue) {
        discrepancies.push({
          key,
          provided: providedValue,
          detected: detectedValue
        });
        valid = false;
        validatedSpecs.set(key, detectedValue);
      } else {
        validatedSpecs.set(key, providedValue);
      }
    } else if (detectedSpecs.has(key)) {
      // Use detected value if provided value is missing
      validatedSpecs.set(key, detectedSpecs.get(key));
    }
  }
  
  // Copy non-critical specs from detected specs
  for (const [key, value] of detectedSpecs.entries()) {
    if (!criticalSpecs.includes(key) && !validatedSpecs.has(key)) {
      validatedSpecs.set(key, value);
    }
  }
  
  // Include any additional specs provided that weren't critical for validation
  for (const [key, value] of providedSpecs.entries()) {
    if (!validatedSpecs.has(key)) {
      validatedSpecs.set(key, value);
    }
  }
  
  return {
    valid,
    discrepancies,
    specs: validatedSpecs
  };
};

// Helper to check if a value is numeric
const isNumeric = (value) => {
  if (typeof value !== 'string') return false;
  return !isNaN(value) && !isNaN(parseFloat(value));
};

// Get all devices (with optional filtering)
export const getAllDevices = async (req, res) => {
  try {
    // Build filter based on query params
    const filter = {};
    
    // Apply filters if provided
    if (req.query.deviceType) {
      filter.deviceType = req.query.deviceType;
    }
    
    if (req.query.isAvailable !== undefined) {
      filter.isAvailable = req.query.isAvailable === 'true';
    }
    
    if (req.query.minPerformance) {
      filter.performance = { $gte: parseInt(req.query.minPerformance) };
    }
    
    if (req.query.maxPrice) {
      filter.price = { $lte: parseInt(req.query.maxPrice) };
    }
    
    const devices = await Device.find(filter)
      .populate("owner", "name email")
      .sort({ createdAt: -1 });
    
    res.status(200).json(devices);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get devices belonging to the authenticated user
export const getUserDevices = async (req, res) => {
  try {
    const userId = req.userId;
    const devices = await Device.find({ owner: userId })
      .sort({ createdAt: -1 });
    
    res.status(200).json(devices);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get a specific device by ID
export const getDeviceById = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const device = await Device.findById(deviceId)
      .populate("owner", "name email");
    
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    
    res.status(200).json(device);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
};

// Update a device
export const updateDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const userId = req.userId;
    const updateData = req.body;
    
    // First verify this device belongs to the user attempting to update it
    const device = await Device.findOne({
      _id: deviceId,
      owner: userId,
    });
    
    if (!device) {
      return res.status(404).json({ 
        error: "Device not found or you don't have permission to update it" 
      });
    }
    
    // If specs are being updated, validate them
    if (updateData.specs) {
      const detectedSpecs = await detectHardwareSpecs(device.deviceType);
      const providedSpecs = objectToMap(updateData.specs);
      const validatedSpecs = validateSpecs(providedSpecs, detectedSpecs);
      
      if (!validatedSpecs.valid) {
        return res.status(400).json({ 
          error: 'Invalid specs provided',
          message: 'The provided hardware specifications do not match detected hardware.',
          details: validatedSpecs.discrepancies
        });
      }
      
      updateData.specs = mapToObject(validatedSpecs.specs);
      
      // Recalculate performance score if specs change
      updateData.performance = calculatePerformanceScore(device.deviceType, validatedSpecs.specs);
    }
    
    // Apply updates
    Object.keys(updateData).forEach((key) => {
      device[key] = updateData[key];
    });
    
    await device.save();
    res.status(200).json(device);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a device
export const deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const userId = req.userId;
    
    // Verify ownership before deletion
    const device = await Device.findOne({
      _id: deviceId,
      owner: userId,
    });
    
    if (!device) {
      return res.status(404).json({ 
        error: "Device not found or you don't have permission to delete it" 
      });
    }
    
    await Device.findByIdAndDelete(deviceId);
    res.status(200).json({ message: "Device deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Find available devices based on requirements
export const findAvailableDevices = async (req, res) => {
  try {
    const { deviceType, minPerformance, maxPrice, taskType, startTime, endTime } = req.body;
    
    const query = {
      isAvailable: true,
    };
    
    if (deviceType) query.deviceType = deviceType;
    if (minPerformance) query.performance = { $gte: parseInt(minPerformance) };
    if (maxPrice) query.price = { $lte: parseInt(maxPrice) };
    if (taskType) query.acceptedTaskTypes = taskType;
    
    // Find devices with availability during the requested time period
    if (startTime && endTime) {
      query.availableHours = {
        $elemMatch: {
          start: { $lte: new Date(startTime) },
          end: { $gte: new Date(endTime) },
        },
      };
    }
    
    const devices = await Device.find(query)
      .populate("owner", "name email")
      .sort({ performance: -1, price: 1 });
    
    res.status(200).json(devices);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};