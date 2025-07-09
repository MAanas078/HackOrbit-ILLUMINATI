// lender-agent.js
// This script runs on the lender's device to execute code remotely

import Docker from 'dockerode';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LenderExecutionAgent {
  constructor(config) {
    this.serverUrl = config.serverUrl || 'http://localhost:5000';
    this.authToken = config.authToken; // Lender's auth token
    this.deviceId = config.deviceId; // Device ID this agent manages
    this.docker = new Docker();
    this.pollInterval = config.pollInterval || 5000; // 5 seconds
    this.isRunning = false;
  }

  // Start the agent
  start() {
    console.log('🚀 Lender Execution Agent started');
    console.log(`📡 Server: ${this.serverUrl}`);
    console.log(`💻 Device ID: ${this.deviceId}`);
    
    this.isRunning = true;
    this.pollForSessions();
  }

  // Stop the agent
  stop() {
    console.log('🛑 Stopping Lender Execution Agent');
    this.isRunning = false;
  }

  // Poll for active sessions that need code execution
  async pollForSessions() {
    while (this.isRunning) {
      try {
        await this.checkForPendingExecutions();
        await this.sleep(this.pollInterval);
      } catch (error) {
        console.error('❌ Error in polling cycle:', error.message);
        await this.sleep(this.pollInterval);
      }
    }
  }

  // Check for sessions that have pending code execution
  async checkForPendingExecutions() {
    try {
      const response = await axios.get(
        `${this.serverUrl}/api/session/owner`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        }
      );

      const sessions = response.data.sessions;
      const activeSessions = sessions.filter(
        session => session.status === 'active' && 
        session.device._id === this.deviceId
      );

      for (const session of activeSessions) {
        await this.processSession(session._id);
      }
    } catch (error) {
      console.error('❌ Error checking for sessions:', error.message);
    }
  }

  // Process a specific session
  async processSession(sessionId) {
    try {
      // Get code for execution
      const codeResponse = await axios.get(
        `${this.serverUrl}/api/session/${sessionId}/code`,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'executionToken': await this.getExecutionToken(sessionId)
          }
        }
      );

      if (codeResponse.data.success && codeResponse.data.code) {
        console.log(`📋 Executing code for session ${sessionId}`);
        await this.executeCode(sessionId, codeResponse.data.code, codeResponse.data.language);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No code to execute yet
        return;
      }
      console.error(`❌ Error processing session ${sessionId}:`, error.message);
    }
  }

  // Execute code in Docker container
  async executeCode(sessionId, code, language = 'python') {
    const startTime = Date.now();
    let output = '';
    let error = '';
    let resourceUsage = {};

    try {
      // Create session directory
      const sessionDir = path.join(__dirname, 'executions', sessionId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // Write code to file
      const codeFile = language === 'python' ? 'main.py' : 'main.js';
      const codePath = path.join(sessionDir, codeFile);
      fs.writeFileSync(codePath, code);

      // Create Dockerfile
      const dockerfile = this.createDockerfile(language);
      const dockerfilePath = path.join(sessionDir, 'Dockerfile');
      fs.writeFileSync(dockerfilePath, dockerfile);

      // Build Docker image
      console.log(`🔨 Building Docker image for session ${sessionId}`);
      const buildStream = await this.docker.buildImage({
        context: sessionDir,
        src: ['Dockerfile', codeFile]
      }, { t: `session-${sessionId}` });

      await new Promise((resolve, reject) => {
        this.docker.modem.followProgress(buildStream, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });

      // Run container
      console.log(`🏃 Running code for session ${sessionId}`);
      const container = await this.docker.createContainer({
        Image: `session-${sessionId}`,
        Tty: false,
        AttachStdout: true,
        AttachStderr: true,
        HostConfig: {
          Memory: 512 * 1024 * 1024, // 512MB limit
          CpuShares: 512, // 50% CPU limit
          NetworkMode: 'none' // No network access for security
        }
      });

      await container.start();

      // Get output
      const stream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true
      });

      output = await new Promise((resolve) => {
        let result = '';
        stream.on('data', (chunk) => {
          result += chunk.toString().replace(/^\x00\x00\x00\x00\x00\x00\x00\x08/, '');
        });
        stream.on('end', () => resolve(result));
      });

      // Wait for container to finish
      await container.wait();

      // Get resource usage stats
      const stats = await container.stats({ stream: false });
      resourceUsage = {
        cpuPercent: this.calculateCpuPercent(stats),
        memoryUsage: stats.memory_stats.usage || 0,
        gpuUtilization: 0 // GPU stats would need special handling
      };

      // Clean up container and image
      await container.remove();
      await this.docker.getImage(`session-${sessionId}`).remove();

      // Clean up files
      fs.rmSync(sessionDir, { recursive: true, force: true });

    } catch (execError) {
      error = execError.message;
      console.error(`❌ Execution error for session ${sessionId}:`, error);
    }

    const executionTime = Date.now() - startTime;

    // Submit results back to server
    await this.submitExecutionResult(sessionId, {
      output: output.trim(),
      error: error,
      resourceUsage: resourceUsage,
      executionTime: executionTime
    });

    console.log(`✅ Completed execution for session ${sessionId} in ${executionTime}ms`);
  }

  // Create Dockerfile based on language
  createDockerfile(language) {
    switch (language) {
      case 'python':
        return `FROM python:3.9-slim
WORKDIR /app
COPY main.py .
RUN pip install numpy pandas matplotlib scikit-learn requests
CMD ["python", "main.py"]`;
      
      case 'javascript':
      case 'node':
        return `FROM node:16-slim
WORKDIR /app
COPY main.js .
RUN npm install lodash axios
CMD ["node", "main.js"]`;
      
      default:
        return `FROM python:3.9-slim
WORKDIR /app
COPY main.py .
CMD ["python", "main.py"]`;
    }
  }

  // Calculate CPU percentage from Docker stats
  calculateCpuPercent(stats) {
    if (!stats.cpu_stats || !stats.precpu_stats) return 0;
    
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
    }
    return 0;
  }

  // Submit execution results to server
  async submitExecutionResult(sessionId, results) {
    try {
      await axios.post(
        `${this.serverUrl}/api/session/${sessionId}/result`,
        results,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'executionToken': await this.getExecutionToken(sessionId)
          }
        }
      );
    } catch (error) {
      console.error(`❌ Error submitting results for session ${sessionId}:`, error.message);
    }
  }

  // Get execution token for a session (you'll need to implement this based on your auth system)
  async getExecutionToken(sessionId) {
    // This should retrieve the execution token for the session
    // For now, returning a placeholder - you'll need to implement this
    return 'execution-token-placeholder';
  }

  // Sleep utility
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  // Get configuration from environment variables or command line
  const config = {
    serverUrl: process.env.SERVER_URL || 'http://localhost:5000',
    authToken: process.env.AUTH_TOKEN || 'your-auth-token-here',
    deviceId: process.env.DEVICE_ID || 'your-device-id-here',
    pollInterval: parseInt(process.env.POLL_INTERVAL) || 5000
  };

  const agent = new LenderExecutionAgent(config);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    agent.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    agent.stop();
    process.exit(0);
  });

  agent.start();
}

export default LenderExecutionAgent;