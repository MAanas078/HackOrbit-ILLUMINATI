import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
  getUnreadCount
} from "../controllers/chat.controller.js";

const router = express.Router();

// Send a message
router.post("/send", verifyToken, sendMessage);

// Get chat messages for a session
router.get("/:sessionId/messages", verifyToken, getChatMessages);

// Mark messages as read
router.put("/:sessionId/read", verifyToken, markMessagesAsRead);

// Get unread message count
router.get("/:sessionId/unread", verifyToken, getUnreadCount);

export default router;