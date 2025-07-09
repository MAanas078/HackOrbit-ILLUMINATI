import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCpu, FiClock, FiDollarSign, FiMessageSquare, FiShield, FiActivity, FiCheck, FiAlertCircle } from 'react-icons/fi';
import CodeEditor from './CodeEditor';
import ProofDetails from './ProofDetails ';
import useZKProofManager from './ZKProofManager';
import { SessionWithChat } from './ChatComponent';
import { useAuthStore } from '../../store/authStore';

const RenterDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [executionStatuses, setExecutionStatuses] = useState({});
  const { lastProof } = useZKProofManager();
  const { user, isAuthenticated } = useAuthStore();

  const API_BASE = import.meta.env.MODE === "development" ? import.meta.env.VITE_API_URL : "";

  useEffect(() => {
    if (isAuthenticated) {
      fetchSessions();
      // Poll for execution status updates every 5 seconds
      const interval = setInterval(() => {
        fetchExecutionStatuses();
      }, 5000);
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
      const response = await axios.get(`${API_BASE}/api/session/renter`, {
        withCredentials: true
      });
      setSessions(response.data.sessions);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setLoading(false);
    }
  };

  const fetchExecutionStatuses = async () => {
    if (!isAuthenticated || sessions.length === 0) return;

    try {
      const statusPromises = sessions
        .filter(session => session.status === 'active')
        .map(session => 
          axios.get(`${API_BASE}/api/session/${session._id}/result`, {
            withCredentials: true
          }).then(res => ({
            sessionId: session._id,
            status: res.data.executionStatus,
            hasOutput: res.data.result && res.data.result.length > 0
          })).catch(() => ({
            sessionId: session._id,
            status: 'pending',
            hasOutput: false
          }))
        );

      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(({ sessionId, status, hasOutput }) => {
        statusMap[sessionId] = { status, hasOutput };
      });
      setExecutionStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching execution statuses:', error);
    }
  };

  const calculateSessionDuration = (session) => {
    const { startTime, endTime } = session;
    if (!startTime || !endTime) return "Not completed";
    
    const diff = new Date(endTime) - new Date(startTime);
    if (diff <= 0) return "Invalid";
    
    const totalMinutes = Math.ceil(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const calculateCost = (session) => {
    const { startTime, endTime, cost } = session;
    if (!endTime || !startTime) return '$0.00';
    return `$${cost.toFixed(2)}`;
  };

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'requested': return 'bg-yellow-900/50 text-yellow-300';
      case 'active': return 'bg-green-900/50 text-green-300';
      case 'completed': return 'bg-blue-900/50 text-blue-300';
      case 'rejected': return 'bg-red-900/50 text-red-300';
      default: return 'bg-gray-900/50 text-gray-300';
    }
  };

  const getExecutionStatusDisplay = (sessionId) => {
    const execStatus = executionStatuses[sessionId];
    if (!execStatus) return null;

    const { status, hasOutput } = execStatus;
    
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center text-yellow-400 text-sm">
            <FiClock className="mr-1" />
            Waiting for execution
          </div>
        );
      case 'executing':
        return (
          <div className="flex items-center text-blue-400 text-sm">
            <FiActivity className="mr-1 animate-pulse" />
            Executing on lender device...
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center text-green-400 text-sm">
            <FiCheck className="mr-1" />
            Execution completed
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-400 text-sm">
            <FiAlertCircle className="mr-1" />
            Execution failed
          </div>
        );
      default:
        return null;
    }
  };

  const handleSessionClick = (session) => {
    setActiveSession(session._id === activeSession ? null : session._id);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h3 className="text-xl font-medium text-white mb-2">Authentication Required</h3>
          <p className="text-gray-400">Please log in to view your computing sessions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">My Computing Sessions</h2>
        {user && (
          <div className="text-gray-400">
            Welcome, <span className="text-white font-medium">{user.name}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="grid gap-6">
          {sessions.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <h3 className="text-xl font-medium text-white mb-2">No sessions found</h3>
              <p className="text-gray-400">
                Rent a device from the marketplace to start a computing session
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
                      <FiCpu className="text-indigo-400 text-xl" />
                      <h3 className="text-xl font-medium text-white">
                        {session.device?.deviceName}
                      </h3>
                      <span className={`${getSessionStatusColor(session.status)} text-xs font-medium px-2.5 py-0.5 rounded`}>
                        {session.status}
                      </span>
                      {session.status === 'active' && (
                        <span className="bg-indigo-900/50 text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                          <FiShield className="mr-1" />
                          Remote Execution Ready
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-bold text-white">
                      {calculateCost(session)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-gray-400">
                      <span className="font-medium text-gray-300">Device Type:</span> {session.device?.deviceType}
                    </div>
                    <div className="text-gray-400">
                      <span className="font-medium text-gray-300">Duration:</span> {calculateSessionDuration(session)}
                    </div>
                    <div className="text-gray-400">
                      <span className="font-medium text-gray-300">Language:</span> {session.language || 'Python'}
                    </div>
                    <div className="text-gray-400">
                      {session.status === 'active' && getExecutionStatusDisplay(session._id)}
                    </div>
                  </div>
                </div>

                {/* Expanded View */}
                {activeSession === session._id && (
                  <div className="border-t border-gray-700">
                    {session.status === 'active' ? (
                      <div className="p-4">
                        {/* Security Notice */}
                        <div className="bg-indigo-900/20 border border-indigo-900/50 rounded-lg p-4 mb-4">
                          <div className="flex items-center text-indigo-300 mb-2">
                            <FiShield className="mr-2" />
                            <span className="font-medium">Secure Remote Execution</span>
                          </div>
                          <p className="text-indigo-200 text-sm">
                            Your code will be encrypted and executed on the lender's device in an isolated Docker container. 
                            The lender cannot view your source code, and execution is limited to 30 seconds with resource constraints.
                          </p>
                        </div>

                        {/* Display ZK Proof if available */}
                        {lastProof && activeSession === session._id && (
                          <div className="mb-4">
                            <ProofDetails proof={lastProof} />
                          </div>
                        )}

                        {/* Code Editor with Chat */}
                        <SessionWithChat sessionId={session._id} isLender={false}>
                          <CodeEditor 
                            sessionId={session._id} 
                            isLender={false}
                            executionStatus={executionStatuses[session._id]?.status || 'pending'}
                          />
                        </SessionWithChat>
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        {session.status === 'requested' && (
                          <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-4">
                            <p className="text-yellow-300 font-medium">
                              ⏳ Waiting for Approval
                            </p>
                            <p className="text-yellow-200 text-sm mt-1">
                              Your request is pending approval from the device owner.
                            </p>
                          </div>
                        )}
                        {session.status === 'completed' && (
                          <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4">
                            <p className="text-blue-300 font-medium">
                              ✅ Session Completed
                            </p>
                            <p className="text-blue-200 text-sm mt-1">
                              This computing session has been completed successfully.
                              Total cost: {calculateCost(session)}
                            </p>
                          </div>
                        )}
                        {session.status === 'rejected' && (
                          <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4">
                            <p className="text-red-300 font-medium">
                              ❌ Request Rejected
                            </p>
                            <p className="text-red-200 text-sm mt-1">
                              Your session request was rejected by the device owner.
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

export default RenterDashboard;