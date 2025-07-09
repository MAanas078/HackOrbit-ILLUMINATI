import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCpu, FiCheck, FiX, FiUser, FiClock, FiMonitor, FiPlay, FiRefreshCw, FiShield, FiActivity, FiAlertCircle } from 'react-icons/fi';
import CodeEditor from './CodeEditor';
import { SessionWithChat } from './ChatComponent';
import { useAuthStore } from '../../store/authStore';

const LenderDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [pendingExecutions, setPendingExecutions] = useState([]);
  const [executingSessions, setExecutingSessions] = useState(new Set());
  
  const { user, isAuthenticated } = useAuthStore();
  
  const API_BASE =  import.meta.env.VITE_API_URL

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
      fetchPendingExecutions();
      
      // Refresh sessions and pending executions periodically
      const interval = setInterval(() => {
        fetchSessions();
        fetchPendingExecutions();
      }, 10000); // Every 10 seconds for more responsive updates
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchSessions = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/session/owner`, {
        withCredentials: true
      });
      setSessions(response.data.sessions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setLoading(false);
    }
  };

  const fetchPendingExecutions = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await axios.get(`${API_BASE}/api/session/pending-execution`, {
        withCredentials: true
      });
      setPendingExecutions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching pending executions:', error);
    }
  };

  const updateSessionStatus = async (sessionId, status) => {
    if (!isAuthenticated) {
      alert('Authentication required');
      return;
    }

    try {
      await axios.put(`${API_BASE}/api/session/${sessionId}/status`, 
        { status }, 
        { withCredentials: true }
      );
      
      // Update UI
      setSessions(sessions.map(session => 
        session._id === sessionId ? { ...session, status } : session
      ));
      
      // If accepting, set as active session
      if (status === 'active') {
        setActiveSession(sessionId);
      }

      // Refresh pending executions after status change
      setTimeout(fetchPendingExecutions, 1000);
    } catch (error) {
      console.error('Error updating session status:', error);
      alert('Failed to update session status');
    }
  };

  // NEW: Execute code on lender's device
  const executeCodeOnLenderDevice = async (sessionId) => {
    if (executingSessions.has(sessionId)) return; // Prevent double execution

    try {
      setExecutingSessions(prev => new Set(prev).add(sessionId));
      
      const response = await axios.post(
        `${API_BASE}/api/session/${sessionId}/execute`,
        {},
        { withCredentials: true }
      );

      if (response.data.success) {
        // Refresh sessions and pending executions
        fetchSessions();
        fetchPendingExecutions();
        
        // Show success message
        alert('Code executed successfully on your device!');
      }
    } catch (error) {
      console.error('Error executing code:', error);
      alert(`Execution failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setExecutingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'requested':
        return 'bg-yellow-900/50 text-yellow-300';
      case 'active':
        return 'bg-green-900/50 text-green-300';
      case 'completed':
        return 'bg-blue-900/50 text-blue-300';
      case 'rejected':
        return 'bg-red-900/50 text-red-300';
      default:
        return 'bg-gray-900/50 text-gray-300';
    }
  };

  const handleSessionClick = (session) => {
    setActiveSession(session._id === activeSession ? null : session._id);
  };

  const calculateSessionDuration = (session) => {
    const { startTime, endTime } = session;
    if (!startTime) return "Not started";
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end - start;
    
    if (diff <= 0) return "Invalid";

    const totalMinutes = Math.ceil(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  const calculateEarnings = (session) => {
    if (!session.cost) return '$0.00';
    return `$${session.cost.toFixed(2)}`;
  };

  // Check if session has pending execution
  const hasPendingExecution = (sessionId) => {
    return pendingExecutions.some(pending => pending._id === sessionId);
  };

  const isExecuting = (sessionId) => {
    return executingSessions.has(sessionId);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h3 className="text-xl font-medium text-white mb-2">Authentication Required</h3>
          <p className="text-gray-400">Please log in to view your device rental requests</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Device Rental Requests</h2>
        {user && (
          <div className="text-gray-400">
            Welcome, <span className="text-white font-medium">{user.name}</span>
          </div>
        )}
      </div>

      {/* Pending Executions Alert */}
      {pendingExecutions.length > 0 && (
        <div className="bg-indigo-900/20 border border-indigo-900/50 rounded-lg p-4 mb-6">
          <div className="flex items-center text-indigo-300 mb-2">
            <FiActivity className="mr-2" />
            <span className="font-medium">
              {pendingExecutions.length} Code Execution{pendingExecutions.length !== 1 ? 's' : ''} Pending
            </span>
          </div>
          <p className="text-indigo-200 text-sm mb-3">
            Renters have uploaded encrypted code waiting for execution on your devices.
          </p>
          <div className="flex flex-wrap gap-2">
            {pendingExecutions.map(session => (
              <button
                key={session._id}
                onClick={() => executeCodeOnLenderDevice(session._id)}
                disabled={isExecuting(session._id)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center transition-colors"
              >
                {isExecuting(session._id) ? (
                  <>
                    <div className="animate-spin h-3 w-3 border border-white rounded-full border-t-transparent mr-2"></div>
                    Executing...
                  </>
                ) : (
                  <>
                    <FiPlay className="mr-1" />
                    Execute on {session.device?.deviceName}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="grid gap-6">
          {sessions.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <h3 className="text-xl font-medium text-white mb-2">No rental requests</h3>
              <p className="text-gray-400">
                You currently have no device rental requests or active sessions
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session._id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                {/* Session Header */}
                <div 
                  className="px-6 py-4 cursor-pointer hover:bg-gray-750 transition-colors"
                  onClick={() => handleSessionClick(session)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <FiMonitor className="text-indigo-400 text-xl" />
                      <h3 className="text-xl font-medium text-white">
                        {session.device?.deviceName || 'Unknown Device'}
                      </h3>
                      <span className={`${getSessionStatusColor(session.status)} text-xs font-medium px-2.5 py-0.5 rounded`}>
                        {session.status}
                      </span>
                      
                      {/* Show execution status for active sessions */}
                      {session.status === 'active' && (
                        <>
                          {hasPendingExecution(session._id) && (
                            <span className="bg-orange-900/50 text-orange-300 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                              <FiClock className="mr-1" />
                              Code Ready for Execution
                            </span>
                          )}
                          {isExecuting(session._id) && (
                            <span className="bg-blue-900/50 text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                              <FiActivity className="mr-1 animate-pulse" />
                              Executing on Device
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Earnings Display */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          {calculateEarnings(session)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {calculateSessionDuration(session)}
                        </div>
                      </div>

                      {/* Quick Execute Button for Active Sessions with Pending Code */}
                      {session.status === 'active' && hasPendingExecution(session._id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            executeCodeOnLenderDevice(session._id);
                          }}
                          disabled={isExecuting(session._id)}
                          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-3 py-1 rounded-lg flex items-center text-sm transition-colors"
                        >
                          {isExecuting(session._id) ? (
                            <>
                              <div className="animate-spin h-3 w-3 border border-white rounded-full border-t-transparent mr-2"></div>
                              Executing...
                            </>
                          ) : (
                            <>
                              <FiPlay className="mr-1" /> Execute Code
                            </>
                          )}
                        </button>
                      )}

                      {/* Action buttons for requested sessions */}
                      {session.status === 'requested' && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSessionStatus(session._id, 'active');
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg flex items-center text-sm transition-colors"
                          >
                            <FiCheck className="mr-1" /> Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateSessionStatus(session._id, 'rejected');
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg flex items-center text-sm transition-colors"
                          >
                            <FiX className="mr-1" /> Reject
                          </button>
                        </div>
                      )}
                      
                      {/* Complete button for active sessions */}
                      {session.status === 'active' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSessionStatus(session._id, 'completed');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg flex items-center text-sm transition-colors"
                        >
                          <FiCheck className="mr-1" /> Complete Session
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-gray-400">
                      <span className="font-medium text-gray-300">Renter:</span> {session.renter?.name || "Unknown"}
                    </div>
                    <div className="text-gray-400">
                      <span className="font-medium text-gray-300">Device Type:</span> {session.device?.deviceType || "Unknown"}
                    </div>
                    <div className="text-gray-400">
                      <span className="font-medium text-gray-300">Requested:</span> {new Date(session.createdAt).toLocaleString()}
                    </div>
                    <div className="text-gray-400">
                      <span className="font-medium text-gray-300">Language:</span> {session.language || "Python"}
                    </div>
                  </div>
                </div>
                
                {/* Expanded View with Code Editor and Chat */}
                {activeSession === session._id && (
                  <div className="border-t border-gray-700">
                    {session.status === 'active' ? (
                      <div className="p-4">
                        {/* Lender Security Notice */}
                        <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4 mb-4">
                          <div className="flex items-center text-green-300 mb-2">
                            <FiShield className="mr-2" />
                            <span className="font-medium">Secure Execution Environment</span>
                          </div>
                          <p className="text-green-200 text-sm">
                            You are providing compute resources to execute encrypted code. The source code is never visible to you. 
                            All executions happen in isolated Docker containers with resource limits and no network access.
                          </p>
                        </div>

                        {/* Execution Status Panel */}
                        {hasPendingExecution(session._id) && (
                          <div className="bg-indigo-900/20 border border-indigo-900/50 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center text-indigo-300 mb-1">
                                  <FiClock className="mr-2" />
                                  <span className="font-medium">Code Ready for Execution</span>
                                </div>
                                <p className="text-indigo-200 text-sm">
                                  The renter has uploaded encrypted code waiting for execution on your device.
                                </p>
                              </div>
                              <button
                                onClick={() => executeCodeOnLenderDevice(session._id)}
                                disabled={isExecuting(session._id)}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                              >
                                {isExecuting(session._id) ? (
                                  <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                                    Executing...
                                  </>
                                ) : (
                                  <>
                                    <FiPlay className="mr-2" /> Execute on My Device
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Wrap CodeEditor with SessionWithChat for integrated chat functionality */}
                        <SessionWithChat sessionId={session._id} isLender={true}>
                          <CodeEditor sessionId={session._id} isLender={true} />
                        </SessionWithChat>
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        {session.status === 'requested' && (
                          <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-4">
                            <p className="text-yellow-300 font-medium">
                              ⏳ Pending Your Response
                            </p>
                            <p className="text-yellow-200 text-sm mt-1">
                              Accept this request to start the computing session and begin earning.
                            </p>
                          </div>
                        )}
                        {session.status === 'completed' && (
                          <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4">
                            <p className="text-blue-300 font-medium">
                              ✅ Session Completed
                            </p>
                            <p className="text-blue-200 text-sm mt-1">
                              This session has been completed successfully. Earnings: {calculateEarnings(session)}
                            </p>
                          </div>
                        )}
                        {session.status === 'rejected' && (
                          <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
                            <p className="text-red-300 font-medium">
                              ❌ Request Rejected
                            </p>
                            <p className="text-red-200 text-sm mt-1">
                              You rejected this session request.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LenderDashboard;