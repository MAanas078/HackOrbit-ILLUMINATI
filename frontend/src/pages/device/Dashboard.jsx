import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, RadialBarChart, RadialBar 
} from 'recharts';
import { 
  Activity, Cpu, Database, HardDrive, Layers, Monitor, 
  RefreshCw, LogOut, Settings, AlertCircle, User
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';

// API URL based on environment
const API_URL = 
  `${import.meta.env.VITE_API_URL}/api/device`

const DeviceDashboard = () => {
  const { user, isAuthenticated, logout, isCheckingAuth } = useAuthStore();
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [utilization, setUtilization] = useState({});
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [refreshing, setRefreshing] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    // Auth store already handles the check-auth call in its initialization
    if (!isAuthenticated && !isCheckingAuth) {
      // Redirect to login if not authenticated and done checking
      window.location.href = '/login';
    }
  }, [isAuthenticated, isCheckingAuth]);

  // Fetch user devices on component mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDevices();
    }

    // Set up refreshing interval for utilization data
    const intervalId = setInterval(() => {
      if (selectedDevice && isAuthenticated) {
        fetchUtilizationData(selectedDevice._id);
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 500);
      }
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [selectedDevice, refreshInterval, isAuthenticated]);

  // Fetch devices from the API
  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/my-devices`);
      
      setDevices(response.data);
      setLoading(false);
      
      // Select first device by default if available
      if (response.data.length > 0 && !selectedDevice) {
        setSelectedDevice(response.data[0]);
        fetchUtilizationData(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setError(error.response?.data?.message || 'Failed to fetch your devices');
      setLoading(false);
    }
  };

  // Fetch real-time utilization data for a specific device
  const fetchUtilizationData = async (deviceId) => {
    try {
      // In a real implementation, you would use:
      // const response = await axios.get(`${API_URL}/${deviceId}/utilization`);
      // const data = response.data;
      
      // Simulate API response with random data for demo
      const simulatedData = {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        storage: Math.floor(Math.random() * 100),
        network: Math.floor(Math.random() * 100),
        temperature: 40 + Math.floor(Math.random() * 40),
        powerUsage: 50 + Math.floor(Math.random() * 200),
        historyData: Array.from({ length: 24 }, (_, i) => ({
          time: `${i}:00`,
          usage: 20 + Math.floor(Math.random() * 80)
        })),
        taskDistribution: [
          { name: 'AI Training', value: 45 },
          { name: 'Rendering', value: 30 },
          { name: 'Computation', value: 15 },
          { name: 'Other', value: 10 }
        ]
      };
      
      setUtilization(simulatedData);
    } catch (error) {
      console.error('Error fetching utilization data:', error);
    }
  };

  // Handle device selection change
  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
    fetchUtilizationData(device._id);
  };

  // Handle device availability toggle
  const toggleDeviceAvailability = async (deviceId, currentStatus) => {
    try {
      const response = await axios.put(`${API_URL}/${deviceId}`, {
        isAvailable: !currentStatus
      });
      
      // Update devices list with the updated device
      setDevices(devices.map(device => 
        device._id === deviceId ? response.data : device
      ));
      
      // Update selected device if it's the one being toggled
      if (selectedDevice && selectedDevice._id === deviceId) {
        setSelectedDevice(response.data);
      }
    } catch (error) {
      console.error('Error updating device availability:', error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Format device specs for display
  const formatSpecs = (specs) => {
    if (!specs) return [];
    
    // Convert Map to array of key-value pairs
    return Array.from(Object.entries(specs)).map(([key, value]) => ({
      key: key.charAt(0).toUpperCase() + key.slice(1),
      value
    }));
  };

  // Colors for charts
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

  // Generate utilization color based on value
  const getUtilizationColor = (value) => {
    if (value < 50) return '#4caf50';
    if (value < 80) return '#ff9800';
    return '#f44336';
  };

  // Show loading state while checking auth or loading devices
  if (isCheckingAuth || (loading && !error)) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-900 text-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin mb-4">
            <RefreshCw size={32} />
          </div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-900 text-white">
        <div className="flex flex-col items-center text-center max-w-md">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchDevices} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 p-6 mt-16">
        
      <div className="max-w-full mx-auto">
        {/* Header with user info */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Device Dashboard
            </h1>
            <p className="text-gray-400">Monitor and manage your compute resources</p>
          </div>
          
          <div className="flex items-center">
            {/* User info and actions */}
            <div className="mr-6 flex items-center">
              <div className="mr-4 flex items-center">
                <span className="mr-2 text-sm text-gray-400">Refresh:</span>
                <select 
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                >
                  <option value={2}>2s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                </select>
              </div>
              
              <button 
                className={`flex items-center bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition ${refreshing ? 'animate-spin text-blue-400' : ''}`}
                onClick={() => {
                  if (selectedDevice) {
                    fetchUtilizationData(selectedDevice._id);
                    setRefreshing(true);
                    setTimeout(() => setRefreshing(false), 500);
                  }
                }}
              >
                <RefreshCw size={18} />
              </button>
            </div>
            
            {/* User profile dropdown */}
            <div className="relative group">
              <button className="flex items-center rounded-full p-1 bg-gray-800 hover:bg-gray-700">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <User size={16} />
                </div>
              </button>
              
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="p-3 border-b border-gray-700">
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-400">{user?.email || ''}</p>
                </div>
                <div className="p-2">
                  <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-700 flex items-center">
                    <Settings size={14} className="mr-2" />
                    Account Settings
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-700 text-red-400 flex items-center"
                  >
                    <LogOut size={14} className="mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Device List Sidebar */}
          <div className="lg:col-span-1 bg-gray-800 rounded-xl p-4 h-fit">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Monitor size={18} className="mr-2" />
              My Devices
            </h2>
            
            {devices.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-4">No devices found</p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">
                  Add Your First Device
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {devices.map(device => (
                  <div 
                    key={device._id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedDevice && selectedDevice._id === device._id 
                        ? 'bg-blue-900/40 border border-blue-500/50' 
                        : 'bg-gray-700/40 hover:bg-gray-700 border border-transparent'
                    }`}
                    onClick={() => handleDeviceSelect(device)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{device.deviceName}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded ${device.isAvailable ? 'bg-green-900/60 text-green-400' : 'bg-red-900/60 text-red-400'}`}>
                        {device.isAvailable ? 'Available' : 'Busy'}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-400 mt-1">
                      <div className="mr-3 flex items-center">
                        {device.deviceType === 'CPU' && <Cpu size={12} className="mr-1" />}
                        {device.deviceType === 'GPU' && <Layers size={12} className="mr-1" />}
                        {device.deviceType === 'RAM' && <Database size={12} className="mr-1" />}
                        {device.deviceType === 'Storage' && <HardDrive size={12} className="mr-1" />}
                        {device.deviceType === 'Full System' && <Monitor size={12} className="mr-1" />}
                        {device.deviceType}
                      </div>
                      <div className="flex items-center">
                        <Activity size={12} className="mr-1" />
                        Score: {device.performance}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Dashboard Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedDevice ? (
              <>
                {/* Selected Device Overview */}
                <div className="bg-gray-800 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedDevice.deviceName}</h2>
                      <p className="text-gray-400">{selectedDevice.deviceType} • ${selectedDevice.price}/hr • {selectedDevice.location}</p>
                    </div>
                    <div className="flex space-x-3">
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">
                        Edit Device
                      </button>
                      <button 
                        className={`${
                          selectedDevice.isAvailable 
                            ? 'bg-gray-700 hover:bg-gray-600' 
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white px-4 py-2 rounded-lg text-sm transition`}
                        onClick={() => toggleDeviceAvailability(
                          selectedDevice._id, 
                          selectedDevice.isAvailable
                        )}
                      >
                        {selectedDevice.isAvailable ? 'Set Unavailable' : 'Set Available'}
                      </button>
                    </div>
                  </div>
                  
                  {/* Specs */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                    {formatSpecs(selectedDevice.specs).map((spec, index) => (
                      <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400">{spec.key}</p>
                        <p className="font-medium truncate">{spec.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Utilization Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {/* Current CPU Usage */}
                  <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">CPU Utilization</h3>
                    <div className="flex justify-center h-40">
                      <RadialBarChart 
                        width={150} 
                        height={150} 
                        innerRadius="60%" 
                        outerRadius="100%" 
                        data={[{ value: utilization.cpu || 0, fill: getUtilizationColor(utilization.cpu || 0) }]} 
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          background
                          dataKey="value"
                          cornerRadius={10}
                        />
                        <text
                          x={75}
                          y={75}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-2xl font-bold"
                          fill="#fff"
                        >
                          {utilization.cpu || 0}%
                        </text>
                      </RadialBarChart>
                    </div>
                  </div>
                  
                  {/* Memory Usage */}
                  <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">Memory Usage</h3>
                    <div className="flex justify-center h-40">
                      <RadialBarChart 
                        width={150} 
                        height={150} 
                        innerRadius="60%" 
                        outerRadius="100%" 
                        data={[{ value: utilization.memory || 0, fill: getUtilizationColor(utilization.memory || 0) }]} 
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          background
                          dataKey="value"
                          cornerRadius={10}
                        />
                        <text
                          x={75}
                          y={75}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-2xl font-bold"
                          fill="#fff"
                        >
                          {utilization.memory || 0}%
                        </text>
                      </RadialBarChart>
                    </div>
                  </div>
                  
                  {/* Storage Usage */}
                  <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">Storage Usage</h3>
                    <div className="flex justify-center h-40">
                      <RadialBarChart 
                        width={150} 
                        height={150} 
                        innerRadius="60%" 
                        outerRadius="100%" 
                        data={[{ value: utilization.storage || 0, fill: getUtilizationColor(utilization.storage || 0) }]} 
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          background
                          dataKey="value"
                          cornerRadius={10}
                        />
                        <text
                          x={75}
                          y={75}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-2xl font-bold"
                          fill="#fff"
                        >
                          {utilization.storage || 0}%
                        </text>
                      </RadialBarChart>
                    </div>
                  </div>
                </div>
                
                {/* Historical Usage & Task Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Historical Usage Chart */}
                  <div className="bg-gray-800 rounded-xl p-4 lg:col-span-2">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">Usage History (24 hours)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={utilization.historyData || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                          <XAxis 
                            dataKey="time" 
                            stroke="#888" 
                            tick={{ fill: '#888', fontSize: 12 }} 
                          />
                          <YAxis 
                            stroke="#888" 
                            tick={{ fill: '#888', fontSize: 12 }} 
                            domain={[0, 100]}
                            unit="%"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '0.375rem',
                              color: '#fff'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="usage" 
                            stroke="#8884d8" 
                            strokeWidth={2} 
                            dot={{ fill: '#8884d8', r: 4 }}
                            activeDot={{ fill: '#8884d8', r: 6, stroke: '#fff', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Task Distribution */}
                  <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">Task Distribution</h3>
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={utilization.taskDistribution || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {(utilization.taskDistribution || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '0.375rem',
                              color: '#fff'
                            }}
                            formatter={(value) => [`${value} %`, 'Usage']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                
                {/* System Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Temperature */}
                  <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Temperature</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{utilization.temperature || 0}°C</span>
                      <div className="w-2/3 bg-gray-700 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full"
                          style={{
                            width: `${Math.min(100, (utilization.temperature || 0) / 100 * 100)}%`,
                            backgroundColor: 
                              (utilization.temperature || 0) < 60 
                                ? '#4caf50' 
                                : (utilization.temperature || 0) < 80 
                                  ? '#ff9800' 
                                  : '#f44336'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Power Usage */}
                  <div className="bg-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Power Usage</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{utilization.powerUsage || 0}W</span>
                      <div className="w-2/3 bg-gray-700 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full bg-blue-500"
                          style={{
                            width: `${Math.min(100, (utilization.powerUsage || 0) / 250 * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <Monitor size={48} className="text-gray-500 mb-4" />
                <h3 className="text-xl font-medium mb-2">No Device Selected</h3>
                <p className="text-gray-400 max-w-md">
                  Select a device from the sidebar to view detailed information and real-time utilization metrics.
                </p>
                {devices.length === 0 && (
                  <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">
                    Add Your First Device
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceDashboard;