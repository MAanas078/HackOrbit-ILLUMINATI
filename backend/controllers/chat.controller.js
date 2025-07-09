// controllers/chat.controller.js
import { Chat } from "../models/chat.model.js";
import { Session } from "../models/session.model.js";
import { Device } from "../models/device.model.js";

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    const senderId = req.userId;

    // Verify session exists and user is authorized
    const session = await Session.findById(sessionId).populate('device');
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Check if user is either renter or device owner
    const isRenter = session.renter.toString() === senderId;
    const isOwner = session.device.owner.toString() === senderId;

    if (!isRenter && !isOwner) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const chat = new Chat({
      session: sessionId,
      sender: senderId,
      message: message.trim(),
      senderType: isRenter ? 'renter' : 'owner'
    });

    await chat.save();
    
    // Populate sender info for response
    await chat.populate('sender', 'name email');

    return res.status(201).json({ 
      success: true, 
      message: "Message sent successfully",
      chat 
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get chat messages for a session
export const getChatMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    // Verify session exists and user is authorized
    const session = await Session.findById(sessionId).populate('device');
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Check if user is either renter or device owner
    const isRenter = session.renter.toString() === userId;
    const isOwner = session.device.owner.toString() === userId;

    if (!isRenter && !isOwner) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const messages = await Chat.find({ session: sessionId })
      .populate('sender', 'name email')
      .sort({ createdAt: 1 });

    return res.status(200).json({ 
      success: true, 
      messages 
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    // Verify session exists and user is authorized
    const session = await Session.findById(sessionId).populate('device');
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Check if user is either renter or device owner
    const isRenter = session.renter.toString() === userId;
    const isOwner = session.device.owner.toString() === userId;

    if (!isRenter && !isOwner) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Mark all messages as read for this user (messages not sent by them)
    await Chat.updateMany(
      { 
        session: sessionId, 
        sender: { $ne: userId },
        isRead: false 
      },
      { isRead: true }
    );

    return res.status(200).json({ 
      success: true, 
      message: "Messages marked as read" 
    });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.userId;

    const unreadCount = await Chat.countDocuments({
      session: sessionId,
      sender: { $ne: userId },
      isRead: false
    });

    return res.status(200).json({ 
      success: true, 
      unreadCount 
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};