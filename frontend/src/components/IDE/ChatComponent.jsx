import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2, User, Cpu } from 'lucide-react';
import { useAuthStore } from '../../store/authStore'; // Adjust path as needed

const ChatSidepanel = ({ sessionId, isLender = false, isVisible = true, onToggle }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const messagesEndRef = useRef(null);
  
  // Get user from auth store
  const { user, isAuthenticated } = useAuthStore();
  
  const API_BASE =  import.meta.env.VITE_API_URL

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages on component mount and session change
  useEffect(() => {
    if (sessionId && isVisible && isAuthenticated) {
      fetchMessages();
      fetchUnreadCount();
      
      // Set up polling for new messages every 3 seconds
      const messagePolling = setInterval(() => {
        fetchMessages();
        if (!isExpanded) {
          fetchUnreadCount();
        }
      }, 3000);

      return () => clearInterval(messagePolling);
    }
  }, [sessionId, isVisible, isExpanded, isAuthenticated]);

  // Mark messages as read when panel is expanded
  useEffect(() => {
    if (isExpanded && sessionId && unreadCount > 0 && isAuthenticated) {
      markMessagesAsRead();
    }
  }, [isExpanded, sessionId, isAuthenticated]);

  const fetchMessages = async () => {
    if (!isAuthenticated) {
      setConnectionStatus('error');
      return;
    }

    try {
      setConnectionStatus('connected');
      const response = await fetch(`${API_BASE}/api/chat/${sessionId}/messages`, {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setConnectionStatus('error');
    }
  };

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE}/api/chat/${sessionId}/unread`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markMessagesAsRead = async () => {
    if (!isAuthenticated) return;

    try {
      await fetch(`${API_BASE}/api/chat/${sessionId}/read`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading || !isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/chat/send`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          message: newMessage.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        // Refresh messages to show the new one
        await fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getSenderIcon = (senderType) => {
    return senderType === 'owner' ? Cpu : User;
  };

  const getSenderColor = (senderType) => {
    return senderType === 'owner' ? 'text-purple-400' : 'text-blue-400';
  };

  // Don't render if user is not authenticated
  if (!isAuthenticated || !isVisible) return null;

  return (
    <div className={`fixed right-4 top-20 bottom-4 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col z-50 transition-all duration-300 ${
      isExpanded ? 'h-[calc(100vh-6rem)]' : 'h-16'
    }`}>
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 rounded-t-lg flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <MessageSquare className="text-indigo-400" />
          <span className="text-white font-medium">Session Chat</span>
          {!isExpanded && unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Connection Status Indicator */}
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' : 
            connectionStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'
          }`} />
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          
          {onToggle && (
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-950">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="mx-auto mb-2 text-2xl" />
                <p>No messages yet</p>
                <p className="text-sm">Start a conversation with the {isLender ? 'renter' : 'device owner'}</p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = (isLender && message.senderType === 'owner') || 
                                   (!isLender && message.senderType === 'renter');
                const SenderIcon = getSenderIcon(message.senderType);
                
                return (
                  <div
                    key={message._id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${
                      isOwnMessage 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-800 text-gray-200'
                    } rounded-lg px-3 py-2`}>
                      {!isOwnMessage && (
                        <div className={`flex items-center space-x-1 mb-1 ${getSenderColor(message.senderType)}`}>
                          <SenderIcon size={12} />
                          <span className="text-xs font-medium">
                            {message.senderType === 'owner' ? 'Device Owner' : 'Renter'}
                          </span>
                        </div>
                      )}
                      
                      <p className="text-sm break-words">{message.message}</p>
                      
                      <div className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-indigo-200' : 'text-gray-500'
                      }`}>
                        {formatTime(message.createdAt)}
                        {!message.isRead && isOwnMessage && (
                          <span className="ml-1">●</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-700 bg-gray-900">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-indigo-500 text-sm"
                disabled={isLoading}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors flex items-center"
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
            
            {/* Character count */}
            <div className="text-xs text-gray-500 mt-1 text-right">
              {newMessage.length}/1000
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Usage example component showing how to integrate with existing dashboards
const SessionWithChat = ({ sessionId, isLender = false, children }) => {
  const [isChatVisible, setIsChatVisible] = useState(true);

  return (
    <div className="relative">
      {/* Main content area */}
      <div className={`transition-all duration-300 ${isChatVisible ? 'mr-84' : 'mr-0'}`}>
        {children}
      </div>
      
      {/* Chat Toggle Button (when chat is hidden) */}
      {!isChatVisible && (
        <button
          onClick={() => setIsChatVisible(true)}
          className="fixed right-4 top-20 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg z-50 transition-all duration-300"
        >
          <MessageSquare size={20} />
        </button>
      )}
      
      {/* Chat Sidepanel */}
      <ChatSidepanel
        sessionId={sessionId}
        isLender={isLender}
        isVisible={isChatVisible}
        onToggle={() => setIsChatVisible(false)}
      />
    </div>
  );
};

export default ChatSidepanel;
export { SessionWithChat };