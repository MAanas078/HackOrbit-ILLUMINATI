import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageCircle, Loader2, Calendar, DollarSign, Cpu, HardDrive } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const DeviceChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hi! I'm your device rental assistant. I can help you find the perfect device for your needs. What type of device are you looking for?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const messagesEndRef = useRef(null);

  // Get auth state from Zustand store
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authLoading = useAuthStore((state) => state.isLoading);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // API Configuration
 

  const systemPrompt = `You are a helpful device rental assistant. Your job is to help users find suitable devices for rent based on their requirements.

  When a user asks about devices, you should:
  1. Ask clarifying questions about their needs (device type, performance requirements, budget, etc.)
  2. Based on their requirements, I'll provide you with available devices from the database
  3. Present the devices in a friendly, conversational way
  4. Help them understand which device might be best for their specific needs

  Keep responses conversational and helpful. If you need more information to make a good recommendation, ask follow-up questions.

  Device types available: desktop, laptop, server, workstation
  Always be encouraging and focus on finding the best match for their needs.`;

  const fetchAvailableDevices = async (requirements = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}/device/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requirements),
        credentials: 'include' // Use cookies for auth instead of bearer token
      });
      
      if (response.ok) {
        const devices = await response.json();
        setAvailableDevices(devices);
        return devices;
      }
      return [];
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  };

  const createRentalSession = async (deviceId) => {
    if (!isAuthenticated) {
      addMessage('bot', `Hi there! To rent a device, you'll need to be logged in. ${user ? `I see you're signed in as ${user.name}` : 'Please log in to continue with your rental.'}`);
      return;
    }

    if (authLoading) {
      addMessage('bot', "Please wait while we verify your authentication...");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookies instead of Authorization header
        body: JSON.stringify({
          deviceId: deviceId,
          startTime: new Date(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        })
      });

      if (response.ok) {
        const session = await response.json();
        addMessage('bot', `Great! I've created your rental session for you, ${user.name}. Session ID: ${session._id}. The device owner will be notified and you'll receive confirmation once approved.`);
      } else if (response.status === 401) {
        addMessage('bot', "It looks like your session has expired. Please log in again to continue.");
      } else {
        addMessage('bot', "Sorry, there was an issue creating your rental session. Please try again or contact support.");
      }
    } catch (error) {
      console.error('Error creating session:', error);
      addMessage('bot', "Sorry, there was an issue creating your rental session. Please try again.");
    }
  };

  const parseUserRequirements = (message) => {
    const requirements = {};
    const lowerMessage = message.toLowerCase();

    // Device type detection
    if (lowerMessage.includes('desktop')) requirements.deviceType = 'desktop';
    else if (lowerMessage.includes('laptop')) requirements.deviceType = 'laptop';
    else if (lowerMessage.includes('server')) requirements.deviceType = 'server';
    else if (lowerMessage.includes('workstation')) requirements.deviceType = 'workstation';

    // Budget detection
    const budgetMatch = message.match(/\$?(\d+)/);
    if (budgetMatch) {
      requirements.maxPrice = parseInt(budgetMatch[1]);
    }

    // Performance requirements
    if (lowerMessage.includes('high performance') || lowerMessage.includes('gaming') || lowerMessage.includes('ai') || lowerMessage.includes('machine learning')) {
      requirements.minPerformance = 80;
    } else if (lowerMessage.includes('medium') || lowerMessage.includes('development')) {
      requirements.minPerformance = 50;
    }

    return requirements;
  };

  const addMessage = (type, content, devices = null) => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      devices,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage('user', userMessage);
    setIsLoading(true);

    try {
      // Parse user requirements and fetch devices
      const requirements = parseUserRequirements(userMessage);
      let devices = [];
      
      if (Object.keys(requirements).length > 0) {
        devices = await fetchAvailableDevices(requirements);
      }

      // Prepare context for the AI
      let contextPrompt = userMessage;
      if (devices.length > 0) {
        contextPrompt += `\n\nAvailable devices matching requirements:\n${devices.map(device => 
          `- ${device.deviceName} (${device.deviceType}): $${device.price}/day, Performance: ${device.performance}/100, Location: ${device.location}`
        ).join('\n')}`;
      }

      // Add user context to the prompt
      if (isAuthenticated && user) {
        contextPrompt += `\n\nUser context: User is logged in as ${user.name} (${user.email})`;
      } else {
        contextPrompt += `\n\nUser context: User is not logged in`;
      }

      // Get AI response
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: contextPrompt }
          ],
          temperature: 0.1,
          max_tokens: 1000
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse = data.choices[0].message.content;
        
        // Add bot response with devices if found
        addMessage('bot', botResponse, devices.length > 0 ? devices.slice(0, 3) : null);
      } else {
        addMessage('bot', "I'm having trouble processing your request right now. Please try again in a moment.");
      }
    } catch (error) {
      console.error('Error:', error);
      addMessage('bot', "Sorry, I encountered an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const DeviceCard = ({ device }) => (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-3 shadow-lg">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-white">{device.deviceName}</h4>
        <span className="bg-indigo-900 text-indigo-200 text-xs px-2 py-1 rounded-full">
          {device.deviceType}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-gray-300">
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4" />
          <span>${device.price}/day</span>
        </div>
        <div className="flex items-center gap-1">
          <Cpu className="w-4 h-4" />
          <span>{device.performance}/100</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{device.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <HardDrive className="w-4 h-4" />
          <span className={`px-2 py-1 rounded-full text-xs ${device.isAvailable ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {device.isAvailable ? 'Available' : 'Busy'}
          </span>
        </div>
      </div>

      {device.specs && (
        <div className="mb-3 text-xs text-gray-400">
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(device.specs).slice(0, 4).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {value}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => createRentalSession(device._id)}
        disabled={!device.isAvailable || !isAuthenticated}
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          device.isAvailable && isAuthenticated
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
        }`}
      >
        {!isAuthenticated 
          ? 'Login to Rent' 
          : device.isAvailable 
            ? 'Rent This Device' 
            : 'Not Available'
        }
      </button>
    </div>
  );

  const MessageBubble = ({ message }) => (
    <div className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start gap-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          message.type === 'user' ? 'bg-indigo-600' : 'bg-gray-700'
        }`}>
          {message.type === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
        </div>
        <div className={`rounded-lg p-3 ${
          message.type === 'user' 
            ? 'bg-indigo-600 text-white' 
            : 'bg-gray-800 text-gray-100'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          {message.devices && (
            <div className="mt-3">
              {message.devices.map(device => (
                <DeviceCard key={device._id} device={device} />
              ))}
            </div>
          )}
          <p className="text-xs opacity-70 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Widget Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-black rounded-lg shadow-2xl w-96 h-[500px] flex flex-col border border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Device Rental Assistant</h3>
                {isAuthenticated && user && (
                  <p className="text-xs opacity-80">Welcome, {user.name}!</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-indigo-700 rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-sm text-gray-300">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-700 bg-black">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me about device rentals..."
                className="flex-1 border border-gray-600 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white rounded-lg p-2 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceChatbot;