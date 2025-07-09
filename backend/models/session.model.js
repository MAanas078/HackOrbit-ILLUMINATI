import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },
    status: {
      type: String,
      enum: ["requested", "active", "completed", "rejected"],
      default: "requested",
    },
    startTime: Date,
    endTime: Date,
    language: {
      type: String,
      default: "python",
    },
    output: {
      type: String,
      default: "",
    },
    resourceUsage: {
      cpuPercent: Number,
      memoryUsage: Number,
      gpuUtilization: Number,
    },
    cost: {
      type: Number,
      default: 0,
    },
    // New fields for remote execution and encryption
    encryptionKey: {
      type: String,
      required: true,
    },
    encryptedCode: {
      type: String, // Temporarily stores encrypted code
    },
    iv: {
      type: String, // Initialization vector for encryption
    },
    authTag: {
      type: String, // Authentication tag for encryption
    },
    requirements: {
      type: String, // Python requirements for the code
      default: 'numpy\npandas\nscikit-learn\nmatplotlib\n'
    },
    executionStatus: {
      type: String,
      enum: ["pending", "executing", "completed", "error", "rejected"],
      default: "pending",
    },
    executedAt: Date, // When the code was executed on lender device
    
    // NEW: ML Analysis Result fields
    analysisResult: {
      analysis: {
        type: String, // Full ML analysis text
        required: false
      },
      securityScore: {
        type: Number, // 0-100 security score
        min: 0,
        max: 100,
        required: false
      },
      securityLevel: {
        type: String, // HIGH, MEDIUM, LOW
        enum: ["HIGH", "MEDIUM", "LOW"],
        required: false
      },
      verdict: {
        type: String, // APPROVED, REJECTED, PENDING
        enum: ["APPROVED", "REJECTED", "PENDING"],
        required: false
      },
      analyzedAt: {
        type: Date, // When the analysis was performed
        required: false
      },
      riskFactors: [{
        type: String // Array of identified risk factors
      }],
      recommendations: [{
        type: String // Array of security recommendations
      }]
    }
  },
  { timestamps: true }
);

// Indexes for faster querying
sessionSchema.index({ renter: 1, status: 1 });
sessionSchema.index({ device: 1, status: 1 });
sessionSchema.index({ device: 1, executionStatus: 1 }); // New index for pending executions
sessionSchema.index({ "analysisResult.securityLevel": 1 }); // Index for security queries
sessionSchema.index({ "analysisResult.securityScore": 1 }); // Index for score-based queries

// Pre-save middleware to clear sensitive data after execution
sessionSchema.pre('save', function(next) {
  // If execution is completed or errored, clear encrypted code for privacy
  if (this.executionStatus === 'completed' || this.executionStatus === 'error') {
    this.encryptedCode = undefined;
    this.iv = undefined;
    this.authTag = undefined;
  }
  next();
});

// Virtual field to get security status summary
sessionSchema.virtual('securitySummary').get(function() {
  if (!this.analysisResult) return null;
  
  return {
    score: this.analysisResult.securityScore,
    level: this.analysisResult.securityLevel,
    safe: this.analysisResult.securityScore >= 50,
    verdict: this.analysisResult.verdict
  };
});

// Static method to find sessions by security level
sessionSchema.statics.findBySecurityLevel = function(level) {
  return this.find({ 
    "analysisResult.securityLevel": level.toUpperCase(),
    "analysisResult.verdict": "APPROVED"
  });
};

// Static method to find high-risk sessions
sessionSchema.statics.findHighRiskSessions = function() {
  return this.find({
    $or: [
      { "analysisResult.securityScore": { $lt: 50 } },
      { "analysisResult.securityLevel": "LOW" }
    ]
  });
};

// Instance method to check if session is safe to execute
sessionSchema.methods.isSafeToExecute = function() {
  if (!this.analysisResult) return false;
  return this.analysisResult.securityScore >= 50 && 
         this.analysisResult.verdict === "APPROVED";
};

export const Session = mongoose.model("Session", sessionSchema);