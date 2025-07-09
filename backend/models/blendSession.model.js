import mongoose from "mongoose";

const blendsessionSchema = new mongoose.Schema(
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
      default: "blender",
    },
    blendFile: {
      type: String,
      default: "",
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
    cloudinaryUrls: [
      {
        filename: String,
        url: String,
        publicId: String
      }
    ]
  },
  { timestamps: true }
);

// Indexes for faster querying
blendsessionSchema.index({ renter: 1, status: 1 });
blendsessionSchema.index({ device: 1, status: 1 });

const BlendSession = mongoose.model("BlendSession", blendsessionSchema);
export default BlendSession;