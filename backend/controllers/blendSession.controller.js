import BlendSession from "../models/blendSession.model.js";
import { Device } from "../models/device.model.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import Docker from 'dockerode';
import archiver from 'archiver';
import extract from 'extract-zip';
import cloudinary from 'cloudinary';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docker = new Docker();

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dyjwylng4',
  api_key: '115953643821829',
  api_secret: 'nTlLMrMYDN46tXgrHBr26MMGrck'
});

// Set up storage for Blender files
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const { sessionId } = req.params;
    const sessionDir = path.join(__dirname, '..', 'uploads', 'blender', sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    cb(null, sessionDir);
  },
  filename: function(req, file, cb) {
    // Store the original filename
    cb(null, file.originalname);
  }
});

export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Create a new Blender rental session
export const createBlendSession = async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    // Check if device exists and is available
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: "Device not found" });
    }
    
    if (!device.isAvailable) {
      return res.status(400).json({ success: false, message: "Device is not available for rent" });
    }
    
    // Check if the renter is not the owner
    if (device.owner.toString() === req.userId) {
      return res.status(400).json({ success: false, message: "You cannot rent your own device" });
    }
    
    // Create a new session
    const session = new BlendSession({
      renter: req.userId,
      device: deviceId,
      language: "blender",
    });
    
    await session.save();
    
    // Create session directory
    const sessionDir = path.join(__dirname, '..', 'uploads', 'blender', session._id.toString());
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      
      // Create outputs directory
      fs.mkdirSync(path.join(sessionDir, 'outputs'), { recursive: true });
    }
    
    return res.status(201).json({ 
      success: true, 
      message: "Blender rental request created successfully", 
      sessionId: session._id 
    });
  } catch (error) {
    console.error("Error creating Blender session:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Upload Blender files for a session
export const uploadBlendFile = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
    
    const session = await BlendSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    
    // Verify the requester is the renter
    if (session.renter.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    // Only allow uploads for requested or active sessions
    if (!["requested", "active"].includes(session.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot upload files to a session in ${session.status} status` 
      });
    }
    
    // Get main blend file from the uploaded files
    const blendFile = files.find(file => file.originalname.endsWith('.blend'));
    if (!blendFile) {
      return res.status(400).json({ 
        success: false, 
        message: "No .blend file found in uploaded files" 
      });
    }
    
    // Create render script file
    const sessionDir = path.join(__dirname, '..', 'uploads', 'blender', sessionId);
    const renderScriptPath = path.join(sessionDir, 'render_script.py');
    
    // Default render script content
    const renderScriptContent = `
import bpy
import os
import sys

# Configuration
OUTPUT_DIR = "/blender/outputs"
OUTPUT_FILENAME = "rendered_image"
OUTPUT_FORMAT = 'PNG'  # Could be 'JPEG', 'PNG', 'EXR', etc.
RENDER_ENGINE = 'CYCLES'  # Could be 'BLENDER_EEVEE' or 'CYCLES'
SAMPLES = 128  # Higher for better quality but slower render

print(f"🔧 Setting up render with {RENDER_ENGINE} engine...")

try:
    # Create output directory if it doesn't exist
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    
    # Set render engine
    bpy.context.scene.render.engine = RENDER_ENGINE
    
    # Set samples for Cycles
    if RENDER_ENGINE == 'CYCLES':
        bpy.context.scene.cycles.samples = SAMPLES
    
    # Set output location and format
    timestamp = bpy.path.clean_name(str(bpy.context.scene.name))
    output_path = f"{OUTPUT_DIR}/{OUTPUT_FILENAME}_{timestamp}"
    
    bpy.context.scene.render.filepath = output_path
    bpy.context.scene.render.image_settings.file_format = OUTPUT_FORMAT
    
    print(f"🎬 Rendering to: {output_path}.{OUTPUT_FORMAT.lower()}")
    
    # Render the image
    bpy.ops.render.render(write_still=True)
    
    print("✅ Render completed successfully!")
except Exception as e:
    print(f"❌ Error during rendering: {e}")
    sys.exit(1)
`;

    fs.writeFileSync(renderScriptPath, renderScriptContent);
    
    // Create Dockerfile for this session
    const dockerfilePath = path.join(sessionDir, 'Dockerfile');
    const dockerfileContent = `FROM --platform=linux/amd64 ubuntu:22.04

# Install Blender and dependencies
RUN apt-get update && apt-get install -y \\
    wget \\
    xz-utils \\
    libxrender1 \\
    libxxf86vm1 \\
    libxi6 \\
    libxfixes3 \\
    libgl1-mesa-glx \\
    libxkbcommon0 \\
    libsm6 \\
    python3 \\
    python3-pip \\
    && rm -rf /var/lib/apt/lists/*

# Download and install Blender 3.6.7
RUN mkdir -p /opt/blender && \\
    wget -q https://download.blender.org/release/Blender3.6/blender-3.6.7-linux-x64.tar.xz -O /tmp/blender.tar.xz && \\
    tar -xf /tmp/blender.tar.xz -C /opt/blender --strip-components=1 && \\
    rm /tmp/blender.tar.xz && \\
    ln -s /opt/blender/blender /usr/local/bin/blender

# Set working directory
WORKDIR /blender

# Create outputs directory
RUN mkdir -p /blender/outputs && chmod 777 /blender/outputs

# Default entrypoint
ENTRYPOINT ["blender"]`;

    fs.writeFileSync(dockerfilePath, dockerfileContent);

    // Update session with blend file path
    session.blendFile = blendFile.originalname;
    await session.save();
    
    return res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      files: files.map(f => f.originalname)
    });
    
  } catch (error) {
    console.error("Error uploading Blender files:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Accept or reject a session request (for device owners)
export const updateBlendSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    
    if (!["active", "completed", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    
    const session = await BlendSession.findById(sessionId).populate("device");
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    
    // Verify that the requester is the device owner
    if (session.device.owner.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    // Update session status
    if (status === "active") {
      session.startTime = new Date();
    } else if (status === "completed") {
      session.endTime = new Date();
      // Calculate cost based on time used and device price
      const hoursUsed = (session.endTime - session.startTime) / (1000 * 60 * 60);
      session.cost = session.device.price * hoursUsed;
    }
    
    session.status = status;
    await session.save();
    
    return res.status(200).json({ success: true, message: `Session ${status}` });
  } catch (error) {
    console.error("Error updating Blender session status:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Run Blender render (for device owners)
export const runBlenderRender = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await BlendSession.findById(sessionId).populate("device");
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    
    // Verify that the requester is the device owner
    if (session.device.owner.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    // Only allow rendering for active sessions
    if (session.status !== "active") {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot render a session in ${session.status} status` 
      });
    }
    
    const sessionDir = path.join(__dirname, '..', 'uploads', 'blender', sessionId);
    
    // Get the blend file
    const blendFiles = fs.readdirSync(sessionDir).filter(file => file.endsWith('.blend'));
    if (blendFiles.length === 0) {
      return res.status(400).json({ success: false, message: "No blend file found for this session" });
    }
    
    const blendFile = blendFiles[0];
    
    // Build Docker image
    try {
      const dockerBuildStream = await docker.buildImage({
        context: sessionDir,
        src: fs.readdirSync(sessionDir)
      }, { t: `blender-render-${sessionId}` });
      
      await new Promise((resolve, reject) => {
        docker.modem.followProgress(
          dockerBuildStream,
          (err, result) => err ? reject(err) : resolve(result),
          (event) => console.log(event.stream ? event.stream.trim() : '')
        );
      });
      
      console.log(`Docker image blender-render-${sessionId} built successfully`);
    } catch (err) {
      console.error("Docker build error:", err);
      return res.status(500).json({ success: false, message: "Failed to build Docker image" });
    }
    
    // Run the container
    try {
      const container = await docker.createContainer({
        Image: `blender-render-${sessionId}`,
        HostConfig: {
          Binds: [`${sessionDir}:/blender`]
        },
        Cmd: [
          "-b", blendFile,
          "-P", "render_script.py",
          "--factory-startup"
        ]
      });
      
      // Start monitoring resource usage
      const resourceMonitoring = setInterval(async () => {
        try {
          const stats = await container.stats({ stream: false });
          
          // Calculate CPU percentage
          const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                        (stats.precpu_stats.cpu_usage ? stats.precpu_stats.cpu_usage.total_usage : 0);
          const systemCpuDelta = stats.cpu_stats.system_cpu_usage - 
                              (stats.precpu_stats.system_cpu_usage || 0);
          const cpuPercent = (cpuDelta / systemCpuDelta) * 100 * stats.cpu_stats.online_cpus;
          
          // Calculate memory usage in MB
          const memoryUsage = stats.memory_stats.usage / (1024 * 1024);
          
          // Update session resource usage
          session.resourceUsage = {
            cpuPercent: cpuPercent.toFixed(2),
            memoryUsage: memoryUsage.toFixed(2),
            // GPU stats would need additional tooling
            gpuUtilization: 0
          };
          await session.save();
        } catch (e) {
          // Container might have stopped
          clearInterval(resourceMonitoring);
        }
      }, 5000); // Check every 5 seconds
      
      await container.start();
      
      // Get container output
      const logsStream = await container.logs({ 
        follow: true, 
        stdout: true, 
        stderr: true 
      });
      
      let output = '';
      logsStream.on('data', (chunk) => {
        const data = chunk.toString();
        output += data;
        console.log(data);
      });
      
      // Wait for container to finish
      const [result] = await container.wait();
      clearInterval(resourceMonitoring);
      
      // Check if render was successful
      if (result.StatusCode !== 0) {
        session.output = output;
        await session.save();
        return res.status(500).json({ 
          success: false, 
          message: "Render failed", 
          output 
        });
      }
      
      // Save output to session
      session.output = output;
      await session.save();
      
      // Get list of rendered files for the response
      const outputsDir = path.join(sessionDir, 'outputs');
      let renderedFiles = [];
      let cloudinaryUrls = [];
      
      if (fs.existsSync(outputsDir)) {
        renderedFiles = fs.readdirSync(outputsDir)
          .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.exr'));
        
        // Upload each rendered file to Cloudinary
        for (const file of renderedFiles) {
          try {
            const filePath = path.join(outputsDir, file);
            // Set appropriate permissions to ensure files are accessible
            fs.chmodSync(filePath, 0o644);
            
            // Upload to Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
              cloudinary.v2.uploader.upload(
                filePath,
                {
                  folder: `blender_renders/${sessionId}`,
                  resource_type: 'auto',
                  public_id: file.split('.')[0], // Use filename without extension as public_id
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result);
                }
              );
            });
            
            cloudinaryUrls.push({
              filename: file,
              url: uploadResult.secure_url,
              publicId: uploadResult.public_id
            });
          } catch (err) {
            console.error(`Error uploading ${file} to Cloudinary:`, err);
          }
        }
      }
      
      // Store cloudinary URLs in session
      session.cloudinaryUrls = cloudinaryUrls;
      await session.save();
      
      return res.status(200).json({
        success: true,
        message: "Render completed successfully",
        output,
        renderedFiles,
        cloudinaryUrls
      });
      
    } catch (err) {
      console.error("Docker run error:", err);
      return res.status(500).json({ success: false, message: "Failed to run render" });
    }
    
  } catch (error) {
    console.error("Error running Blender render:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Download rendered output (for renters)
export const downloadRenderOutput = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await BlendSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    
    // Verify the requester is authorized (either renter or device owner)
    const device = await Device.findById(session.device);
    if (
      session.renter.toString() !== req.userId && 
      device.owner.toString() !== req.userId
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    const sessionDir = path.join(__dirname, '..', 'uploads', 'blender', sessionId);
    const outputsDir = path.join(sessionDir, 'outputs');
    const zipPath = path.join(sessionDir, 'render_output.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    output.on('close', () => {
      // Send the zip file
      res.download(zipPath, `blender_render_${sessionId}.zip`, (err) => {
        if (err) {
          console.error("Download error:", err);
        }
        // Clean up zip file after download
        try {
          fs.unlinkSync(zipPath);
        } catch (e) {
          console.error("Error removing temp zip file:", e);
        }
      });
    });
    
    archive.on('error', (err) => {
      console.error("Archive error:", err);
      return res.status(500).json({ success: false, message: "Error creating download package" });
    });
    
    archive.pipe(output);
    
    // Try to add files from local directory first
    let hasLocalFiles = false;
    if (fs.existsSync(outputsDir)) {
      const outputFiles = fs.readdirSync(outputsDir);
      if (outputFiles.length > 0) {
        hasLocalFiles = true;
        outputFiles.forEach(file => {
          archive.file(path.join(outputsDir, file), { name: file });
        });
      }
    }
    
    // If no local files exist but we have Cloudinary URLs, download from Cloudinary
    if (!hasLocalFiles && session.cloudinaryUrls && session.cloudinaryUrls.length > 0) {
      // Create a temporary directory for downloaded Cloudinary files
      const tempDir = path.join(sessionDir, 'temp_downloads');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Download each file from Cloudinary and add to archive
      for (const item of session.cloudinaryUrls) {
        try {
          const response = await fetch(item.url);
          if (!response.ok) {
            throw new Error(`Failed to download from Cloudinary: ${response.status} ${response.statusText}`);
          }
          
          const buffer = await response.arrayBuffer();
          const tempFilePath = path.join(tempDir, item.filename);
          
          fs.writeFileSync(tempFilePath, Buffer.from(buffer));
          archive.file(tempFilePath, { name: item.filename });
        } catch (err) {
          console.error(`Error downloading file from Cloudinary: ${item.filename}`, err);
        }
      }
      
      // Clean up temp directory after archiving
      setTimeout(() => {
        try {
          if (fs.existsSync(tempDir)) {
            fs.readdirSync(tempDir).forEach(file => {
              fs.unlinkSync(path.join(tempDir, file));
            });
            fs.rmdirSync(tempDir);
          }
        } catch (e) {
          console.error("Error cleaning up temp directory:", e);
        }
      }, 10000); // 10 second delay to ensure archive is finished
    }
    
    // If no files were added to the archive
    if (!hasLocalFiles && (!session.cloudinaryUrls || session.cloudinaryUrls.length === 0)) {
      return res.status(404).json({ success: false, message: "No render files found" });
    }
    
    archive.finalize();
    
  } catch (error) {
    console.error("Error downloading render output:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get execution result and render progress
export const getRenderResult = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await BlendSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    
    // Verify the requester is authorized (either renter or device owner)
    const device = await Device.findById(session.device);
    if (
      session.renter.toString() !== req.userId && 
      device.owner.toString() !== req.userId
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    // Get list of rendered files
    const sessionDir = path.join(__dirname, '..', 'uploads', 'blender', sessionId);
    const outputsDir = path.join(sessionDir, 'outputs');
    
    let renderedFiles = [];
    if (fs.existsSync(outputsDir)) {
      renderedFiles = fs.readdirSync(outputsDir)
        .filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.exr'));
    }
    
    return res.status(200).json({ 
      success: true, 
      result: {
        output: session.output || "No output available",
        status: session.status,
        resourceUsage: session.resourceUsage,
        renderedFiles,
        cloudinaryUrls: session.cloudinaryUrls || [],
        cost: session.cost
      }
    });
  } catch (error) {
    console.error("Error getting render result:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Serve rendered file preview
export const getRenderedFilePreview = async (req, res) => {
  try {
    const { sessionId, fileName } = req.params;
    
    const session = await BlendSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    
    // Verify the requester is authorized (either renter or device owner)
    const device = await Device.findById(session.device);
    if (
      session.renter.toString() !== req.userId && 
      device.owner.toString() !== req.userId
    ) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    
    // Validate filename to prevent directory traversal attacks
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ success: false, message: "Invalid filename" });
    }
    
    const sessionDir = path.join(__dirname, '..', 'uploads', 'blender', sessionId);
    const outputsDir = path.join(sessionDir, 'outputs');
    const filePath = path.join(outputsDir, fileName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    
    // Serve the file
    res.sendFile(filePath);
    
  } catch (error) {
    console.error("Error serving rendered file preview:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};