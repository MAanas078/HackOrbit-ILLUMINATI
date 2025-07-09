import { useState, useEffect, useRef } from 'react';
import { chatWithRepository, searchCode } from '../services/api';

const RepoChat = ({ sessionId }) => {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Welcome! You can now chat with your repository.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Check if it's a search query
      if (input.toLowerCase().startsWith('search:') || input.toLowerCase().startsWith('find:')) {
        const query = input.substring(input.indexOf(':') + 1).trim();
        const results = await searchCode(query, sessionId);
        
        if (results.success) {
          const formattedResults = results.results.map((result, index) => 
            `${index + 1}. **${result.file}** (Score: ${result.score.toFixed(2)})\n${result.content.substring(0, 150)}${result.content.length > 150 ? '...' : ''}\n`
          ).join('\n');
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Search results for "${query}":\n\n${formattedResults}`
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `Error searching: ${results.error || 'Unknown error'}`
          }]);
        }
      } else {
        // Regular chat message
        const response = await chatWithRepository(input, sessionId);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.response 
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Something went wrong. Please try again.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border border-gray-700 rounded-lg">
      <div className="p-4 bg-gray-800 rounded-t-lg border-b border-gray-700">
        <h2 className="text-lg font-medium text-white">Repository Chat</h2>
        <p className="text-sm text-gray-300">Ask questions about your code</p>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`mb-4 ${message.role === 'user' ? 'ml-auto max-w-[75%]' : 'mr-auto max-w-[75%]'}`}
          >
            <div 
              className={`p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : message.role === 'system' 
                    ? 'bg-gray-700 text-gray-200' 
                    : 'bg-gray-800 text-gray-200'
              }`}
            >
              <p className="whitespace-pre-line">{message.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center text-gray-400 mb-4">
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-1 animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full mr-1 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your repository..."
            className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="p-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
            disabled={isLoading || !input.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Tip: Use "search: query" to search the codebase
        </p>
      </form>
    </div>
  );
};

export default RepoChat; 