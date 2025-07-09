import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlay, FiSave, FiShield, FiCpu, FiRefreshCw, FiCheck, FiClock, FiZap, FiDatabase } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const CodeEditor = ({ sessionId, isLender }) => {
  const [code, setCode] = useState('# Write your Python code here\nimport numpy as np\nimport pandas as pd\n\n# Your code here\nprint("Hello from remote execution!")\n');
  const [requirements, setRequirements] = useState('numpy\npandas\nscikit-learn\nmatplotlib\nseaborn');
  const [output, setOutput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState('pending');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [baseImagesStatus, setBaseImagesStatus] = useState(null);
  
  const API_BASE = import.meta.env.VITE_API_URL

  useEffect(() => {
    if (sessionId) {
      fetchExecutionResult();
    }
    
    if (isLender) {
      fetchBaseImagesStatus();
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [sessionId]);

  const fetchBaseImagesStatus = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/session/docker/base-images/status`,
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setBaseImagesStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching base images status:', error);
    }
  };

  const rebuildBaseImages = async () => {
    try {
      const response = await axios.post(
        `${API_BASE}/api/session/docker/base-images/rebuild`,
        {},
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setOutput(`✅ Base images rebuilt successfully!\nReady images: ${response.data.readyImages.join(', ')}`);
        fetchBaseImagesStatus(); // Refresh status
      }
    } catch (error) {
      console.error('Error rebuilding base images:', error);
      setOutput(`❌ Failed to rebuild base images: ${error.response?.data?.message || error.message}`);
    }
  };

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    } else {
      const interval = setInterval(() => {
        fetchExecutionResult();
      }, 3000);
      setRefreshInterval(interval);
    }
    setAutoRefresh(!autoRefresh);
  };

  const handleCodeChange = (e) => {
    setCode(e.target.value);
    setUploadSuccess(false); // Reset upload status when code changes
  };

  const handleRequirementsChange = (e) => {
    setRequirements(e.target.value);
  };

  // Upload encrypted code to server (renter only)
  const uploadCode = async () => {
    if (!code.trim()) {
      setOutput('Error: Please enter some code before uploading.');
      return;
    }

    try {
      setIsUploading(true);
      setOutput('Uploading and encrypting code...');
      
      const response = await axios.post(
        `${API_BASE}/api/session/${sessionId}/upload`,
        {
          code: code,
          requirements: requirements
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      if (response.data.success) {
        setOutput('✅ Code uploaded and encrypted successfully!\nWaiting for lender to execute on their device...');
        setUploadSuccess(true);
        setExecutionStatus('pending');
        
        // Start auto-refreshing to check for execution
        if (!autoRefresh) {
          toggleAutoRefresh();
        }
      }
    } catch (error) {
      console.error('Error uploading code:', error);
      setOutput(`❌ Upload failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Execute code on lender's device (lender only)
  const executeCodeOnLender = async () => {
    try {
      setIsExecuting(true);
      setOutput('🔄 Executing code on lender device...\nThis may take up to 30 seconds.');
      setExecutionStatus('executing');
      
      const response = await axios.post(
        `${API_BASE}/api/session/${sessionId}/execute`,
        {},
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setOutput(`✅ Execution completed!\n\n--- OUTPUT ---\n${response.data.output}`);
        setExecutionStatus('completed');
        
        // Store performance stats if available
        if (response.data.performanceStats) {
          setPerformanceStats(response.data.performanceStats);
        }
      }
    } catch (error) {
      console.error('Error executing code:', error);
      const errorMessage = error.response?.data?.message || error.message;
      setOutput(`❌ Execution failed: ${errorMessage}`);
      setExecutionStatus('error');
    } finally {
      setIsExecuting(false);
    }
  };

  // Fetch execution result
  const fetchExecutionResult = async () => {
    try {
      const response = await axios.get(
        `${API_BASE}/api/session/${sessionId}/result`,
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setOutput(response.data.result || 'No output available yet.');
        setExecutionStatus(response.data.executionStatus || 'pending');
        
        // Stop auto-refresh if execution is completed or errored
        if ((response.data.executionStatus === 'completed' || response.data.executionStatus === 'error') && autoRefresh) {
          toggleAutoRefresh();
        }
      }
    } catch (error) {
      console.error('Error fetching result:', error);
      setOutput('Error fetching execution result.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'executing': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FiClock className="animate-pulse" />;
      case 'executing': return <div className="animate-spin h-4 w-4 border-2 border-blue-400 rounded-full border-t-transparent"></div>;
      case 'completed': return <FiCheck />;
      case 'error': return <FiRefreshCw />;
      default: return <FiClock />;
    }
  };

  const renderPerformanceStats = () => {
    if (!performanceStats) return null;
    
    return (
      <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-300">
            <FiZap className="mr-2 text-green-400" />
            <span className="font-medium">Performance Stats:</span>
            <span className="ml-2">Build: {performanceStats.buildTimeMs}ms</span>
            <span className="ml-3">Exec: {performanceStats.executionTimeMs}ms</span>
            <span className="ml-3">Additional Packages: {performanceStats.additionalPackages}</span>
          </div>
          <div className="text-xs text-green-400 font-medium">
            {performanceStats.optimization}
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Using optimized base image: {performanceStats.baseImage}
        </div>
      </div>
    );
  };

  const renderBaseImagesPanel = () => {
    if (!isLender || !baseImagesStatus) return null;
    
    return (
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-300">
            <FiDatabase className="mr-2 text-blue-400" />
            <span className="font-medium">Docker Base Images:</span>
            <span className="ml-2">{baseImagesStatus.totalReady}/{baseImagesStatus.totalCategories} Ready</span>
          </div>
          <button
            onClick={rebuildBaseImages}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs flex items-center transition-colors"
          >
            <FiRefreshCw className="mr-1" />
            Rebuild
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(baseImagesStatus.baseImages).map(([category, info]) => (
            <div key={category} className="bg-gray-900 p-2 rounded text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-200 capitalize">{category}</span>
                <div className={`w-2 h-2 rounded-full ${info.ready ? 'bg-green-400' : 'bg-red-400'}`}></div>
              </div>
              <div className="text-gray-400 mt-1">
                {info.packageCount} packages • {info.sizeMB}MB
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700 mb-6">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <FiCpu className="text-indigo-400 mr-2" />
          <span className="text-white font-medium">
            {isLender ? 'Remote Code Execution' : 'Python Code Editor'}
          </span>
          {isLender && (
            <span className="ml-3 bg-indigo-900/50 text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded">
              Lender View
            </span>
          )}
          {performanceStats && (
            <span className="ml-3 bg-green-900/50 text-green-300 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
              <FiZap className="mr-1" />
              Optimized
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Execution Status */}
          <div className={`flex items-center gap-1 ${getStatusColor(executionStatus)} text-sm`}>
            {getStatusIcon(executionStatus)}
            <span className="capitalize">{executionStatus}</span>
          </div>
          
          {/* Auto Refresh Toggle */}
          <button
            onClick={toggleAutoRefresh}
            className={`${
              autoRefresh ? 'bg-green-600' : 'bg-gray-700'
            } text-white px-3 py-1 rounded text-sm flex items-center transition-colors`}
          >
            <FiRefreshCw className={`mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </button>
          
          {/* Renter Actions */}
          {!isLender && (
            <>
              <button
                onClick={uploadCode}
                disabled={isUploading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center transition-colors"
              >
                <FiShield className="mr-1" />
                {isUploading ? 'Uploading...' : 'Upload & Encrypt'}
              </button>
            </>
          )}
          
          {/* Lender Actions */}
          {isLender && (
            <>
              <button
                onClick={executeCodeOnLender}
                disabled={isExecuting || executionStatus !== 'pending'}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center transition-colors"
              >
                <FiPlay className="mr-1" />
                {isExecuting ? 'Executing...' : 'Execute on Device'}
              </button>
              <button
                onClick={fetchExecutionResult}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center transition-colors"
              >
                <FiRefreshCw className="mr-1" /> Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {/* Base Images Status Panel (Lender only) */}
      {renderBaseImagesPanel()}

      {/* Editor Area */}
      <div className="flex flex-col lg:flex-row h-[600px]">
        {/* Code Editor (Renter only) */}
        {!isLender && (
          <div className="w-full lg:w-1/2 h-full flex flex-col">
            {/* Code Input */}
            <div className="flex-1">
              <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 border-b border-gray-600">
                Python Code Editor
              </div>
              <textarea
                value={code}
                onChange={handleCodeChange}
                className="w-full h-[calc(100%-28px)] bg-gray-950 text-gray-200 p-4 font-mono text-sm focus:outline-none resize-none border-b border-gray-700"
                spellCheck="false"
                placeholder="Write your Python code here..."
              />
            </div>
            
            {/* Requirements Editor */}
            <div className="h-32">
              <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 border-b border-gray-600 flex items-center justify-between">
                <span>Python Requirements (one per line)</span>
                <span className="text-yellow-400 flex items-center">
                  <FiZap className="mr-1" />
                  Auto-optimized
                </span>
              </div>
              <textarea
                value={requirements}
                onChange={handleRequirementsChange}
                className="w-full h-[calc(100%-28px)] bg-gray-900 text-gray-300 p-3 font-mono text-xs focus:outline-none resize-none"
                spellCheck="false"
                placeholder="numpy&#10;pandas&#10;matplotlib"
              />
            </div>
          </div>
        )}

        {/* Output Terminal */}
        <div className={`${!isLender ? 'w-full lg:w-1/2' : 'w-full'} h-full flex flex-col`}>
          <div className="bg-gray-700 px-3 py-1 text-xs text-gray-300 border-b border-gray-600 flex items-center justify-between">
            <span>Execution Output</span>
            {uploadSuccess && !isLender && (
              <span className="bg-green-900/50 text-green-300 px-2 py-0.5 rounded text-xs flex items-center">
                <FiShield className="mr-1" /> Code Encrypted & Uploaded
              </span>
            )}
          </div>
          <div className="flex-1 bg-black text-green-400 p-4 font-mono text-sm overflow-auto whitespace-pre-wrap">
            {output || (isLender 
              ? 'Waiting for code to execute...' 
              : 'Upload your code to execute it on the lender\'s device.'
            )}
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      {renderPerformanceStats()}

      {/* Security Notice */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
        <div className="flex items-center text-xs text-gray-400">
          <FiShield className="mr-2 text-indigo-400" />
          <span>
            🔒 Code is encrypted end-to-end. {isLender ? 'You cannot view the source code.' : 'Your code remains private.'}
            Execution happens in an isolated Docker container with resource limits.
          </span>
          <span className="ml-4 text-green-400 flex items-center">
            <FiZap className="mr-1" />
            Optimized with pre-built base images for faster execution
          </span>
          <Link to="/ideate">
  <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm md:text-base font-semibold rounded-2xl shadow-md hover:scale-105 hover:shadow-lg transition-all duration-300 ease-in-out">
    💡 Want some ideas? Ideate
  </button>
</Link>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;