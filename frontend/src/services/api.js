import axios from 'axios';

// Configure API base URL based on environment
const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`;

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors here
    if (error.response) {
      if (error.response.status === 401) {
        // Handle unauthorized access
        console.error('Unauthorized access');
      }
    }
    return Promise.reject(error);
  }
);

// GitHub repository API
export const fetchRepositoryData = async (repoUrl, githubToken) => {
  try {
    const response = await api.post('/api/github/clone', {
      repository_url: repoUrl,
      session_id: localStorage.getItem('session_id') || 'default_session',
      ...(githubToken && { github_token: githubToken }),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching repository data:', error);
    throw error;
  }
};

// Chat with the repository
export const chatWithRepository = async (message, sessionId) => {
  try {
    const response = await api.post('/chat', {
      message,
      session_id: sessionId || localStorage.getItem('session_id') || 'default_session',
      stream: false,
    });
    return response.data;
  } catch (error) {
    console.error('Error chatting with repository:', error);
    throw error;
  }
};

// Get file content
export const getFileContent = async (filePath, sessionId) => {
  try {
    // Use the Tools.read_file function through the chat endpoint
    const response = await api.post('/chat', {
      message: `Read file: ${filePath}`,
      session_id: sessionId || localStorage.getItem('session_id') || 'default_session',
      context: {
        tool_use: {
          name: 'read_file',
          args: { file_path: filePath }
        }
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting file content:', error);
    throw error;
  }
};

// Summarize code with AI
export const summarizeCode = async (content, filename, geminiApiKey) => {
  try {
    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
    const fullUrl = `${apiUrl}?key=${geminiApiKey}`;
    
    // Truncate content if too large
    const truncatedContent = content.length > 10000 ? 
      content.substring(0, 10000) + "... [content truncated]" : content;
    
    const fileExtension = filename.split(".").pop().toLowerCase();
    
    const prompt = `
      You are a code analyst assistant. Please provide a concise summary of the following ${fileExtension} file: 
      
      Filename: ${filename}
      Content:
      
      ${truncatedContent}
      
      Please include:
      1. The main purpose of this file
      2. Key functions or components 
      3. Important dependencies
      4. Any notable patterns or techniques used
      Keep the summary to 3-5 sentences total.
    `;
    
    const response = await axios.post(fullUrl, {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    });
    
    return {
      summary: response.data.candidates[0]?.content?.parts[0]?.text || "No summary generated."
    };
  } catch (error) {
    console.error('Error summarizing with Gemini API:', error);
    return {
      summary: `Failed to generate summary: ${error.message}`,
      error: true,
    };
  }
};

// Search code semantically
export const searchCode = async (query, sessionId, maxResults = 10) => {
  try {
    const response = await api.post('/search_code', {
      query,
      session_id: sessionId || localStorage.getItem('session_id') || 'default_session',
      max_results: maxResults
    });
    return response.data;
  } catch (error) {
    console.error('Error searching code:', error);
    throw error;
  }
};

// Initialize workspace indexing
export const indexWorkspace = async (sessionId, filePaths = null) => {
  try {
    const response = await api.post('/chat', {
      message: 'Index the repository files for semantic search',
      session_id: sessionId || localStorage.getItem('session_id') || 'default_session',
      context: {
        tool_use: {
          name: 'index_workspace_files',
          args: { 
            session_id: sessionId || localStorage.getItem('session_id') || 'default_session',
            file_paths: filePaths
          }
        }
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error indexing workspace:', error);
    throw error;
  }
};

export default api; 