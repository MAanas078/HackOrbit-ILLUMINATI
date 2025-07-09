import { Session } from "../models/session.model.js";
import { Device } from "../models/device.model.js";
import { analyzeCodeEnhanced } from "../services/codeAnalysis.service.js";
import axios from "axios";
import Docker from "dockerode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docker = new Docker();

// Security score thresholds
const SECURITY_THRESHOLDS = {
  HIGH: 80, // 80-100: Safe to execute
  MEDIUM: 50, // 50-79: Caution required
  LOW: 0, // 0-49: Unsafe, reject execution
};

// Common Python packages that should be pre-installed in base images
const COMMON_PACKAGES = {
  "data-science": [
    "numpy",
    "pandas",
    "scikit-learn",
    "matplotlib",
    "seaborn",
    "scipy",
    "jupyter",
  ],
  "web-dev": [
    "fastapi",
    "flask",
    "django",
    "requests",
    "beautifulsoup4",
    "selenium",
  ],
  ml: ["tensorflow", "torch", "transformers", "opencv-python", "pillow"],
  basic: ["requests", "json", "csv", "datetime", "os", "sys"],
};

// Cache for Docker base images
let baseImagesReady = {
  "data-science": false,
  "web-dev": false,
  ml: false,
  basic: false,
};

// Initialize base Docker images with common packages
const initializeBaseImages = async () => {
  console.log("Initializing optimized Docker base images...");

  for (const [category, packages] of Object.entries(COMMON_PACKAGES)) {
    const imageName = `lender-base-${category}`;

    try {
      // Check if base image already exists
      try {
        await docker.getImage(imageName).inspect();
        baseImagesReady[category] = true;
        console.log(`✅ Base image ${imageName} already exists`);
        continue;
      } catch (error) {
        // Image doesn't exist, create it
      }

      console.log(`🔄 Building optimized base image: ${imageName}`);

      // Create Dockerfile for base image
      const baseDockerfileContent = `FROM python:3.9-slim
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir ${packages.join(" ")}
WORKDIR /app
CMD ["python"]`;

      // Create temporary directory for base image build
      const baseDir = path.join(__dirname, "..", "docker-bases", category);
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      const baseDockerfilePath = path.join(baseDir, "Dockerfile");
      fs.writeFileSync(baseDockerfilePath, baseDockerfileContent);

      // Build base image
      const stream = await docker.buildImage(
        {
          context: baseDir,
          src: ["Dockerfile"],
        },
        { t: imageName }
      );

      await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => {
          if (err) {
            console.error(`❌ Failed to build base image ${imageName}:`, err);
            reject(err);
          } else {
            console.log(`✅ Successfully built base image: ${imageName}`);
            baseImagesReady[category] = true;
            resolve(res);
          }
        });
      });

      // Clean up temporary files
      fs.rmSync(baseDir, { recursive: true, force: true });
    } catch (error) {
      console.error(`Error building base image ${category}:`, error);
    }
  }

  console.log("Base image initialization complete!");
};

