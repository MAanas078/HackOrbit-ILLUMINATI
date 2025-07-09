import si from 'systeminformation';

/**
 * Detects hardware specifications based on device type
 * @param {string} deviceType Type of device (CPU, GPU, RAM, Storage, Full System)
 * @returns {Promise<Map>} Map of specs for the device
 */
export const detectHardwareSpecs = async (deviceType) => {
  const specs = new Map();
  
  try {
    switch (deviceType) {
      case 'CPU':
        const cpuData = await si.cpu();
        specs.set('manufacturer', cpuData.manufacturer || 'Unknown');
        specs.set('brand', cpuData.brand || 'Unknown');
        specs.set('model', cpuData.model || 'Unknown');
        specs.set('cores', (cpuData.cores || 0).toString());
        specs.set('physicalCores', (cpuData.physicalCores || 0).toString());
        specs.set('speed', `${cpuData.speed || 0} GHz`);
        break;
        
      case 'GPU':
        const gpuData = await si.graphics();
        if (gpuData.controllers && gpuData.controllers.length > 0) {
          const primaryGpu = gpuData.controllers[0];
          specs.set('manufacturer', primaryGpu.vendor || 'Unknown');
          specs.set('model', primaryGpu.model || 'Unknown');
          specs.set('vram', `${primaryGpu.vram || 0} MB`);
          if (primaryGpu.memoryTotal) {
            specs.set('memoryTotal', `${Math.round((primaryGpu.memoryTotal || 0) / (1024 * 1024))} MB`);
          }
        } else {
          specs.set('manufacturer', 'Unknown');
          specs.set('model', 'Unknown GPU');
          specs.set('vram', '0 MB');
        }
        break;
        
      case 'RAM':
        const memData = await si.mem();
        specs.set('total', `${Math.round((memData.total || 0) / (1024 * 1024 * 1024))} GB`);
        
        const memLayout = await si.memLayout();
        if (memLayout && memLayout.length > 0) {
          specs.set('type', memLayout[0].type || 'Unknown');
          specs.set('clockSpeed', `${memLayout[0].clockSpeed || 0} MHz`);
          
          // Count number of modules and their sizes
          let modules = [];
          memLayout.forEach(module => {
            modules.push(`${Math.round((module.size || 0) / (1024 * 1024 * 1024))} GB`);
          });
          specs.set('modules', modules.join(', ') || 'Unknown');
        } else {
          specs.set('type', 'Unknown');
          specs.set('clockSpeed', '0 MHz');
          specs.set('modules', 'Unknown');
        }
        break;
        
      case 'Storage':
        const diskLayout = await si.diskLayout();
        if (diskLayout && diskLayout.length > 0) {
          const primaryDisk = diskLayout[0];
          specs.set('type', primaryDisk.type || 'Unknown'); // HDD, SSD, etc.
          specs.set('interface', primaryDisk.interfaceType || 'Unknown'); // SATA, NVMe, etc.
          specs.set('size', `${Math.round((primaryDisk.size || 0) / (1024 * 1024 * 1024))} GB`);
          specs.set('vendor', primaryDisk.vendor || 'Unknown');
          specs.set('model', primaryDisk.name || 'Unknown');
        } else {
          specs.set('type', 'Unknown');
          specs.set('interface', 'Unknown');
          specs.set('size', '0 GB');
          specs.set('vendor', 'Unknown');
          specs.set('model', 'Unknown');
        }
        break;
        
      case 'Full System':
        // CPU
        const cpu = await si.cpu();
        specs.set('cpu_brand', cpu.brand || 'Unknown');
        specs.set('cpu_cores', (cpu.cores || 0).toString());
        specs.set('cpu_speed', `${cpu.speed || 0} GHz`);
        
        // GPU
        const gpu = await si.graphics();
        if (gpu.controllers && gpu.controllers.length > 0) {
          specs.set('gpu_model', gpu.controllers[0].model || 'Unknown');
          specs.set('gpu_vram', `${gpu.controllers[0].vram || 0} MB`);
        } else {
          specs.set('gpu_model', 'Unknown');
          specs.set('gpu_vram', '0 MB');
        }
        
        // RAM
        const mem = await si.mem();
        specs.set('ram_total', `${Math.round((mem.total || 0) / (1024 * 1024 * 1024))} GB`);
        
        // Storage
        const disks = await si.diskLayout();
        if (disks && disks.length > 0) {
          let totalStorage = 0;
          disks.forEach(disk => {
            totalStorage += disk.size || 0;
          });
          specs.set('storage_total', `${Math.round(totalStorage / (1024 * 1024 * 1024))} GB`);
        } else {
          specs.set('storage_total', '0 GB');
        }
        
        // OS
        const os = await si.osInfo();
        specs.set('os', `${os.platform || 'Unknown'} ${os.release || ''}`);
        break;
        
      default:
        throw new Error(`Unsupported device type: ${deviceType}`);
    }
    
    return specs;
  } catch (error) {
    console.error('Error detecting hardware specs:', error);
    throw new Error(`Failed to detect hardware specifications: ${error.message}`);
  }
};

/**
 * Calculates a normalized performance score based on hardware specs
 * @param {string} deviceType Type of device
 * @param {Map} specs Hardware specifications
 * @returns {number} Normalized performance score (0-100)
 */
export const calculatePerformanceScore = (deviceType, specs) => {
  try {
    let score = 0;
    
    switch (deviceType) {
      case 'CPU':
        // Simple CPU scoring based on cores and speed
        const cores = parseInt(specs.get('cores') || 0);
        const speed = parseFloat(specs.get('speed')?.replace(' GHz', '') || 0);
        
        // Basic formula: score based on cores and speed
        score = (cores * 5) + (speed * 10);
        break;
        
      case 'GPU':
        // More complex scoring would be implemented here
        // This is a simplified placeholder
        const vramStr = specs.get('vram') || '0 MB';
        const vram = parseInt(vramStr.replace(' MB', '') || 0) / 1024; // Convert to GB
        
        // Base score on VRAM
        score = vram * 10;
        
        // Adjust based on model
        const model = specs.get('model') || '';
        if (model.includes('RTX')) {
          score += 20;
        } else if (model.includes('GTX')) {
          score += 10;
        }
        break;
        
      case 'RAM':
        // Simple RAM scoring based on total capacity and speed
        const totalRamStr = specs.get('total') || '0 GB';
        const totalRam = parseInt(totalRamStr.replace(' GB', '') || 0);
        const clockSpeedStr = specs.get('clockSpeed') || '0 MHz';
        const clockSpeed = parseInt(clockSpeedStr.replace(' MHz', '') || 0);
        
        score = (totalRam * 5) + (clockSpeed / 100);
        break;
        
      case 'Storage':
        // Simple storage scoring
        const sizeStr = specs.get('size') || '0 GB';
        const size = parseInt(sizeStr.replace(' GB', '') || 0);
        const type = specs.get('type') || '';
        
        // Base score on size
        score = size / 10;
        
        // Adjust based on type
        if (type.includes('SSD') || type.includes('NVMe')) {
          score *= 1.5;
        }
        break;
        
      case 'Full System':
        // Combined scoring for full system
        const cpuCores = parseInt(specs.get('cpu_cores') || 0);
        const gpuVramStr = specs.get('gpu_vram') || '0 MB';
        const gpuVram = parseInt(gpuVramStr.replace(' MB', '') || 0) / 1024;
        const ramTotalStr = specs.get('ram_total') || '0 GB';
        const ramTotal = parseInt(ramTotalStr.replace(' GB', '') || 0);
        
        // Weighted average of components
        score = (cpuCores * 3) + (gpuVram * 8) + (ramTotal * 2);
        break;
        
      default:
        score = 50; // Default middle score
    }
    
    // Cap at 100
    return Math.min(Math.max(score, 0), 100);
  } catch (error) {
    console.error('Error calculating performance score:', error);
    return 50; // Default middle score on error
  }
};

/**
 * Convert a Map to a plain object for storage in MongoDB
 * @param {Map} map The Map to convert
 * @returns {Object} Plain object
 */
export const mapToObject = (map) => {
  if (!(map instanceof Map)) {
    return map; // Return as is if not a Map
  }
  
  const obj = {};
  for (const [key, value] of map.entries()) {
    obj[key] = value;
  }
  return obj;
};

/**
 * Convert a plain object to a Map
 * @param {Object} obj The object to convert
 * @returns {Map} Map instance
 */
export const objectToMap = (obj) => {
  if (obj instanceof Map) {
    return obj; // Return as is if already a Map
  }
  
  if (!obj || typeof obj !== 'object') {
    return new Map();
  }
  
  return new Map(Object.entries(obj));
};