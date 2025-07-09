import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/css/css';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/scroll/simplescrollbars.css';
import 'codemirror/addon/scroll/simplescrollbars';
import { ChevronDown, ChevronRight, File, Folder, FolderPlus, Play, Save, Trash2, Upload, X } from 'react-feather';

function Terminal() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [files, setFiles] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [currentDirectory, setCurrentDirectory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [expandedEditor, setExpandedEditor] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [activeLanguage, setActiveLanguage] = useState('javascript');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  const API_URL = 'http://localhost:8000'; // Change this to your API URL

  useEffect(() => {
    // Create a new session or retrieve an existing one from local storage
    const storedSessionId = localStorage.getItem('codeAssistantSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
      fetchWorkspaceInfo(storedSessionId);
    } else {
      createNewSession();
    }

    // Apply dark theme to body
    document.body.classList.add('bg-gray-900');
    
    return () => {
      document.body.classList.remove('bg-gray-900');
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = async () => {
    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: 'Hello',
        session_id: null
      });
      
      const newSessionId = response.data.session_id;
      setSessionId(newSessionId);
      localStorage.setItem('codeAssistantSessionId', newSessionId);
      
      // Initialize with welcome message
      setChatHistory([
        { role: 'assistant', content: 'Welcome to Code Assistant! I can help you analyze and modify code. You can upload files or write code directly in our conversation.' }
      ]);
      
      fetchWorkspaceInfo(newSessionId);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const fetchWorkspaceInfo = async (sid) => {
    try {
      const response = await axios.get(`${API_URL}/workspace/${sid}`);
      setFiles(response.data.available_files);
      setDirectories(response.data.directories);
      setCurrentDirectory(response.data.current_directory);
    } catch (error) {
      console.error('Error fetching workspace info:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage = { role: 'user', content: message };
    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: userMessage.content,
        session_id: sessionId
      });

      // Add assistant response to chat history
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response,
        tool_calls: response.data.tool_calls
      }]);

      // Update workspace info after chat to reflect any changes
      fetchWorkspaceInfo(sessionId);
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request.'
      }]);
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/upload/files/${sessionId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const uploadResults = response.data;
      const successfulUploads = uploadResults.filter(r => r.success);
      
      if (successfulUploads.length > 0) {
        const fileNames = successfulUploads.map(r => r.file_path.split('/').pop());
        const uploadMessage = `Successfully uploaded: ${fileNames.join(', ')}`;
        
        setChatHistory(prev => [
          ...prev, 
          { role: 'system', content: uploadMessage }
        ]);
        
        // Refresh file list
        fetchWorkspaceInfo(sessionId);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error uploading files:', error);
      setChatHistory(prev => [
        ...prev, 
        { role: 'system', content: 'Failed to upload files. Please try again.' }
      ]);
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    setIsLoading(true);
    
    const formData = new FormData();
    formData.append('path', folderName);

    try {
      const response = await axios.post(
        `${API_URL}/create/folder/${sessionId}`,
        formData
      );

      if (response.data.success) {
        setChatHistory(prev => [
          ...prev, 
          { role: 'system', content: `Folder "${folderName}" created successfully.` }
        ]);
        fetchWorkspaceInfo(sessionId);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error creating folder:', error);
      setChatHistory(prev => [
        ...prev, 
        { role: 'system', content: 'Failed to create folder. Please try again.' }
      ]);
      setIsLoading(false);
    }
  };

  const handleDeleteFile = async (filePath) => {
    if (!confirm(`Are you sure you want to delete ${filePath}?`)) return;
    
    setIsLoading(true);
    
    try {
      const response = await axios.delete(`${API_URL}/workspace/${sessionId}/${filePath}`);
      
      if (response.data.success) {
        setChatHistory(prev => [
          ...prev, 
          { role: 'system', content: response.data.message }
        ]);
        fetchWorkspaceInfo(sessionId);
        
        // Clear editor if the active file was deleted
        if (activeFile === filePath) {
          setActiveFile(null);
          setFileContent('');
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error deleting file:', error);
      setChatHistory(prev => [
        ...prev, 
        { role: 'system', content: 'Failed to delete file. Please try again.' }
      ]);
      setIsLoading(false);
    }
  };

  const handleFileSelection = (filePath) => {
    if (selectedFiles.includes(filePath)) {
      setSelectedFiles(selectedFiles.filter(f => f !== filePath));
    } else {
      setSelectedFiles([...selectedFiles, filePath]);
    }
  };

  const handleReadSelectedFiles = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to read.');
      return;
    }
    
    const fileList = selectedFiles.join(', ');
    const readRequestMessage = `Please read and analyze these files: ${fileList}`;
    
    setChatHistory(prev => [...prev, { role: 'user', content: readRequestMessage }]);
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: readRequestMessage,
        session_id: sessionId
      });

      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response,
        tool_calls: response.data.tool_calls
      }]);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error reading files:', error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error reading the selected files.'
      }]);
      setIsLoading(false);
    }
  };

  const handleOpenFile = async (filePath) => {
    setIsLoading(true);
    
    try {
      // Get file extension to determine language mode
      const fileExt = filePath.split('.').pop().toLowerCase();
      let language = 'javascript'; // default
      
      if (fileExt === 'py') language = 'python';
      else if (fileExt === 'html' || fileExt === 'xml') language = 'xml';
      else if (fileExt === 'css') language = 'css';
      
      setActiveLanguage(language);
      
      // Fetch file content
      const response = await axios.post(`${API_URL}/chat`, {
        message: `Please read the file: ${filePath}`,
        session_id: sessionId
      });
      
      // Extract file content from response
      // This is a simple approach - in a real app you might need more sophisticated parsing
      const fileContent = response.data.tool_calls?.find(
        call => call.tool === 'read_file' && call.arguments.file_path === filePath
      )?.result?.content || '';
      
      setActiveFile(filePath);
      setFileContent(fileContent);
      setExpandedEditor(true);
      setIsLoading(false);
    } catch (error) {
      console.error('Error opening file:', error);
      setIsLoading(false);
      alert(`Failed to open file: ${filePath}`);
    }
  };

  const handleSaveFile = async () => {
    if (!activeFile) return;
    
    setIsLoading(true);
    
    try {
      // Send save request
      const response = await axios.post(`${API_URL}/chat`, {
        message: `Please write the following content to ${activeFile}:\n\n${fileContent}`,
        session_id: sessionId
      });
      
      // Check if the write operation was successful
      const writeOperation = response.data.tool_calls?.find(
        call => call.tool === 'write_file' && call.arguments.file_path === activeFile
      );
      
      if (writeOperation?.result?.success) {
        alert(`File ${activeFile} saved successfully!`);
      } else {
        alert('Failed to save file. Please try again.');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving file. Please try again.');
      setIsLoading(false);
    }
  };

  const handleCreateNewFile = async () => {
    const fileName = prompt('Enter file name:');
    if (!fileName) return;
    
    // Set empty content for new file
    setActiveFile(fileName);
    setFileContent('');
    setExpandedEditor(true);
    
    // Determine language based on file extension
    const fileExt = fileName.split('.').pop().toLowerCase();
    let language = 'javascript'; // default
    
    if (fileExt === 'py') language = 'python';
    else if (fileExt === 'html' || fileExt === 'xml') language = 'xml';
    else if (fileExt === 'css') language = 'css';
    
    setActiveLanguage(language);
  };

  const handleRunCode = async () => {
    if (!fileContent.trim()) {
      alert('No code to run!');
      return;
    }
    
    // For demonstration - in a real app you might send this to a backend for execution
    setChatHistory(prev => [...prev, { 
      role: 'user', 
      content: `Please run and explain this code:\n\n\`\`\`${activeLanguage}\n${fileContent}\n\`\`\``
    }]);
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: `Please analyze and explain what this code does:\n\n${fileContent}`,
        session_id: sessionId
      });
      
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response,
        tool_calls: response.data.tool_calls
      }]);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error analyzing code:', error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error analyzing the code.'
      }]);
      setIsLoading(false);
    }
  };

  const formatMessage = (content) => {
    // Use a more robust markdown formatter (simplified version here)
    return content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-800 p-4 rounded-md overflow-auto"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .split('\n').join('<br/>');
  };

  const getFileIcon = (filePath) => {
    const ext = filePath.split('.').pop().toLowerCase();
    
    switch(ext) {
      case 'js':
        return <span className="text-yellow-400">JS</span>;
      case 'py':
        return <span className="text-blue-400">PY</span>;
      case 'html':
        return <span className="text-orange-400">HTML</span>;
      case 'css':
        return <span className="text-pink-400">CSS</span>;
      case 'json':
        return <span className="text-green-400">JSON</span>;
      default:
        return <File size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 mt-16">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-mono font-bold text-blue-400">
            <span className="text-green-400">&gt;</span> Code Assistant
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={createNewSession} 
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors"
            >
              New Session
            </button>
            <button 
              onClick={() => fileInputRef.current.click()} 
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-sm flex items-center gap-1 transition-colors"
            >
              <Upload size={14} /> Upload
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              multiple
            />
            <button 
              onClick={handleCreateFolder} 
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm flex items-center gap-1 transition-colors"
            >
              <FolderPlus size={14} /> Folder
            </button>
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-sm md:hidden transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <aside className={`${sidebarCollapsed ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-64 bg-gray-800 border-r border-gray-700 p-4 ${expandedEditor ? 'md:hidden lg:flex' : ''}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-md font-semibold text-gray-300">Workspace</h2>
            <button 
              onClick={handleCreateNewFile}
              className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded-md text-xs flex items-center gap-1 transition-colors"
            >
              <File size={12} /> New File
            </button>
          </div>
          
          <div className="text-xs text-gray-500 bg-gray-850 p-2 rounded mb-2 overflow-x-auto whitespace-nowrap">
            {currentDirectory}
          </div>
          
          <div className="space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 pb-1 border-b border-gray-700">Files</h3>
              {files.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No files in workspace</p>
              ) : (
                <ul className="space-y-1">
                  {files.map((file, index) => {
                    const fileName = file.split('/').pop();
                    return (
                      <li 
                        key={index} 
                        className={`flex items-center justify-between group rounded px-2 py-1 text-sm hover:bg-gray-700 ${selectedFiles.includes(file) ? 'bg-gray-700' : ''} ${activeFile === file ? 'border-l-2 border-blue-500 pl-1' : ''}`}
                      >
                        <div 
                          className="flex items-center gap-2 flex-1 cursor-pointer overflow-hidden"
                          onClick={() => handleOpenFile(file)}
                        >
                          {getFileIcon(file)}
                          <span className="truncate">{fileName}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-1 hover:text-blue-400" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileSelection(file);
                            }}
                          >
                            <span className="text-xs">{selectedFiles.includes(file) ? '✓' : '+'}</span>
                          </button>
                          <button 
                            className="p-1 hover:text-red-400" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 pb-1 border-b border-gray-700">Directories</h3>
              {directories.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No directories</p>
              ) : (
                <ul className="space-y-1">
                  {directories.map((dir, index) => (
                    <li 
                      key={index}
                      className="flex items-center justify-between group rounded px-2 py-1 text-sm hover:bg-gray-700"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Folder size={14} className="text-yellow-600" />
                        <span className="truncate">{dir.split('/').pop()}/</span>
                      </div>
                      <button 
                        className="p-1 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" 
                        onClick={() => handleDeleteFile(dir)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="mt-4 border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Selected: {selectedFiles.length}</span>
                <button 
                  onClick={handleReadSelectedFiles}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-xs transition-colors"
                >
                  Analyze Selected
                </button>
              </div>
            </div>
          )}
        </aside>
        
        <div className={`flex flex-col flex-1 ${expandedEditor ? 'hidden md:flex' : 'flex'}`}>
          <main className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {chatHistory.map((chat, index) => (
                <div 
                  key={index} 
                  className={`rounded-lg p-4 ${
                    chat.role === 'user' 
                      ? 'bg-gray-800 border-l-4 border-blue-500' 
                      : chat.role === 'system' 
                        ? 'bg-gray-800 border-l-4 border-yellow-500 text-sm'
                        : 'bg-gray-750 border-l-4 border-green-500'
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1 font-mono">
                    {chat.role === 'user' ? '> You' : chat.role === 'system' ? '> System' : '> Assistant'}
                  </div>
                  <div 
                    className="chat-content text-sm"
                    dangerouslySetInnerHTML={{ __html: formatMessage(chat.content) }}
                  />
                  {chat.tool_calls && chat.tool_calls.length > 0 && (
                    <div className="mt-3 text-sm">
                      <details className="bg-gray-900 rounded p-2">
                        <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                          Tool Operations ({chat.tool_calls.length})
                        </summary>
                        <ul className="mt-2 space-y-2 pl-4">
                          {chat.tool_calls.map((tool, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="font-mono text-gray-400">{tool.tool}</span>: 
                              <span className={`text-xs px-2 py-0.5 rounded ${tool.result.success ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                {tool.result.success ? 'Success' : 'Failed'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-center p-4">
                  <div className="flex space-x-2 items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </main>
          
          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask me about your code..."
                className="w-full bg-gray-700 text-gray-200 rounded-lg p-3 pr-12 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button 
                onClick={handleSendMessage} 
                disabled={isLoading || !message.trim()}
                className="absolute right-2 bottom-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md p-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {expandedEditor && (
          <div className="flex-1 flex flex-col">
            <div className="bg-gray-800 border-b border-gray-700 p-2 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{activeFile || 'New File'}</span>
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-blue-400">{activeLanguage}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveFile}
                  className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded-md text-xs flex items-center gap-1 transition-colors"
                >
                  <Save size={12} /> Save
                </button>
                <button 
                  onClick={handleRunCode}
                  className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded-md text-xs flex items-center gap-1 transition-colors"
                >
                  <Play size={12} /> Run
                </button>
                <button 
                  onClick={() => setExpandedEditor(false)}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-xs transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {/* Here we would normally use CodeMirror, but for demonstration purposes we use a textarea */}
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full h-full bg-gray-900 text-gray-200 p-4 font-mono text-sm resize-none focus:outline-none"
                spellCheck="false"
              />
              {/* In a real implementation, you would use the CodeMirror component:
              <CodeMirror
                value={fileContent}
                options={{
                  mode: activeLanguage,
                  theme: 'dracula',
                  lineNumbers: true,
                  lineWrapping: true,
                  autoCloseBrackets: true,
                  matchBrackets: true,
                  scrollbarStyle: 'simple'
                }}
                onBeforeChange={(editor, data, value) => {
                  setFileContent(value);
                }}
                editorDidMount={editor => {
                  editorRef.current = editor;
                }}
              />
              */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Terminal;