// Determine the best base image for given requirements
const getBestBaseImage = (requirements) => {
  const reqLower = requirements.toLowerCase();
  const requiredPackages = requirements
    .split("\n")
    .map((pkg) => pkg.trim().toLowerCase())
    .filter((pkg) => pkg);

  // Score each base image category
  const scores = {};

  for (const [category, packages] of Object.entries(COMMON_PACKAGES)) {
    if (!baseImagesReady[category]) continue;

    let score = 0;
    let matches = 0;

    for (const pkg of packages) {
      if (requiredPackages.includes(pkg.toLowerCase())) {
        matches++;
        score += 10; // High score for exact matches
      }
    }

    // Bonus for data science workloads (most common)
    if (
      category === "data-science" &&
      (reqLower.includes("numpy") || reqLower.includes("pandas"))
    ) {
      score += 5;
    }

    scores[category] = { score, matches, total: packages.length };
  }

  // Find the best match
  let bestCategory = "basic";
  let bestScore = 0;

  for (const [category, { score, matches }] of Object.entries(scores)) {
    if (score > bestScore && matches > 0) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return {
    category: bestCategory,
    image: `lender-base-${bestCategory}`,
    matchInfo: scores[bestCategory] || { score: 0, matches: 0 },
  };
};

// Get additional packages that need to be installed beyond base image
const getAdditionalPackages = (requirements, baseCategory) => {
  const requiredPackages = requirements
    .split("\n")
    .map((pkg) => pkg.trim())
    .filter((pkg) => pkg);
  const basePackages = COMMON_PACKAGES[baseCategory] || [];

  // Filter out packages already in base image
  const additionalPackages = requiredPackages.filter(
    (pkg) =>
      !basePackages.some(
        (basePkg) => basePkg.toLowerCase() === pkg.toLowerCase()
      )
  );

  return additionalPackages;
};

// Initialize base images on server startup
setTimeout(initializeBaseImages, 1000); // Delay to allow server to start

// Encryption utilities for secure code transmission
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

// FIXED: Use proper Cipheriv instead of deprecated createCipher
const encryptCode = (code, sessionKey) => {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(sessionKey, "salt", 32); // Derive 32-byte key
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(code, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
};

// FIXED: Use proper Decipheriv instead of deprecated createDecipher
const decryptCode = (encryptedData, sessionKey) => {
  const key = crypto.scryptSync(sessionKey, "salt", 32); // Derive same 32-byte key
  const iv = Buffer.from(encryptedData.iv, "hex");
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

  let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

// Generate session-specific encryption key
const generateSessionKey = (sessionId, deviceId) => {
  return crypto
    .createHash("sha256")
    .update(`${sessionId}-${deviceId}-${Date.now()}`)
    .digest("hex");
};

// Extract security score from ML analysis
const extractSecurityScore = (analysisText) => {
  try {
    // Look for patterns like "Risk level: HIGH" or "Score: 85/100"
    const riskMatch = analysisText.match(/Risk level:\s*(LOW|MEDIUM|HIGH)/i);
    const scoreMatch = analysisText.match(/(\d+)\/100/);
    const verdictMatch = analysisText.match(
      /Overall verdict:\s*(SAFE|UNSAFE)/i
    );

    let score = 50; // Default medium score

    if (scoreMatch) {
      score = parseInt(scoreMatch[1]);
    } else if (riskMatch) {
      const riskLevel = riskMatch[1].toUpperCase();
      switch (riskLevel) {
        case "LOW":
          score = 85;
          break;
        case "MEDIUM":
          score = 65;
          break;
        case "HIGH":
          score = 25;
          break;
      }
    } else if (verdictMatch) {
      score = verdictMatch[1].toUpperCase() === "SAFE" ? 85 : 25;
    }

    return Math.max(0, Math.min(100, score)); // Ensure score is 0-100
  } catch (error) {
    console.error("Error extracting security score:", error);
    return 50; // Default to medium risk
  }
};

// Determine security level based on score
const getSecurityLevel = (score) => {
  if (score >= SECURITY_THRESHOLDS.HIGH) return "HIGH";
  if (score >= SECURITY_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
};

// Create a new rental session request
export const createSession = async (req, res) => {
  try {
    const { deviceId, language } = req.body;

    // Check if device exists and is available
    const device = await Device.findById(deviceId);
    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });
    }

    if (!device.isAvailable) {
      return res
        .status(400)
        .json({ success: false, message: "Device is not available for rent" });
    }

    // Check if the renter is not the owner
    if (device.owner.toString() === req.userId) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot rent your own device" });
    }

    // Generate encryption key for this session
    const sessionKey = generateSessionKey(req.userId, deviceId);

    // Create a new session
    const session = new Session({
      renter: req.userId,
      device: deviceId,
      language: language || "python",
      encryptionKey: sessionKey,
      status: "requested",
    });

    await session.save();

    return res.status(201).json({
      success: true,
      message: "Rental request created successfully",
      sessionId: session._id,
      encryptionKey: sessionKey, // Send to renter for code encryption
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all sessions for a device owner
export const getOwnerSessions = async (req, res) => {
  try {
    // Find all devices owned by the user
    const devices = await Device.find({ owner: req.userId });
    const deviceIds = devices.map((device) => device._id);

    // Find all sessions for these devices
    const sessions = await Session.find({ device: { $in: deviceIds } })
      .populate("renter", "name email")
      .populate("device", "deviceName deviceType")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error("Error getting owner sessions:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all sessions for a renter
export const getRenterSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ renter: req.userId })
      .populate("device", "deviceName deviceType specs performance owner")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error("Error getting renter sessions:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Accept or reject a session request
export const updateSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    if (!["active", "completed", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const session = await Session.findById(sessionId).populate("device");
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Verify that the requester is the device owner
    if (session.device.owner.toString() !== req.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (status === "active") {
      session.startTime = new Date();
    } else if (status === "completed") {
      // Ensure startTime is set
      if (!session.startTime) {
        session.startTime = session.createdAt; // fallback or set manually
      }

      session.endTime = new Date();

      const hoursUsed =
        (session.endTime - session.startTime) / (1000 * 60 * 60);
      session.cost = session.device.price * hoursUsed;
    }

    session.status = status;
    await session.save();

    return res
      .status(200)
      .json({ success: true, message: `Session ${status}`, session });
  } catch (error) {
    console.error("Error updating session status:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Upload and encrypt code from renter with ML security analysis
export const uploadCode = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code, requirements } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "No code provided" });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Verify the requester is the renter
    if (session.renter.toString() !== req.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    // Only allow uploads for active sessions
    if (session.status !== "active") {
      return res.status(400).json({
        success: false,
        message: `Cannot upload code to a session in ${session.status} status`,
      });
    }

    // STEP 1: Analyze code for security risks using enhanced ML + static analysis
    console.log("Starting enhanced security analysis for session:", sessionId);

    const analysisResult = await analyzeCodeEnhanced(code);

    if (!analysisResult.success) {
      console.error("Code analysis failed:", analysisResult.error);
      return res.status(500).json({
        success: false,
        message: "Security analysis failed. Please try again later.",
        error: analysisResult.error,
      });
    }

    // STEP 2: Extract structured security data from enhanced analysis
    const {
      riskLevel,
      securityScore,
      verdict,
      riskFactors = [],
      recommendations = [],
      summary,
    } = analysisResult.analysis;

    const securityLevel = riskLevel; // Already in correct format from enhanced analysis

    console.log(
      `Security Analysis Complete - Score: ${securityScore}, Level: ${securityLevel}, Verdict: ${verdict}`
    );

    // STEP 3: Check if code meets minimum security requirements
    if (verdict === "UNSAFE" || securityScore < SECURITY_THRESHOLDS.MEDIUM) {
      // Code is too risky, reject the upload
      session.analysisResult = {
        analysis: summary || analysisResult.rawResponse,
        securityScore: securityScore,
        securityLevel: securityLevel,
        verdict: "REJECTED",
        analyzedAt: new Date(),
        riskFactors: riskFactors,
        recommendations: recommendations,
      };
      session.executionStatus = "rejected";
      session.output = `Code rejected due to security concerns. Security score: ${securityScore}/100 (${securityLevel} risk). Risk factors: ${riskFactors.join(
        ", "
      )}`;

      await session.save();

      return res.status(400).json({
        success: false,
        message: `Code rejected due to security concerns`,
        securityAnalysis: {
          score: securityScore,
          level: securityLevel,
          verdict: "REJECTED",
          riskFactors: riskFactors,
          recommendations: recommendations,
        },
      });
    }

    // STEP 4: Code passed security check, proceed with encryption
    const encryptedData = encryptCode(code, session.encryptionKey);

    // STEP 5: Store encrypted code, analysis results, and execution request
    session.encryptedCode = encryptedData.encrypted;
    session.iv = encryptedData.iv;
    session.authTag = encryptedData.authTag;
    session.requirements =
      requirements || "numpy\npandas\nscikit-learn\nmatplotlib\n";
    session.executionStatus = "pending";
    session.output = `Code uploaded successfully. Security Score: ${securityScore}/100 (${securityLevel} risk). Waiting for execution on lender device...`;

    // Store complete analysis result in database
    session.analysisResult = {
      analysis: summary || analysisResult.rawResponse,
      securityScore: securityScore,
      securityLevel: securityLevel,
      verdict: "APPROVED",
      analyzedAt: new Date(),
      riskFactors: riskFactors,
      recommendations: recommendations,
    };

    await session.save();

    return res.status(200).json({
      success: true,
      message:
        "Code uploaded, analyzed, and encrypted successfully. Waiting for lender to execute.",
      sessionId: sessionId,
      securityAnalysis: {
        score: securityScore,
        level: securityLevel,
        verdict: "APPROVED",
        riskFactors: riskFactors,
        recommendations: recommendations,
      },
    });
  } catch (error) {
    console.error("Error uploading code:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get pending execution requests for lender (now includes security info)
export const getPendingExecution = async (req, res) => {
  try {
    // Find all devices owned by the user
    const devices = await Device.find({ owner: req.userId });
    const deviceIds = devices.map((device) => device._id);

    // Find active sessions with pending execution
    const sessions = await Session.find({
      device: { $in: deviceIds },
      status: "active",
      executionStatus: "pending",
      encryptedCode: { $exists: true },
    })
      .populate("renter", "name email")
      .populate("device", "deviceName deviceType")
      .sort({ updatedAt: -1 });

    // Include security analysis in response for lender's decision
    const sessionsWithSecurity = sessions.map((session) => ({
      ...session.toObject(),
      securityInfo: session.analysisResult
        ? {
            score: session.analysisResult.securityScore,
            level: session.analysisResult.securityLevel,
            analyzedAt: session.analysisResult.analyzedAt,
          }
        : null,
    }));

    return res
      .status(200)
      .json({ success: true, sessions: sessionsWithSecurity });
  } catch (error) {
    console.error("Error getting pending executions:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Execute code on lender's device (with security verification)
export const executeCodeOnLender = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { forceExecute } = req.body; // Optional parameter to force execution despite security warnings

    const session = await Session.findById(sessionId).populate("device");
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Verify that the requester is the device owner (lender)
    if (session.device.owner.toString() !== req.userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized - you must be the device owner",
      });
    }

    if (!session.encryptedCode) {
      return res
        .status(400)
        .json({ success: false, message: "No code to execute" });
    }

    // Additional security check before execution
    if (
      session.analysisResult &&
      session.analysisResult.securityScore < SECURITY_THRESHOLDS.MEDIUM &&
      !forceExecute
    ) {
      return res.status(400).json({
        success: false,
        message: "Code execution blocked due to security concerns",
        securityScore: session.analysisResult.securityScore,
        securityLevel: session.analysisResult.securityLevel,
        hint: "Add 'forceExecute: true' to override this warning (not recommended)",
      });
    }

    try {
      // Update status to executing
      session.executionStatus = "executing";
      session.output = "Executing code on lender device...";
      await session.save();

      // Decrypt the code using session key
      const decryptedCode = decryptCode(
        {
          encrypted: session.encryptedCode,
          iv: session.iv,
          authTag: session.authTag,
        },
        session.encryptionKey
      );

      // Create a unique directory for this session on LENDER'S device
      const sessionDir = path.join(
        __dirname,
        "..",
        "lender-executions",
        sessionId
      );
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // Save the decrypted code temporarily (only on lender's server)
      const filePath = path.join(sessionDir, "code.py");
      fs.writeFileSync(filePath, decryptedCode);

      // Determine optimal base image and additional packages
      const requirements = session.requirements || "numpy\npandas";
      const baseImageInfo = getBestBaseImage(requirements);
      const additionalPackages = getAdditionalPackages(
        requirements,
        baseImageInfo.category
      );

      console.log(`🎯 Optimization analysis for session ${sessionId}:`);
      console.log(`   Base image: ${baseImageInfo.image}`);
      console.log(
        `   Pre-installed packages: ${baseImageInfo.matchInfo.matches}`
      );
      console.log(
        `   Additional packages needed: ${additionalPackages.length}`
      );
      console.log(
        `   Additional packages: ${
          additionalPackages.length > 0 ? additionalPackages.join(", ") : "None"
        }`
      );

      // Check if base image exists
      let baseImageExists = false;
      try {
        await docker.getImage(baseImageInfo.image).inspect();
        baseImageExists = true;
        console.log(`✅ Base image ${baseImageInfo.image} is ready`);
      } catch (error) {
        console.log(
          `⚠️  Base image ${baseImageInfo.image} not found, falling back to basic Python image`
        );
        baseImageExists = false;
      }

      // Create optimized Dockerfile
      const dockerfilePath = path.join(sessionDir, "Dockerfile");
      let dockerfileContent;

      if (!baseImageExists) {
        // Fallback to basic Python image if base image not available
        dockerfileContent = `FROM python:3.9-slim
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY code.py requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "code.py"]`;

        // Create full requirements file
        const requirementsPath = path.join(sessionDir, "requirements.txt");
        fs.writeFileSync(requirementsPath, requirements);
      } else if (additionalPackages.length > 0) {
        // Use base image with additional packages
        const additionalReqPath = path.join(
          sessionDir,
          "additional_requirements.txt"
        );
        fs.writeFileSync(additionalReqPath, additionalPackages.join("\n"));

        dockerfileContent = `FROM ${baseImageInfo.image}
COPY code.py additional_requirements.txt ./
RUN pip install --no-cache-dir -r additional_requirements.txt
CMD ["python", "code.py"]`;
      } else {
        // Perfect optimization - no additional packages needed
        dockerfileContent = `FROM ${baseImageInfo.image}
COPY code.py ./
CMD ["python", "code.py"]`;
      }

      fs.writeFileSync(dockerfilePath, dockerfileContent);

      // Generate unique execution ID and image name
      const executionId = `exec-${sessionId}-${Date.now()}`;
      const executionImageName = `lender-execution-${executionId}`;

      console.log(`🔨 Building Docker image: ${executionImageName}`);

      // Build optimized Docker image with proper error handling
      let buildFiles;
      if (!baseImageExists) {
        buildFiles = ["Dockerfile", "code.py", "requirements.txt"];
      } else if (additionalPackages.length > 0) {
        buildFiles = ["Dockerfile", "code.py", "additional_requirements.txt"];
      } else {
        buildFiles = ["Dockerfile", "code.py"];
      }

      console.log(`   Build files: ${buildFiles.join(", ")}`);

      // Verify all build files exist
      for (const file of buildFiles) {
        const filePath = path.join(sessionDir, file);
        if (!fs.existsSync(filePath)) {
          console.error(`❌ Build file missing: ${filePath}`);
          throw new Error(`Required build file missing: ${file}`);
        }
      }

      const buildStart = Date.now();

      let buildStream;
      try {
        // Create tar stream for build context
        buildStream = await docker.buildImage(
          {
            context: sessionDir,
            src: buildFiles,
          },
          {
            t: executionImageName,
            rm: true, // Remove intermediate containers
            forcerm: true, // Always remove intermediate containers
            pull: false, // Don't pull base image if exists locally
            dockerfile: "Dockerfile",
          }
        );
      } catch (buildError) {
        console.error(`❌ Failed to start Docker build:`, buildError);
        throw new Error(`Docker build failed to start: ${buildError.message}`);
      }

      // Wait for build to complete with better error handling
      let buildSuccess = false;
      await new Promise((resolve, reject) => {
        docker.modem.followProgress(
          buildStream,
          (err, res) => {
            if (err) {
              console.error(`❌ Docker build failed:`, err);
              reject(
                new Error(
                  `Docker build failed: ${err.message || "Unknown build error"}`
                )
              );
            } else {
              console.log(`✅ Docker build completed successfully`);
              buildSuccess = true;
              resolve(res);
            }
          },
          (event) => {
            // Log build progress
            if (event.stream) {
              const message = event.stream.trim();
              if (message) {
                console.log("Build:", message);
              }
            }
            if (event.error) {
              console.error("Build error:", event.error);
            }
            if (event.errorDetail) {
              console.error("Build error detail:", event.errorDetail);
            }
          }
        );
      });

      if (!buildSuccess) {
        throw new Error("Docker build did not complete successfully");
      }

      const buildTime = Date.now() - buildStart;
      console.log(
        `⚡ Docker build completed in ${buildTime}ms (optimized with base image)`
      );

      // Add a small delay before image verification
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify the image exists before creating container
      let imageExists = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!imageExists && retryCount < maxRetries) {
        try {
          await docker.getImage(executionImageName).inspect();
          console.log(`✅ Verified image ${executionImageName} exists`);
          imageExists = true;
        } catch (error) {
          retryCount++;
          console.warn(
            `⚠️ Image verification attempt ${retryCount} failed:`,
            error.message
          );

          if (retryCount < maxRetries) {
            console.log(`⏳ Retrying image verification in 2 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      if (!imageExists) {
        // List all images for debugging
        try {
          const images = await docker.listImages();
          console.log("Available images:");
          images.forEach((img) => {
            console.log(
              `  - ${img.RepoTags ? img.RepoTags.join(", ") : "untagged"}`
            );
          });
        } catch (listError) {
          console.error("Failed to list images:", listError);
        }

        throw new Error(
          `Built image verification failed: ${executionImageName} does not exist after ${maxRetries} attempts`
        );
      }

      // Run the container with resource limits on LENDER'S device
      const container = await docker.createContainer({
        Image: executionImageName,
        Tty: true,
        AttachStdout: true,
        AttachStderr: true,
        HostConfig: {
          Memory: 512 * 1024 * 1024, // 512MB limit
          CpuShares: 512, // Limit CPU usage
          NetworkMode: "none", // No network access for security
        },
      });

      const execStart = Date.now();
      await container.start();

      // Get container output with timeout
      const stream2 = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
      });

      let output = "";
      const timeout = setTimeout(() => {
        container.kill();
        output += "\n[EXECUTION TIMEOUT - Process killed after 30 seconds]";
      }, 30000); // 30 second timeout

      stream2.on("data", (chunk) => {
        output += chunk.toString();
      });

      // Wait for container to finish
      await container.wait();
      clearTimeout(timeout);

      const execTime = Date.now() - execStart;
      console.log(`🏁 Code execution completed in ${execTime}ms`);

      // Clean up container and execution image (but keep base images)
      try {
        await container.remove();
        console.log(`🧹 Container removed successfully`);
      } catch (removeError) {
        console.error(`⚠️  Failed to remove container:`, removeError);
        // Don't throw error here, execution was successful
      }

      try {
        await docker.getImage(executionImageName).remove();
        console.log(`🧹 Execution image removed successfully`);
      } catch (imageRemoveError) {
        console.error(
          `⚠️  Failed to remove execution image:`,
          imageRemoveError
        );
        // Don't throw error here, execution was successful
      }

      // Clean up temporary files immediately for security
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
        console.log(`🧹 Temporary files cleaned up`);
      } catch (cleanupError) {
        console.error(`⚠️  Failed to clean up temporary files:`, cleanupError);
        // Don't throw error here, execution was successful
      }

      // Add performance info to output
      const optimizationLevel = !baseImageExists
        ? "FALLBACK - Using basic Python image"
        : additionalPackages.length === 0
        ? "MAXIMUM - No additional packages needed!"
        : "OPTIMIZED - Minimal package downloads";

      const usedImage = baseImageExists
        ? baseImageInfo.image
        : "python:3.9-slim";
      const packageCount = baseImageExists
        ? additionalPackages.length
        : requirements.split("\n").filter((p) => p.trim()).length;

      const performanceInfo = `\n\n--- EXECUTION STATS ---\nBuild time: ${buildTime}ms\nExecution time: ${execTime}ms\nBase image: ${usedImage}\nPackages installed: ${packageCount}\nOptimization: ${optimizationLevel}`;

      // Save output to session (code itself is never stored permanently)
      session.output = (output || "No output generated") + performanceInfo;
      session.executionStatus = "completed";
      session.executedAt = new Date();

      // Clear encrypted code after execution for privacy
      session.encryptedCode = undefined;
      session.iv = undefined;
      session.authTag = undefined;

      await session.save();

      return res.status(200).json({
        success: true,
        message: "Code executed successfully on lender device",
        output: (output || "No output generated") + performanceInfo,
        performanceStats: {
          buildTimeMs: buildTime,
          executionTimeMs: execTime,
          baseImage: usedImage,
          additionalPackages: packageCount,
          optimization: optimizationLevel,
        },
        securityInfo: session.analysisResult
          ? {
              score: session.analysisResult.securityScore,
              level: session.analysisResult.securityLevel,
            }
          : null,
      });
    } catch (executionError) {
      console.error("Execution error:", executionError);

      // Clean up on error
      const sessionDir = path.join(
        __dirname,
        "..",
        "lender-executions",
        sessionId
      );
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }

      // Try to clean up any created images
      try {
        // Look for any images with the session ID pattern
        const images = await docker.listImages({
          filters: { reference: [`lender-execution-exec-${sessionId}-*`] },
        });

        for (const image of images) {
          try {
            await docker.getImage(image.Id).remove();
            console.log(`🧹 Cleaned up execution image: ${image.Id}`);
          } catch (removeError) {
            console.error(
              `⚠️  Failed to remove image ${image.Id}:`,
              removeError
            );
          }
        }
      } catch (e) {
        console.error(`⚠️  Error during image cleanup:`, e);
      }

      // Update session with error
      session.output = `Execution Error: ${executionError.message}`;
      session.executionStatus = "error";
      await session.save();

      return res.status(500).json({
        success: false,
        message: "Code execution failed",
        error: executionError.message,
      });
    }
  } catch (error) {
    console.error("Error in executeCodeOnLender:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get execution result (now includes security analysis)
export const getExecutionResult = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Verify the requester is authorized (either renter or device owner)
    const device = await Device.findById(session.device);
    if (
      session.renter.toString() !== req.userId &&
      device.owner.toString() !== req.userId
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    return res.status(200).json({
      success: true,
      result: session.output || "No output available",
      executionStatus: session.executionStatus || "pending",
      securityAnalysis: session.analysisResult
        ? {
            score: session.analysisResult.securityScore,
            level: session.analysisResult.securityLevel,
            verdict: session.analysisResult.verdict,
            analyzedAt: session.analysisResult.analyzedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Error getting execution result:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get security analytics for device owner/platform admin
export const getSecurityAnalytics = async (req, res) => {
  try {
    const { timeframe = "30d", deviceId } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build query filters
    let matchQuery = {
      "analysisResult.analyzedAt": { $gte: startDate },
      analysisResult: { $exists: true },
    };

    // If deviceId specified, filter by user's devices
    if (deviceId) {
      const device = await Device.findById(deviceId);
      if (!device || device.owner.toString() !== req.userId) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }
      matchQuery.device = deviceId;
    } else {
      // Get all user's devices
      const devices = await Device.find({ owner: req.userId });
      const deviceIds = devices.map((device) => device._id);
      matchQuery.device = { $in: deviceIds };
    }

    // Aggregate security analytics
    const analytics = await Session.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalAnalyzed: { $sum: 1 },
          averageScore: { $avg: "$analysisResult.securityScore" },
          highRiskCount: {
            $sum: {
              $cond: [{ $eq: ["$analysisResult.securityLevel", "HIGH"] }, 1, 0],
            },
          },
          mediumRiskCount: {
            $sum: {
              $cond: [
                { $eq: ["$analysisResult.securityLevel", "MEDIUM"] },
                1,
                0,
              ],
            },
          },
          lowRiskCount: {
            $sum: {
              $cond: [{ $eq: ["$analysisResult.securityLevel", "LOW"] }, 1, 0],
            },
          },
          rejectedCount: {
            $sum: {
              $cond: [{ $eq: ["$analysisResult.verdict", "REJECTED"] }, 1, 0],
            },
          },
          approvedCount: {
            $sum: {
              $cond: [{ $eq: ["$analysisResult.verdict", "APPROVED"] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Get common risk factors
    const riskFactorAnalysis = await Session.aggregate([
      { $match: matchQuery },
      { $unwind: "$analysisResult.riskFactors" },
      {
        $group: {
          _id: "$analysisResult.riskFactors",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get score distribution
    const scoreDistribution = await Session.aggregate([
      { $match: matchQuery },
      {
        $bucket: {
          groupBy: "$analysisResult.securityScore",
          boundaries: [0, 20, 40, 60, 80, 100],
          default: "other",
          output: {
            count: { $sum: 1 },
            averageScore: { $avg: "$analysisResult.securityScore" },
          },
        },
      },
    ]);

    // Recent high-risk sessions
    const recentHighRisk = await Session.find({
      ...matchQuery,
      "analysisResult.securityLevel": "HIGH",
    })
      .populate("renter", "name email")
      .populate("device", "deviceName")
      .sort({ "analysisResult.analyzedAt": -1 })
      .limit(5)
      .select("analysisResult renter device createdAt");

    const result = {
      summary: analytics[0] || {
        totalAnalyzed: 0,
        averageScore: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        rejectedCount: 0,
        approvedCount: 0,
      },
      riskFactors: riskFactorAnalysis.map((rf) => ({
        factor: rf._id,
        count: rf.count,
      })),
      scoreDistribution: scoreDistribution,
      recentHighRisk: recentHighRisk,
      timeframe: timeframe,
      generatedAt: new Date(),
    };

    return res.status(200).json({ success: true, analytics: result });
  } catch (error) {
    console.error("Error getting security analytics:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get detailed analysis for a specific session
export const getSessionAnalysis = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId)
      .populate("renter", "name email")
      .populate("device", "deviceName deviceType")
      .select("analysisResult renter device createdAt executionStatus status");

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // Verify authorization (device owner or renter)
    const device = await Device.findById(session.device._id);
    if (
      device.owner.toString() !== req.userId &&
      session.renter._id.toString() !== req.userId
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (!session.analysisResult) {
      return res
        .status(404)
        .json({ success: false, message: "No analysis data available" });
    }

    return res.status(200).json({
      success: true,
      session: {
        id: session._id,
        renter: session.renter,
        device: session.device,
        createdAt: session.createdAt,
        status: session.status,
        executionStatus: session.executionStatus,
        analysis: session.analysisResult,
      },
    });
  } catch (error) {
    console.error("Error getting session analysis:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add endpoint to rebuild base images (for maintenance)
export const rebuildBaseImages = async (req, res) => {
  try {
    // Only allow device owners to trigger rebuilds
    const devices = await Device.find({ owner: req.userId });
    if (devices.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Only device owners can rebuild base images",
      });
    }

    console.log("🔄 Rebuilding all base images...");

    // Remove existing base images
    for (const category of Object.keys(COMMON_PACKAGES)) {
      try {
        await docker.getImage(`lender-base-${category}`).remove();
        baseImagesReady[category] = false;
      } catch (e) {
        // Image might not exist
      }
    }

    // Rebuild all base images
    await initializeBaseImages();

    return res.status(200).json({
      success: true,
      message: "Base images rebuilt successfully",
      readyImages: Object.keys(baseImagesReady).filter(
        (cat) => baseImagesReady[cat]
      ),
    });
  } catch (error) {
    console.error("Error rebuilding base images:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Add endpoint to check base image status
export const getBaseImageStatus = async (req, res) => {
  try {
    const status = {};

    for (const [category, packages] of Object.entries(COMMON_PACKAGES)) {
      const imageName = `lender-base-${category}`;
      let imageExists = false;
      let imageSize = 0;

      try {
        const imageInfo = await docker.getImage(imageName).inspect();
        imageExists = true;
        imageSize = imageInfo.Size;
      } catch (e) {
        // Image doesn't exist
      }

      status[category] = {
        ready: baseImagesReady[category],
        exists: imageExists,
        packages: packages,
        packageCount: packages.length,
        sizeBytes: imageSize,
        sizeMB: Math.round(imageSize / (1024 * 1024)),
      };
    }

    return res.status(200).json({
      success: true,
      baseImages: status,
      totalReady: Object.values(baseImagesReady).filter((ready) => ready)
        .length,
      totalCategories: Object.keys(COMMON_PACKAGES).length,
    });
  } catch (error) {
    console.error("Error getting base image status:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
