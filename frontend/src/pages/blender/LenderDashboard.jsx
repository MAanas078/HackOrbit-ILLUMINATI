import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const LenderDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [renderInProgress, setRenderInProgress] = useState(false);
  const [renderOutput, setRenderOutput] = useState('');
  const [requestFilter, setRequestFilter] = useState('all');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/blendsession/owner');
      
      if (response.data.success) {
        setSessions(response.data.sessions);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load blender sessions: ' + (error.response?.data?.message || error.message));
      setLoading(false);
    }
  };

  const fetchRenderResults = async (sessionId) => {
    try {
      const response = await api.get(`/blendsession/${sessionId}/result`);
      return response.data.result;
    } catch (error) {
      console.error('Error fetching render results:', error);
      return null;
    }
  };

  const handleViewSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const response = await api.get(`/blendsession/${sessionId}`);
      
      if (response.data.success) {
        setSessionDetails(response.data.session);
        
        // Also get render results if session is active or completed
        if (['active', 'completed'].includes(response.data.session.status)) {
          const renderResult = await fetchRenderResults(sessionId);
          if (renderResult) {
            setRenderOutput(renderResult.output || '');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching session details:', error);
      toast.error('Failed to load session details');
    }
  };

  const handleUpdateStatus = async (sessionId, newStatus) => {
    try {
      const response = await api.put(
        `/blendsession/${sessionId}/status`,
        { status: newStatus }
      );
      
      if (response.data.success) {
        toast.success(`Session ${newStatus} successfully`);
        fetchSessions();
        
        if (activeSessionId === sessionId) {
          handleViewSession(sessionId);
        }
      }
    } catch (error) {
      console.error('Error updating session status:', error);
      toast.error('Failed to update session status');
    }
  };

  const handleRunRender = async (sessionId) => {
    setRenderInProgress(true);
    try {
      const response = await api.post(`/blendsession/${sessionId}/render`);
      
      if (response.data.success) {
        toast.success('Render completed successfully');
        setRenderOutput(response.data.output);
        handleViewSession(sessionId);
      }
    } catch (error) {
      console.error('Error running render:', error);
      toast.error('Failed to run render');
    } finally {
      setRenderInProgress(false);
    }
  };

  // Update download button
  const getDownloadUrl = (sessionId) => {
    return `${api.defaults.baseURL}/blendsession/${sessionId}/download`;
  };

  const filteredSessions = sessions.filter(session => {
    if (requestFilter === 'all') return true;
    return session.status === requestFilter;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Blender Rendering Dashboard</h1>
      <p className="mb-6">Manage Blender rendering requests for your devices</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Session List */}
        <div className="md:col-span-1 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-blue-600 text-white">
            <h2 className="text-xl font-semibold">Rendering Sessions</h2>
          </div>
          
          <div className="p-4 border-b">
            <div className="flex gap-2">
              <button
                onClick={() => setRequestFilter('all')}
                className={`px-3 py-1 rounded text-sm ${
                  requestFilter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setRequestFilter('requested')}
                className={`px-3 py-1 rounded text-sm ${
                  requestFilter === 'requested' 
                    ? 'bg-yellow-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Requested
              </button>
              <button
                onClick={() => setRequestFilter('active')}
                className={`px-3 py-1 rounded text-sm ${
                  requestFilter === 'active' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setRequestFilter('completed')}
                className={`px-3 py-1 rounded text-sm ${
                  requestFilter === 'completed' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Completed
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="overflow-y-auto max-h-[500px]">
              {filteredSessions.map((session) => (
                <div 
                  key={session._id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    activeSessionId === session._id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleViewSession(session._id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{session.device.deviceName}</p>
                      <p className="text-sm text-gray-500">
                        Renter: {session.renter?.username || session.renter?.email || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      session.status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                      session.status === 'active' ? 'bg-green-100 text-green-800' :
                      session.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No sessions found
            </div>
          )}
        </div>
        
        {/* Session Details */}
        <div className="md:col-span-2">
          {sessionDetails ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-blue-600 text-white">
                <h2 className="text-xl font-semibold">Session Details</h2>
                <div className="flex justify-between items-center mt-2">
                  <span className={`inline-block px-3 py-1 bg-white rounded font-medium ${
                    sessionDetails.status === 'requested' ? 'text-yellow-600' :
                    sessionDetails.status === 'active' ? 'text-green-600' :
                    sessionDetails.status === 'completed' ? 'text-gray-600' :
                    'text-red-600'
                  }`}>
                    {sessionDetails.status}
                  </span>
                  <span className="text-sm">ID: {sessionDetails._id}</span>
                </div>
              </div>
              
              {/* Renter Information */}
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold mb-2">Renter Information</h3>
                <p><span className="font-medium">Email:</span> {sessionDetails.renter.email}</p>
                {sessionDetails.renter.username && (
                  <p><span className="font-medium">Username:</span> {sessionDetails.renter.username}</p>
                )}
              </div>
              
              {/* Device Information */}
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold mb-2">Device</h3>
                <p><span className="font-medium">Name:</span> {sessionDetails.device.deviceName}</p>
                <p><span className="font-medium">Type:</span> {sessionDetails.device.deviceType}</p>
                <p><span className="font-medium">Price:</span> ${sessionDetails.device.price}/hr</p>
              </div>
              
              {/* Blender Files */}
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold mb-2">Blender Files</h3>
                {sessionDetails.uploadedFiles && sessionDetails.uploadedFiles.length > 0 ? (
                  <div>
                    <p className="font-medium mb-2">Files uploaded to cloud storage:</p>
                    <div className="space-y-2">
                      {sessionDetails.uploadedFiles.map((file, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{file.originalName}</span>
                          <a 
                            href={file.cloudinaryUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-xs px-2 py-1 bg-blue-100 rounded"
                          >
                            View File
                          </a>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      ✅ All files are ready for rendering on your device.
                    </p>
                  </div>
                ) : sessionDetails.blendFile ? (
                  <div>
                    <p><span className="font-medium">Main Blend File:</span> {sessionDetails.blendFile}</p>
                    <p className="text-xs text-gray-500 mt-1">(Legacy upload - files stored locally)</p>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 text-yellow-700 rounded">
                    <p>⏳ No files uploaded yet - waiting for renter to upload files</p>
                  </div>
                )}
              </div>
              
              {/* Controls */}
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold mb-2">Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {sessionDetails.status === 'requested' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(sessionDetails._id, 'active')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                        disabled={!sessionDetails.uploadedFiles || sessionDetails.uploadedFiles.length === 0}
                      >
                        Accept Request
                      </button>
                      
                      <button
                        onClick={() => handleUpdateStatus(sessionDetails._id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Reject Request
                      </button>
                    </>
                  )}
                  
                  {sessionDetails.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleRunRender(sessionDetails._id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                        disabled={renderInProgress || (!sessionDetails.uploadedFiles || sessionDetails.uploadedFiles.length === 0)}
                      >
                        {renderInProgress ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Downloading & Rendering...
                          </span>
                        ) : 'Start Render Process'}
                      </button>
                      
                      <button
                        onClick={() => handleUpdateStatus(sessionDetails._id, 'completed')}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Complete Session
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => window.location.href = getDownloadUrl(sessionDetails._id)}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                    disabled={!sessionDetails.cloudinaryUrls || sessionDetails.cloudinaryUrls.length === 0}
                  >
                    Download Renders
                  </button>
                </div>
                
                {sessionDetails.status === 'requested' && (!sessionDetails.uploadedFiles || sessionDetails.uploadedFiles.length === 0) && (
                  <p className="mt-2 text-yellow-600 text-sm">
                    ⏳ Waiting for renter to upload files to cloud storage before you can accept
                  </p>
                )}
                
                {sessionDetails.status === 'active' && renderInProgress && (
                  <div className="mt-3 p-3 bg-blue-50 text-blue-700 rounded">
                    <p className="font-medium">🔄 Render Process Active</p>
                    <p className="text-sm mt-1">
                      • Files are being downloaded from cloud storage to your device<br/>
                      • Docker container is building and executing Blender render<br/>
                      • Output will be uploaded back to cloud for renter access
                    </p>
                  </div>
                )}
              </div>
              
              {/* Render Output */}
              {renderOutput && (
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">Render Output</h3>
                  
                  {/* Display rendered images if available */}
                  {sessionDetails.cloudinaryUrls && sessionDetails.cloudinaryUrls.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Rendered Images:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {sessionDetails.cloudinaryUrls.map((item, index) => (
                          <div key={index} className="border rounded-lg overflow-hidden shadow-sm">
                            <div className="p-2 bg-gray-50 border-b truncate text-sm">
                              {item.filename}
                            </div>
                            <div className="p-2 flex items-center justify-center">
                              <img 
                                src={item.url}
                                alt={item.filename}
                                className="max-h-48 max-w-full object-contain"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-auto max-h-[300px] text-sm">
                    {renderOutput}
                  </pre>
                </div>
              )}
              
              {/* Session Timeline */}
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">Session Timeline</h3>
                <div className="text-sm">
                  <p><span className="font-medium">Created:</span> {new Date(sessionDetails.createdAt).toLocaleString()}</p>
                  {sessionDetails.startTime && (
                    <p><span className="font-medium">Started:</span> {new Date(sessionDetails.startTime).toLocaleString()}</p>
                  )}
                  {sessionDetails.endTime && (
                    <p><span className="font-medium">Completed:</span> {new Date(sessionDetails.endTime).toLocaleString()}</p>
                  )}
                  {sessionDetails.status === 'completed' && sessionDetails.cost > 0 && (
                    <p className="font-medium mt-2 text-yellow-600">Total Cost: ${sessionDetails.cost.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <p>Select a session to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LenderDashboard;
