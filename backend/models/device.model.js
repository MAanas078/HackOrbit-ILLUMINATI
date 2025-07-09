import mongoose from "mongoose";

const deviceSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deviceName: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      required: true,
      enum: ["CPU", "GPU", "RAM", "Storage", "Full System"],
    },
    specs: {
      type: Map,
      of: String,
      required: true,
    },
    performance: {
      type: Number, // Normalized score for comparison
      required: true,
      default: 50,  // Default middle score if not calculated
    },
    price: {
      type: Number, // Price per hour
      required: true,
    },
    availableHours: [
      {
        start: Date,
        end: Date,
      },
    ],
    isAvailable: {
      type: Boolean,
      default: true,
    },
    location: {
      type: String, // Location info for latency considerations
      required: true,
    },
    acceptedTaskTypes: [String], // e.g. ["AI Training", "3D Rendering"]
  },
  { timestamps: true }
);

// Indexes for faster querying
deviceSchema.index({ isAvailable: 1, deviceType: 1 });
deviceSchema.index({ owner: 1 });

export const Device = mongoose.model("Device", deviceSchema);