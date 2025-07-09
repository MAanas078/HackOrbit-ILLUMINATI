import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCpu, FiHardDrive, FiServer, FiMonitor, FiFilter, FiSearch } from 'react-icons/fi';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DeviceChatbot from './DeviceAI';

const DeviceMarketplace = () => {
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    deviceType: '',
    minPrice: '',
    maxPrice: '',
    searchTerm: '',
    taskType: ''
  });
  const [rentLoading, setRentLoading] = useState(false);
  
  const navigate = useNavigate();

  const commonTaskTypes = ["AI Training", "3D Rendering", "Data Processing", "Gaming", "Video Encoding"];
  const API_BASE = import.meta.env.VITE_API_URL;
  
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/api/device`);
        setDevices(response.data);
        setFilteredDevices(response.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load devices. Please try again later.");
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  useEffect(() => {
    // Apply filters whenever the filters state changes
    let results = [...devices];
    
    if (filters.deviceType) {
      results = results.filter(device => device.deviceType === filters.deviceType);
    }
    
    if (filters.minPrice) {
      results = results.filter(device => device.price >= Number(filters.minPrice));
    }
    
    if (filters.maxPrice) {
      results = results.filter(device => device.price <= Number(filters.maxPrice));
    }
    
    if (filters.taskType) {
      results = results.filter(device => 
        device.acceptedTaskTypes && device.acceptedTaskTypes.includes(filters.taskType)
      );
    }
    
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      results = results.filter(device => 
        device.deviceName.toLowerCase().includes(searchLower) || 
        device.location.toLowerCase().includes(searchLower) ||
        (device.specs && Object.entries(device.specs).some(([key, value]) => 
          value.toLowerCase().includes(searchLower)
        ))
      );
    }
    
    setFilteredDevices(results);
  }, [filters, devices]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({
      ...prev,
      searchTerm: e.target.value
    }));
  };

  const resetFilters = () => {
    setFilters({
      deviceType: '',
      minPrice: '',
      maxPrice: '',
      searchTerm: '',
      taskType: ''
    });
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'CPU':
        return <FiCpu className="text-indigo-400 text-xl" />;
      case 'GPU':
        return <FiServer className="text-purple-400 text-xl" />;
      case 'RAM':
        return <FiHardDrive className="text-violet-400 text-xl" />;
      case 'Storage':
        return <FiHardDrive className="text-indigo-400 text-xl" />;
      case 'Full System':
        return <FiMonitor className="text-purple-500 text-xl" />;
      default:
        return <FiServer className="text-indigo-400 text-xl" />;
    }
  };

  const formatSpecs = (specs) => {
    if (!specs) return "No specifications available";
    
    // Convert Map to entries for display
    const entries = Object.entries(specs);
    if (entries.length === 0) return "No specifications available";
    
    // Only show up to 3 specs in the card
    return entries.slice(0, 3).map(([key, value]) => (
      <div key={key} className="text-gray-300">
        <span className="font-medium text-indigo-300">{key}:</span> {value}
      </div>
    ));
  };

  const handleRentDevice = async (deviceId) => {
    try {
      setRentLoading(true);
      
      // Create a rental session
      const response = await axios.post(`${API_BASE}/api/session`, {
        deviceId,
        language: 'python' // Default language
      });
      
      // Navigate to the renter dashboard with new session
      navigate('/dashboard/renter', { 
        state: { 
          newSession: true,
          sessionId: response.data.sessionId
        }
      });
      
    } catch (error) {
      console.error('Error renting device:', error);
      alert(error.response?.data?.message || 'Failed to rent device');
      setRentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeviceChatbot/>
      {/* <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-violet-600/20 blur-3xl -top-20 -left-20"></div>
        <div className="absolute w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl -bottom-20 -right-20"></div>
      </div> */}
      {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 py-6 mt-16">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      <span className="text-indigo-500">Compute</span> Zone
                    </h1>
                    {/* <p className="text-gray-400 mt-2">Find computing devices with optimal latency</p> */}
                  </div>
                  <button
                    onClick={() => navigate("/map")}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition"
                  >
                    <MapPin className="text-lg" />
                    Map View
                  </button>
                </div>
              </div>
            </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filter Bar */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
            <div className="relative w-full md:w-1/3">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search devices..."
                className="w-full bg-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            
            <div className="flex flex-wrap gap-3 flex-1 justify-end">
              <select
                name="deviceType"
                value={filters.deviceType}
                onChange={handleFilterChange}
                className="bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Device Types</option>
                <option value="CPU">CPU</option>
                <option value="GPU">GPU</option>
                <option value="RAM">RAM</option>
                <option value="Storage">Storage</option>
                <option value="Full System">Full System</option>
              </select>
              
              <select
                name="taskType"
                value={filters.taskType}
                onChange={handleFilterChange}
                className="bg-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Task Types</option>
                {commonTaskTypes.map(task => (
                  <option key={task} value={task}>{task}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Price Range:</span>
              <input
                type="number"
                name="minPrice"
                placeholder="Min"
                className="w-24 bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.minPrice}
                onChange={handleFilterChange}
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                name="maxPrice"
                placeholder="Max"
                className="w-24 bg-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.maxPrice}
                onChange={handleFilterChange}
              />
            </div>
            
            <button
              onClick={resetFilters}
              className="ml-auto bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-400">
            Showing <span className="text-white font-medium">{filteredDevices.length}</span> devices
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <FiFilter className="text-indigo-400" />
            <span>Filtered by: {filters.deviceType || "All types"}</span>
          </div>
        </div>

        {/* Device Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-medium text-white mb-2">No devices found</h3>
            <p className="text-gray-400">Try adjusting your filters to see more results</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map(device => (
              <div key={device._id} className="bg-gray-800 rounded-lg overflow-hidden hover:shadow-lg hover:shadow-indigo-900/20 transition border border-gray-700 hover:border-indigo-500">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    {getDeviceIcon(device.deviceType)}
                    <span className="bg-indigo-900/50 text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded">
                      {device.deviceType}
                    </span>
                    {device.isAvailable ? (
                      <span className="bg-green-900/50 text-green-300 text-xs font-medium px-2.5 py-0.5 rounded ml-auto">
                        Available
                      </span>
                    ) : (
                      <span className="bg-red-900/50 text-red-300 text-xs font-medium px-2.5 py-0.5 rounded ml-auto">
                        Unavailable
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2">{device.deviceName}</h3>
                  
                  <div className="mb-4 text-sm">
                    {formatSpecs(device.specs)}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <div>
                      <span className="text-gray-500">Location:</span> {device.location}
                    </div>
                    <div>
                      <span className="text-gray-500">Performance:</span> {device.performance}/100
                    </div>
                  </div>
                  
                  {device.acceptedTaskTypes && device.acceptedTaskTypes.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {device.acceptedTaskTypes.slice(0, 3).map(task => (
                          <span key={task} className="bg-violet-900/30 text-violet-300 text-xs px-2 py-1 rounded">
                            {task}
                          </span>
                        ))}
                        {device.acceptedTaskTypes.length > 3 && (
                          <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded">
                            +{device.acceptedTaskTypes.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t border-gray-700 pt-4 mt-2 flex items-center justify-between">
                    <div className="text-xl font-bold text-white">
                      ${device.price.toFixed(2)}
                      <span className="text-sm font-normal text-gray-400">/hour</span>
                    </div>
                    <button 
                      onClick={() => handleRentDevice(device._id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition"
                      disabled={!device.isAvailable || rentLoading}
                    >
                      {rentLoading ? 'Processing...' : 'Rent Now'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination - simplified version */}
        {filteredDevices.length > 0 && (
          <div className="flex justify-center mt-10">
            <nav className="flex items-center gap-1">
              <button className="px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700">
                Previous
              </button>
              <button className="px-3 py-1 rounded bg-indigo-600 text-white">1</button>
              <button className="px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700">2</button>
              <button className="px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700">3</button>
              <button className="px-3 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700">
                Next
              </button>
            </nav>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Compute Marketplace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DeviceMarketplace;