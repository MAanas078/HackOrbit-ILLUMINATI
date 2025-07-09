import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

// Add checkerboard background styles
const checkerboardStyle = `
  .bg-checkerboard {
    background-image: 
      linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
      linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
      linear-gradient(-45deg, transparent 75%, #f3f4f6 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = checkerboardStyle;
  document.head.appendChild(styleElement);
}

const RenterDashboard = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [pollInterval, setPollInterval] = useState(null);
  const [renderResult, setRenderResult] = useState(null);

  useEffect(() => {
    const fetchSessionDetails = async () => {
      try {
        console.log(`🔍 Fetching session details for: ${sessionId}`);
        const response = await api.get(`/blendsession/${sessionId}`);
        
        setSession(response.data.session);
        setLoading(false);

        console.log(`📊 Session status: ${response.data.session.status}`);
        console.log(`📁 Uploaded files: ${response.data.session.uploadedFiles?.length || 0}`);

        // Start polling for render results if session is active
        if (response.data.session.status === 'active') {
          startPolling();
        } else if (response.data.session.status === 'completed') {
          // If session is already completed, fetch the results once
          fetchRenderResults();
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
        toast.error('Failed to load session details: ' + (error.response?.data?.message || error.message));
        setLoading(false);
      }
    };

    fetchSessionDetails();

    // Set up auto-refresh for session data every 5 seconds
    const sessionRefreshInterval = setInterval(() => {
      if (!loading) {
        fetchSessionDetails();
      }
    }, 5000);

    return () => {
      // Clean up intervals on component unmount
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
      }
    };
  }, [sessionId]);

  // Function to fetch render results once
  const fetchRenderResults = async () => {
    try {
      const response = await api.get(`/blendsession/${sessionId}/result`);
      setRenderResult(response.data.result);
    } catch (error) {
      console.error('Error fetching render results:', error);
    }
  };

  const startPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
    }

    console.log('🔄 Starting render results polling...');
    
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/blendsession/${sessionId}/result`);
        const newResult = response.data.result;
        
        // Check for new rendered files from Cloudinary
        const newCloudinaryCount = newResult.cloudinaryUrls?.length || 0;
        const oldCloudinaryCount = renderResult?.cloudinaryUrls?.length || 0;
        
        if (newCloudinaryCount > oldCloudinaryCount) {
          toast.success(`🎨 ${newCloudinaryCount - oldCloudinaryCount} new rendered image${newCloudinaryCount - oldCloudinaryCount > 1 ? 's' : ''} available!`, {
            duration: 4000,
            icon: '🖼️'
          });
        }
        
        // Check for status changes
        if (newResult.status !== renderResult?.status) {
          switch (newResult.status) {
            case 'completed':
              toast.success('✅ Render completed successfully!', {
                duration: 5000,
                icon: '🎉'
              });
              break;
            case 'active':
              toast.success('🚀 Render process started!', {
                duration: 3000
              });
              break;
          }
        }
        
        setRenderResult(newResult);
        
        // Stop polling if session is completed
        if (newResult.status === 'completed') {
          console.log('✅ Render completed, stopping polling');
          clearInterval(interval);
          setPollInterval(null);
        }
        
        // Also refresh session data to get updated status
        if (newResult.status !== session?.status) {
          const sessionResponse = await api.get(`/blendsession/${sessionId}`);
          setSession(sessionResponse.data.session);
        }
        
      } catch (error) {
        console.error('Error polling results:', error);
        // Don't show error toast for every failed poll, just log it
      }
    }, 3000); // Poll every 3 seconds for faster updates

    setPollInterval(interval);
  };

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    // Check for .blend file
    const hasBlendFile = selectedFiles.some(file => file.name.endsWith('.blend'));
    if (!hasBlendFile) {
      toast.error('You must include at least one .blend file');
      return;
    }

    setUploadLoading(true);
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      // We need to create a special instance for file uploads
      const response = await api.post(
        `/blendsession/${sessionId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success('Files uploaded successfully!');
        setSelectedFiles([]);
        
        // Refresh session details
        const sessionResponse = await api.get(`/blendsession/${sessionId}`);
        setSession(sessionResponse.data.session);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(error.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownloadOutput = () => {
    // Redirect to download endpoint
    window.location.href = `${api.defaults.baseURL}/blendsession/${sessionId}/download`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          to="/blender-marketplace" 
          className="text-blue-600 hover:underline flex items-center"
        >
          ← Back to Marketplace
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <h1 className="text-2xl font-bold">Blender Rendering Session</h1>
          <div className="flex justify-between items-center mt-2">
            <div>
              <span className="inline-block px-3 py-1 bg-white text-blue-600 rounded font-medium">
                Status: {session.status}
              </span>
            </div>
            <div className="text-sm">
              Session ID: {sessionId}
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-2">Device Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><span className="font-medium">Device Name:</span> {session.device.deviceName}</p>
              <p><span className="font-medium">Device Type:</span> {session.device.deviceType}</p>
              <p><span className="font-medium">Price:</span> ${session.device.price}/hr</p>
            </div>
            <div>
              <p className="font-medium">Specifications:</p>
              <ul className="list-disc pl-5 mt-1">
                {session.device.specs && Object.entries(session.device.specs).map(([key, value]) => (
                  <li key={key} className="text-sm">
                    <span className="font-medium">{key}:</span> {value}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        {(session.status === 'requested' || session.status === 'active') && (
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-2">Upload Blender Files</h2>
            <p className="text-sm text-gray-600 mb-3">
              Upload your .blend file and any assets it requires. Files will be stored securely in the cloud.
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-1">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                <div className="mt-2">
                  {selectedFiles.length > 0 && (
                    <div className="text-sm">
                      <p className="font-medium">Selected Files:</p>
                      <ul className="list-disc pl-5 mt-1">
                        {selectedFiles.map((file, index) => (
                          <li key={index} className="flex justify-between items-center">
                            <span>{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleFileUpload}
                disabled={uploadLoading || selectedFiles.length === 0}
                className={`px-4 py-2 rounded text-white ${
                  uploadLoading || selectedFiles.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {uploadLoading ? 'Uploading to Cloud...' : 'Upload Files'}
              </button>
            </div>
            
            {/* Show uploaded files */}
            {session.uploadedFiles && session.uploadedFiles.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="font-medium text-green-800 mb-2">
                  ✅ Files uploaded to cloud storage:
                </p>
                <ul className="list-disc pl-5 text-sm text-green-700">
                  {session.uploadedFiles.map((file, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span>{file.originalName}</span>
                      <a 
                        href={file.cloudinaryUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        View File
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-green-600 mt-2">
                  Your files are ready for rendering. The device owner can now accept your request.
                </p>
              </div>
            )}
            
            {session.blendFile && !session.uploadedFiles && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 rounded">
                <p className="font-medium">Current Blend File: {session.blendFile}</p>
                <p className="text-sm">Your file has been uploaded and is ready for rendering.</p>
              </div>
            )}
          </div>
        )}

        {/* Render Results */}
        {(session.status === 'active' || session.status === 'completed') && renderResult && (
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-4">🎨 Render Results</h2>
            
            {/* Resource Usage Stats */}
            {renderResult.resourceUsage && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">📊 Resource Usage:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700">CPU Usage</p>
                        <p className="text-2xl font-bold text-blue-900">{parseFloat(renderResult.resourceUsage.cpuPercent || 0).toFixed(1)}%</p>
                      </div>
                      <div className="text-blue-400">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700">Memory</p>
                        <p className="text-2xl font-bold text-green-900">{parseFloat(renderResult.resourceUsage.memoryUsage || 0).toFixed(0)} MB</p>
                      </div>
                      <div className="text-green-400">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-700">GPU Usage</p>
                        <p className="text-2xl font-bold text-purple-900">{parseFloat(renderResult.resourceUsage.gpuUtilization || 0).toFixed(1)}%</p>
                      </div>
                      <div className="text-purple-400">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Rendered Images Gallery */}
            {renderResult.cloudinaryUrls && renderResult.cloudinaryUrls.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-lg">🖼️ Rendered Images ({renderResult.cloudinaryUrls.length})</h3>
                  <button
                    onClick={handleDownloadOutput}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download All Files
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {renderResult.cloudinaryUrls.map((item, index) => (
                    <div key={index} className="bg-white border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                      {/* File Header */}
                      <div className="px-4 py-3 bg-gray-50 border-b">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700 truncate">{item.filename}</span>
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                            title="Open in new tab"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                      
                      {/* Image Preview */}
                      <div className="relative group">
                        <div className="aspect-w-16 aspect-h-12 bg-gray-100">
                          <img 
                            src={item.url}
                            alt={item.filename}
                            className="w-full h-48 object-contain bg-checkerboard"
                            loading="lazy"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.className = "w-full h-48 object-contain bg-gray-200";
                              e.target.src = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="#f3f4f6"/><text x="100" y="75" text-anchor="middle" font-family="Arial" font-size="12" fill="#6b7280">Preview Not Available</text></svg>')}`;
                            }}
                          />
                        </div>
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => window.open(item.url, '_blank')}
                              className="px-3 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium transition-colors duration-200"
                            >
                              View Full Size
                            </button>
                            <a 
                              href={item.url} 
                              download={item.filename}
                              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors duration-200"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                      
                      {/* File Actions */}
                      <div className="px-4 py-3 bg-gray-50">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {item.filename.split('.').pop()?.toUpperCase()} • Cloudinary
                          </span>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => navigator.clipboard.writeText(item.url)}
                              className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
                              title="Copy URL"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Bulk Actions */}
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={handleDownloadOutput}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download All as ZIP
                  </button>
                  
                  <button
                    onClick={() => {
                      renderResult.cloudinaryUrls.forEach(item => {
                        const link = document.createElement('a');
                        link.href = item.url;
                        link.download = item.filename;
                        link.click();
                      });
                    }}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Download Individual Files
                  </button>
                </div>
              </div>
            )}
            
            {/* Legacy Files Support */}
            {renderResult.renderedFiles && renderResult.renderedFiles.length > 0 && !renderResult.cloudinaryUrls && (
              <div className="mb-4">
                <h3 className="font-medium mb-3">📁 Legacy Rendered Files:</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {renderResult.renderedFiles.map((file, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden shadow-sm">
                      <div className="p-2 bg-gray-50 border-b truncate text-sm">
                        {file}
                      </div>
                      <div className="p-2 flex items-center justify-center">
                        <img 
                          src={`${api.defaults.baseURL}/blendsession/${sessionId}/preview/${file}`}
                          alt={file}
                          className="max-h-48 max-w-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/200x150?text=Preview+Not+Available';
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleDownloadOutput}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Download All Rendered Files
                </button>
              </div>
            )}
            
            {/* No Files Message */}
            {(!renderResult.cloudinaryUrls || renderResult.cloudinaryUrls.length === 0) && 
             (!renderResult.renderedFiles || renderResult.renderedFiles.length === 0) && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-yellow-800">No rendered files available yet</h4>
                    <p className="text-yellow-700 text-sm">
                      {session.status === 'active' ? 'The render is still processing. Results will appear here when complete.' : 'No render outputs were generated.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <h3 className="font-medium">Render Log:</h3>
              <pre className="mt-2 p-3 bg-gray-800 text-green-400 rounded overflow-auto max-h-64 text-sm">
                {renderResult.output || "No output available yet"}
              </pre>
            </div>
            
            {session.status === 'completed' && renderResult.cost > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 text-yellow-700 rounded">
                <p className="font-medium">Final Cost: ${renderResult.cost.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        {/* Session Status */}
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">Render Process Status</h2>
          
          {/* Progress Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className={`flex items-center ${
                session.uploadedFiles && session.uploadedFiles.length > 0 ? 'text-green-600' : 'text-gray-400'
              }`}>
                {session.uploadedFiles && session.uploadedFiles.length > 0 ? '✅' : '⏳'}
                Files Uploaded to Cloud
              </span>
              
              <span className={`flex items-center ${
                session.status === 'active' || session.status === 'completed' ? 'text-green-600' : 'text-gray-400'
              }`}>
                {session.status === 'active' || session.status === 'completed' ? '✅' : '⏳'}
                Request Accepted
              </span>
              
              <span className={`flex items-center ${
                renderResult && renderResult.output ? 'text-green-600' : 'text-gray-400'
              }`}>
                {renderResult && renderResult.output ? '✅' : '⏳'}
                Render Processing
              </span>
              
              <span className={`flex items-center ${
                session.status === 'completed' ? 'text-green-600' : 'text-gray-400'
              }`}>
                {session.status === 'completed' ? '✅' : '⏳'}
                Completed
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mt-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative"
                style={{
                  width: 
                    session.status === 'completed' ? '100%' :
                    renderResult && renderResult.cloudinaryUrls && renderResult.cloudinaryUrls.length > 0 ? '90%' :
                    renderResult && renderResult.output ? '75%' :
                    session.status === 'active' ? '50%' :
                    session.uploadedFiles && session.uploadedFiles.length > 0 ? '25%' : '0%'
                }}
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
            
            {/* Progress percentage */}
            <div className="text-center mt-2">
              <span className="text-sm font-medium text-gray-600">
                {session.status === 'completed' ? '100%' :
                 renderResult && renderResult.cloudinaryUrls && renderResult.cloudinaryUrls.length > 0 ? '90%' :
                 renderResult && renderResult.output ? '75%' :
                 session.status === 'active' ? '50%' :
                 session.uploadedFiles && session.uploadedFiles.length > 0 ? '25%' : '0%'} Complete
              </span>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Session Timeline</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="relative pl-10 pb-4">
              <div className="absolute left-0 rounded-full bg-blue-500 text-white flex items-center justify-center w-8 h-8">1</div>
              <div>
                <p className="font-medium">Session Created</p>
                <p className="text-sm text-gray-600">
                  {new Date(session.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            {session.uploadedFiles && session.uploadedFiles.length > 0 && (
              <div className="relative pl-10 pb-4">
                <div className="absolute left-0 rounded-full bg-green-500 text-white flex items-center justify-center w-8 h-8">2</div>
                <div>
                  <p className="font-medium">Files Uploaded to Cloud</p>
                  <p className="text-sm text-gray-600">
                    {session.uploadedFiles.length} file(s) stored in Cloudinary
                  </p>
                </div>
              </div>
            )}
            
            {session.status !== 'requested' && (
              <div className="relative pl-10 pb-4">
                <div className="absolute left-0 rounded-full bg-blue-500 text-white flex items-center justify-center w-8 h-8">3</div>
                <div>
                  <p className="font-medium">Session Activated</p>
                  <p className="text-sm text-gray-600">
                    {session.startTime && new Date(session.startTime).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            
            {renderResult && renderResult.output && (
              <div className="relative pl-10 pb-4">
                <div className="absolute left-0 rounded-full bg-purple-500 text-white flex items-center justify-center w-8 h-8">4</div>
                <div>
                  <p className="font-medium">Render Process Executed</p>
                  <p className="text-sm text-gray-600">
                    Files downloaded from cloud, Docker container executed Blender render
                  </p>
                </div>
              </div>
            )}
            
            {session.status === 'completed' && (
              <div className="relative pl-10">
                <div className="absolute left-0 rounded-full bg-green-500 text-white flex items-center justify-center w-8 h-8">5</div>
                <div>
                  <p className="font-medium">Session Completed</p>
                  <p className="text-sm text-gray-600">
                    {session.endTime && new Date(session.endTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-green-600">
                    Render outputs uploaded to cloud and ready for download
                  </p>
                </div>
              </div>
            )}
            
            {session.status === 'rejected' && (
              <div className="relative pl-10">
                <div className="absolute left-0 rounded-full bg-red-500 text-white flex items-center justify-center w-8 h-8">❌</div>
                <div>
                  <p className="font-medium">Session Rejected</p>
                  <p className="text-sm text-gray-600">
                    The device owner has declined this render request.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenterDashboard;