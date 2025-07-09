const si = require('systeminformation');

class ResourceMonitor {
    constructor() {
        this.updateInterval = 5000; // 5 seconds
        this.resourceData = {};
    }

    // Get comprehensive system information
    async getSystemInfo() {
        try {
            const data = await si.get({
                cpu: 'manufacturer, brand, speed, cores, physicalCores, processors',
                mem: 'total, free, used, active, available',
                graphics: 'controllers, displays',
                osInfo: 'platform, distro, release, arch',
                system: 'manufacturer, model, version',
                diskLayout: 'size, type, name, vendor',
                networkInterfaces: 'iface, ip4, type, speed'
            });
            
            return data;
        } catch (error) {
            console.error('Error getting system info:', error);
            return null;
        }
    }

    // Real-time CPU monitoring
    async getCPUMetrics() {
        try {
            const [cpuLoad, cpuTemp, cpuCurrentSpeed] = await Promise.all([
                si.currentLoad(),
                si.cpuTemperature(),
                si.cpuCurrentSpeed()
            ]);

            return {
                usage: cpuLoad.currentLoad.toFixed(2),
                cores: cpuLoad.cpus.map(core => ({
                    load: core.load.toFixed(2),
                    loadUser: core.loadUser.toFixed(2),
                    loadSystem: core.loadSystem.toFixed(2)
                })),
                temperature: cpuTemp.main || 'N/A',
                frequency: cpuCurrentSpeed.avg || 'N/A'
            };
        } catch (error) {
            console.error('Error getting CPU metrics:', error);
            return null;
        }
    }

    // Memory monitoring
    async getMemoryMetrics() {
        try {
            const mem = await si.mem();
            
            return {
                total: (mem.total / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                used: (mem.used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                free: (mem.free / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                usagePercent: ((mem.used / mem.total) * 100).toFixed(2),
                available: (mem.available / 1024 / 1024 / 1024).toFixed(2) + ' GB'
            };
        } catch (error) {
            console.error('Error getting memory metrics:', error);
            return null;
        }
    }

    // GPU monitoring (basic info)
    async getGPUInfo() {
        try {
            const graphics = await si.graphics();
            
            return {
                controllers: graphics.controllers.map(gpu => ({
                    model: gpu.model,
                    vendor: gpu.vendor,
                    vram: gpu.vram ? (gpu.vram / 1024).toFixed(2) + ' GB' : 'N/A',
                    bus: gpu.bus,
                    vramDynamic: gpu.vramDynamic
                })),
                displays: graphics.displays.length
            };
        } catch (error) {
            console.error('Error getting GPU info:', error);
            return null;
        }
    }

    // Disk monitoring
    async getDiskMetrics() {
        try {
            const [diskLayout, fsSize, diskIO] = await Promise.all([
                si.diskLayout(),
                si.fsSize(),
                si.disksIO()
            ]);

            return {
                layout: diskLayout.map(disk => ({
                    name: disk.name,
                    size: (disk.size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    type: disk.type,
                    vendor: disk.vendor
                })),
                usage: fsSize.map(fs => ({
                    fs: fs.fs,
                    size: (fs.size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    used: (fs.used / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    available: (fs.available / 1024 / 1024 / 1024).toFixed(2) + ' GB',
                    usePercent: fs.use.toFixed(2)
                })),
                io: {
                    readSpeed: diskIO.rIO_sec || 0,
                    writeSpeed: diskIO.wIO_sec || 0
                }
            };
        } catch (error) {
            console.error('Error getting disk metrics:', error);
            return null;
        }
    }

    // Network monitoring
    async getNetworkMetrics() {
        try {
            const [interfaces, stats] = await Promise.all([
                si.networkInterfaces(),
                si.networkStats()
            ]);

            return {
                interfaces: interfaces.map(iface => ({
                    name: iface.iface,
                    ip4: iface.ip4,
                    type: iface.type,
                    state: iface.operstate,
                    speed: iface.speed
                })),
                stats: stats.map(stat => ({
                    interface: stat.iface,
                    bytesReceived: stat.rx_bytes,
                    bytesSent: stat.tx_bytes,
                    packetsReceived: stat.rx_packets,
                    packetsSent: stat.tx_packets
                }))
            };
        } catch (error) {
            console.error('Error getting network metrics:', error);
            return null;
        }
    }

    // Start continuous monitoring
    startMonitoring() {
        setInterval(async () => {
            const metrics = {
                timestamp: new Date().toISOString(),
                cpu: await this.getCPUMetrics(),
                memory: await this.getMemoryMetrics(),
                disk: await this.getDiskMetrics(),
                network: await this.getNetworkMetrics()
            };

            this.resourceData = metrics;
            
            // Emit or store metrics
            console.log('Resource Update:', JSON.stringify(metrics, null, 2));
        }, this.updateInterval);
    }
}

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class NVIDIAMonitor {
    constructor() {
        this.isNVIDIAAvailable = false;
        this.checkNVIDIASupport();
    }

    // Check if nvidia-smi is available
    async checkNVIDIASupport() {
        try {
            await execAsync('nvidia-smi --version');
            this.isNVIDIAAvailable = true;
            console.log('NVIDIA GPU detected and nvidia-smi available');
        } catch (error) {
            console.log('NVIDIA GPU not available or nvidia-smi not found');
            this.isNVIDIAAvailable = false;
        }
    }

    // Get detailed GPU information
    async getGPUInfo() {
        if (!this.isNVIDIAAvailable) {
            return { error: 'NVIDIA GPU not available' };
        }

        try {
            const command = `nvidia-smi --query-gpu=index,name,driver_version,memory.total,memory.used,memory.free,utilization.gpu,utilization.memory,temperature.gpu,power.draw,power.limit,clocks.current.graphics,clocks.current.memory --format=csv,noheader,nounits`;
            
            const { stdout } = await execAsync(command);
            const lines = stdout.trim().split('\n');
            
            const gpus = lines.map(line => {
                const values = line.split(', ');
                return {
                    index: parseInt(values[0]),
                    name: values[1],
                    driverVersion: values[2],
                    memory: {
                        total: parseInt(values[3]),
                        used: parseInt(values[4]),
                        free: parseInt(values[5]),
                        usagePercent: ((parseInt(values[4]) / parseInt(values[3])) * 100).toFixed(2)
                    },
                    utilization: {
                        gpu: parseInt(values[6]),
                        memory: parseInt(values[7])
                    },
                    temperature: parseInt(values[8]),
                    power: {
                        draw: parseFloat(values[9]) || 0,
                        limit: parseFloat(values[10]) || 0
                    },
                    clocks: {
                        graphics: parseInt(values[11]) || 0,
                        memory: parseInt(values[12]) || 0
                    }
                };
            });

            return { gpus, count: gpus.length };
        } catch (error) {
            console.error('Error getting GPU info:', error);
            return { error: error.message };
        }
    }

    // Get running processes on GPU
    async getGPUProcesses() {
        if (!this.isNVIDIAAvailable) {
            return { error: 'NVIDIA GPU not available' };
        }

        try {
            const command = `nvidia-smi --query-compute-apps=pid,process_name,gpu_uuid,used_memory --format=csv,noheader,nounits`;
            const { stdout } = await execAsync(command);
            
            if (!stdout.trim()) {
                return { processes: [], count: 0 };
            }

            const lines = stdout.trim().split('\n');
            const processes = lines.map(line => {
                const values = line.split(', ');
                return {
                    pid: parseInt(values[0]),
                    name: values[1],
                    gpuUuid: values[2],
                    memoryUsed: parseInt(values[3])
                };
            });

            return { processes, count: processes.length };
        } catch (error) {
            console.error('Error getting GPU processes:', error);
            return { error: error.message };
        }
    }

    // Monitor GPU in real-time
    async startGPUMonitoring(interval = 5000) {
        if (!this.isNVIDIAAvailable) {
            console.log('Cannot start GPU monitoring: NVIDIA not available');
            return;
        }

        setInterval(async () => {
            const [gpuInfo, processes] = await Promise.all([
                this.getGPUInfo(),
                this.getGPUProcesses()
            ]);

            const monitoring = {
                timestamp: new Date().toISOString(),
                gpus: gpuInfo,
                processes: processes
            };

            console.log('GPU Monitoring Update:', JSON.stringify(monitoring, null, 2));
            
            // Here you can emit to Redis, WebSocket, etc.
        }, interval);
    }

    // Set GPU power limit (requires admin privileges)
    async setGPUPowerLimit(gpuIndex, powerLimit) {
        if (!this.isNVIDIAAvailable) {
            return { error: 'NVIDIA GPU not available' };
        }

        try {
            const command = `nvidia-smi -i ${gpuIndex} -pl ${powerLimit}`;
            const { stdout } = await execAsync(command);
            return { success: true, output: stdout };
        } catch (error) {
            return { error: error.message };
        }
    }
}