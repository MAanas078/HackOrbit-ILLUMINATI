import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    senderType: {
      type: String,
      enum: ["renter", "owner"],
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
    // Add index for faster querying
    index: [
      { session: 1, createdAt: 1 },
      { session: 1, isRead: 1 }
    ]
  }
);

export const Chat = mongoose.model("Chat", chatSchema);