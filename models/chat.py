import groq
from fastapi.responses import StreamingResponse
from fastapi import FastAPI, Body, HTTPException, Request, UploadFile, File, Form, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union, Literal
from rich.console import Console
from rich.markdown import Markdown
import os
import glob
import sys
import subprocess
import shlex
import shutil
import uuid
import asyncio
import json
import logging
import tiktoken
import time
import re
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Set up console for better formatting
console = Console()
app = FastAPI(title="AI Code Assistant")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    model: Optional[str] = "best_available"
    stream: Optional[bool] = False
    
class ChatResponse(BaseModel):
    response: str
    tool_calls: List[Dict[str, Any]] = []
    session_id: str
    context: Dict[str, Any] = {}
    model_used: str = ""
    
class WorkspaceInfo(BaseModel):
    current_directory: str
    available_files: List[Dict[str, Any]]
    directories: List[Dict[str, Any]]
    
class UploadResponse(BaseModel):
    success: bool
    message: str
    file_path: Optional[str] = None
    size: Optional[int] = None
    session_id: Optional[str] = None

class CodeGenerationRequest(BaseModel):
    description: str
    language: str
    framework: Optional[str] = None
    session_id: Optional[str] = None
    specifications: Optional[Dict[str, Any]] = None

class CodeEditRequest(BaseModel):
    file_path: str
    instructions: str
    session_id: str
    model: Optional[str] = "best_available"

class ProjectGenerationRequest(BaseModel):
    project_name: str
    description: str
    technologies: List[str]
    features: List[str]
    session_id: Optional[str] = None

class SearchCodeRequest(BaseModel):
    query: str
    session_id: str
    file_patterns: Optional[List[str]] = None
    max_results: Optional[int] = 10

class ExecuteCommandRequest(BaseModel):
    command: str
    session_id: str
    working_dir: Optional[str] = None
    timeout: Optional[int] = 30

class GitHubCloneRequest(BaseModel):
    repository_url: str
    session_id: str
    directory_name: Optional[str] = None
    branch: Optional[str] = None

class ModelConfig(BaseModel):
    name: str
    provider: str
    capabilities: List[str]
    description: str
    default_for: Optional[List[str]] = None
    max_tokens: int = 4096

# Global storage for session data
sessions = {}

# Available models configuration
MODELS = [
    ModelConfig(
        name="llama3-70b-8192",
        provider="groq",
        capabilities=["code_generation", "tool_use", "fast_response"],
        description="Fast model with good code capabilities",
        default_for=["quick_tasks", "default"],
        max_tokens=8192
    )
]

# Set up workspace directory
WORKSPACE_ROOT = os.path.join(os.getcwd(), "workspace")
os.makedirs(WORKSPACE_ROOT, exist_ok=True)

# Vector DB persistence directory
VECTOR_DB_DIR = os.path.join(os.getcwd(), "vectordb")
os.makedirs(VECTOR_DB_DIR, exist_ok=True)

# Cache for embedding models
embedding_models = {}

# Session management
def get_or_create_session(session_id: Optional[str] = None):
    """Get existing session or create a new one"""
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if session_id not in sessions:
        # Create a session-specific workspace folder
        session_workspace = os.path.join(WORKSPACE_ROOT, session_id)
        os.makedirs(session_workspace, exist_ok=True)
        
        # Create vector DB directory for this session
        session_vector_db = os.path.join(VECTOR_DB_DIR, session_id)
        os.makedirs(session_vector_db, exist_ok=True)
        
        sessions[session_id] = {
            "messages": [],
            "context": {
                "current_directory": session_workspace,
                "workspace_root": session_workspace,
                "vector_db_path": session_vector_db,
                "indexed_files": [],
                "env_variables": {},
                "created_at": datetime.now().isoformat(),
                "last_activity": datetime.now().isoformat()
            },
            "tools_history": [],
            "project_structure": {},
            "vector_store": None
        }
    
    # Update last activity timestamp
    sessions[session_id]["context"]["last_activity"] = datetime.now().isoformat()
    
    # Ensure all required keys exist in the session
    if "messages" not in sessions[session_id]:
        sessions[session_id]["messages"] = []
    if "tools_history" not in sessions[session_id]:
        sessions[session_id]["tools_history"] = []
    
    return session_id, sessions[session_id]

# File utilities
def get_file_info(file_path):
    """Get detailed information about a file"""
    stats = os.stat(file_path)
    return {
        "path": file_path,
        "name": os.path.basename(file_path),
        "size": stats.st_size,
        "created": datetime.fromtimestamp(stats.st_ctime).isoformat(),
        "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
        "is_binary": is_binary_file(file_path),
        "extension": os.path.splitext(file_path)[1].lower(),
    }

def is_binary_file(file_path):
    """Check if a file is binary"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            f.read(1024)
        return False
    except UnicodeDecodeError:
        return True

def get_file_language(file_path):
    """Determine the programming language of a file based on extension"""
    ext = os.path.splitext(file_path)[1].lower()
    language_map = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.jsx': 'javascript',
        '.tsx': 'typescript',
        '.html': 'html',
        '.css': 'css',
        '.java': 'java',
        '.c': 'c',
        '.cpp': 'cpp',
        '.cs': 'csharp',
        '.go': 'go',
        '.rs': 'rust',
        '.rb': 'ruby',
        '.php': 'php',
        '.swift': 'swift',
        '.kt': 'kotlin',
        '.scala': 'scala',
        '.md': 'markdown',
        '.json': 'json',
        '.yml': 'yaml',
        '.yaml': 'yaml',
        '.sh': 'bash',
        '.sql': 'sql',
    }
    return language_map.get(ext, 'plaintext')

def count_tokens(text, model="gpt-4"):
    """Count the number of tokens in the text"""
    try:
        encoding = tiktoken.encoding_for_model(model)
        return len(encoding.encode(text))
    except:
        # Fallback to approximation
        return len(text) // 4

# Embedding and vector search functionality
def get_embedding_model(model_name="openai"):
    """Get or create an embedding model"""
    if model_name in embedding_models:
        return embedding_models[model_name]
    
    if model_name == "openai":
        model = OpenAIEmbeddings(api_key=os.environ.get("OPENAI_API_KEY"))
    else:
        # Fallback to local Hugging Face model
        model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    embedding_models[model_name] = model
    return model

def index_files(session_id, file_paths=None):
    """Index files for a session for semantic search"""
    _, session = get_or_create_session(session_id)
    workspace_root = session["context"]["workspace_root"]
    
    # If no files specified, index all text files in workspace
    if not file_paths:
        files_to_index = []
        for root, _, files in os.walk(workspace_root):
            for file in files:
                file_path = os.path.join(root, file)
                if not is_binary_file(file_path):
                    files_to_index.append(file_path)
    else:
        files_to_index = [os.path.join(workspace_root, f) if not os.path.isabs(f) else f 
                          for f in file_paths]
    
    # Skip if no files to index
    if not files_to_index:
        return {"success": False, "message": "No files to index"}
    
    try:
        # Create text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""]
        )
        
        # Process each file
        documents = []
        for file_path in files_to_index:
            try:
                if os.path.exists(file_path) and not is_binary_file(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Create metadata
                    metadata = {
                        "source": file_path,
                        "file_name": os.path.basename(file_path),
                        "language": get_file_language(file_path),
                        "rel_path": os.path.relpath(file_path, workspace_root)
                    }
                    
                    # Split text into chunks
                    chunks = text_splitter.split_text(content)
                    for i, chunk in enumerate(chunks):
                        chunk_metadata = metadata.copy()
                        chunk_metadata["chunk_id"] = i
                        documents.append({"page_content": chunk, "metadata": chunk_metadata})
            except Exception as e:
                logger.warning(f"Error processing file {file_path}: {str(e)}")
        
        # Create vector store
        embeddings = get_embedding_model()
        vector_store = Chroma.from_documents(
            documents=[doc for doc in documents],
            embedding=embeddings,
            persist_directory=session["context"]["vector_db_path"]
        )
        
        # Save to session
        session["vector_store"] = vector_store
        session["context"]["indexed_files"] = [os.path.relpath(f, workspace_root) for f in files_to_index]
        session["context"]["last_indexed"] = datetime.now().isoformat()
        
        return {
            "success": True,
            "message": f"Indexed {len(files_to_index)} files with {len(documents)} chunks",
            "files": session["context"]["indexed_files"]
        }
    except Exception as e:
        logger.error(f"Error indexing files: {str(e)}")
        return {"success": False, "error": f"Error indexing files: {str(e)}"}

def search_code(session_id, query, top_k=5):
    """Search for code using vector similarity"""
    _, session = get_or_create_session(session_id)
    
    # Check if vector store exists
    if not session.get("vector_store"):
        # Try to load from disk
        try:
            embeddings = get_embedding_model()
            vector_store = Chroma(
                persist_directory=session["context"]["vector_db_path"],
                embedding_function=embeddings
            )
            session["vector_store"] = vector_store
        except Exception:
            return {"success": False, "error": "No indexed files found. Please index files first."}
    
    try:
        # Perform search
        results = session["vector_store"].similarity_search_with_score(query, k=top_k)
        
        # Format results
        formatted_results = []
        for doc, score in results:
            formatted_results.append({
                "content": doc.page_content,
                "score": float(score),
                "metadata": doc.metadata,
                "file": doc.metadata.get("rel_path", doc.metadata.get("source", "unknown"))
            })
        
        return {
            "success": True,
            "results": formatted_results,
            "query": query
        }
    except Exception as e:
        logger.error(f"Error searching code: {str(e)}")
        return {"success": False, "error": f"Error searching code: {str(e)}"}

# Tool definitions
class Tools:
    @staticmethod
    def read_file(file_path, session_workspace=None):
        """Read content from a file."""
        try:
            # Make sure the path is within the workspace
            abs_path = os.path.abspath(file_path)
            if session_workspace and not abs_path.startswith(session_workspace):
                file_path = os.path.join(session_workspace, file_path)
            
            # Check if file exists
            if not os.path.exists(file_path):
                return {"success": False, "error": f"File not found: {file_path}"}
                
            # Check if file is binary
            if is_binary_file(file_path):
                return {
                    "success": True, 
                    "content": f"[Binary file: {os.path.basename(file_path)}]",
                    "is_binary": True,
                    "size": os.path.getsize(file_path)
                }
                
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            file_info = get_file_info(file_path)
            
            return {
                "success": True, 
                "content": content,
                "language": get_file_language(file_path),
                "file_info": file_info
            }
        except Exception as e:
            return {"success": False, "error": f"Error reading file: {str(e)}"}
            
    @staticmethod
    def write_file(file_path, content, session_workspace=None):
        """Write content to a file."""
        try:
            # Make sure the path is within the workspace
            abs_path = os.path.abspath(file_path)
            if session_workspace and not abs_path.startswith(session_workspace):
                file_path = os.path.join(session_workspace, file_path)
            
            # Ensure the directory exists
            os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(content)
                
            file_info = get_file_info(file_path)
            
            return {
                "success": True, 
                "message": f"Successfully wrote to {file_path}",
                "file_info": file_info
            }
        except Exception as e:
            return {"success": False, "error": f"Error writing to file: {str(e)}"}
    
    @staticmethod
    def list_directory(directory=".", session_workspace=None):
        """List files in the specified directory."""
        try:
            # Make sure the directory is within workspace
            abs_path = os.path.abspath(directory)
            if session_workspace and not abs_path.startswith(session_workspace) and directory != ".":
                directory = os.path.join(session_workspace, directory)
            
            # Check if directory exists
            if not os.path.isdir(directory):
                return {"success": False, "error": f"Directory not found: {directory}"}
            
            # Get all items in directory
            items = os.listdir(directory)
            
            # Separate directories and files with detailed info
            directories = []
            files = []
            
            for item in items:
                item_path = os.path.join(directory, item)
                if os.path.isdir(item_path):
                    directories.append({
                        "name": item,
                        "path": item_path,
                        "modified": datetime.fromtimestamp(os.path.getmtime(item_path)).isoformat()
                    })
                else:
                    file_info = get_file_info(item_path)
                    files.append(file_info)
            
            return {
                "success": True, 
                "directories": directories,
                "files": files,
                "current_path": os.path.abspath(directory),
                "parent_directory": os.path.dirname(os.path.abspath(directory)) if os.path.abspath(directory) != session_workspace else None
            }
        except Exception as e:
            return {"success": False, "error": f"Error listing directory: {str(e)}"}
    
    @staticmethod
    def search_files(pattern, directory=".", session_workspace=None):
        """Search for files matching a pattern."""
        try:
            # Make sure the directory is within workspace
            abs_path = os.path.abspath(directory)
            if session_workspace and not abs_path.startswith(session_workspace) and directory != ".":
                directory = os.path.join(session_workspace, directory)
            
            matches = []
            for root, _, files in os.walk(directory):
                for filename in files:
                    if re.search(pattern, filename):
                        file_path = os.path.join(root, filename)
                        matches.append(get_file_info(file_path))
            
            return {
                "success": True,
                "pattern": pattern,
                "matches": matches,
                "count": len(matches)
            }
        except Exception as e:
            return {"success": False, "error": f"Error searching files: {str(e)}"}
    
    @staticmethod
    def execute_command(command, working_dir=None, session_workspace=None, timeout=30):
        """Execute a shell command in the workspace."""
        try:
            # Set working directory
            if working_dir:
                abs_path = os.path.abspath(working_dir)
                if session_workspace and not abs_path.startswith(session_workspace):
                    working_dir = os.path.join(session_workspace, working_dir)
            else:
                working_dir = session_workspace
            
            # Check if directory exists
            if not os.path.isdir(working_dir):
                return {"success": False, "error": f"Working directory not found: {working_dir}"}
            
            # Execute command
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=working_dir
            )
            
            try:
                stdout, stderr = process.communicate(timeout=timeout)
                return {
                    "success": process.returncode == 0,
                    "exit_code": process.returncode,
                    "stdout": stdout,
                    "stderr": stderr,
                    "command": command,
                    "working_dir": working_dir
                }
            except subprocess.TimeoutExpired:
                process.kill()
                return {
                    "success": False,
                    "error": f"Command timed out after {timeout} seconds",
                    "command": command
                }
        except Exception as e:
            return {"success": False, "error": f"Error executing command: {str(e)}"}
    
    @staticmethod
    def create_project_structure(structure, base_dir, session_workspace=None):
        """Create a project structure from a nested dictionary."""
        try:
            # Make sure base_dir is within workspace
            abs_path = os.path.abspath(base_dir)
            if session_workspace and not abs_path.startswith(session_workspace):
                base_dir = os.path.join(session_workspace, base_dir)
            
            # Create base directory
            os.makedirs(base_dir, exist_ok=True)
            
            # Helper function to create structure recursively
            def create_nested_structure(struct, current_dir):
                created_items = []
                
                for name, content in struct.items():
                    path = os.path.join(current_dir, name)
                    
                    if isinstance(content, dict):
                        # Directory with contents
                        os.makedirs(path, exist_ok=True)
                        nested_items = create_nested_structure(content, path)
                        created_items.append({
                            "type": "directory",
                            "path": path,
                            "name": name,
                            "items": nested_items
                        })
                    else:
                        # File with content
                        with open(path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        created_items.append({
                            "type": "file",
                            "path": path,
                            "name": name,
                            "size": len(content)
                        })
                
                return created_items
            
            # Create the structure
            created_structure = create_nested_structure(structure, base_dir)
            
            return {
                "success": True,
                "base_directory": base_dir,
                "structure": created_structure
            }
        except Exception as e:
            return {"success": False, "error": f"Error creating project structure: {str(e)}"}
    
    @staticmethod
    def search_code_semantic(query, session_id, top_k=5):
        """Search code using semantic meaning through vector embeddings."""
        return search_code(session_id, query, top_k)
    
    @staticmethod
    def index_workspace_files(session_id, file_paths=None):
        """Index files for semantic search."""
        return index_files(session_id, file_paths)
        
    @staticmethod
    def clone_github_repository(repository_url, session_workspace, directory_name=None, branch=None):
        """Clone a GitHub repository into the workspace with timestamp."""
        try:
            # Validate the repository URL
            if not repository_url.startswith(("https://github.com/", "git@github.com:")):
                return {"success": False, "error": "Invalid GitHub repository URL"}
            
            # Create timestamp for directory
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Use provided directory name or extract from URL
            if not directory_name:
                # Extract repo name from URL
                if repository_url.endswith(".git"):
                    repository_url = repository_url[:-4]
                
                if "github.com/" in repository_url:
                    repo_name = repository_url.split("github.com/")[-1].split("/")[-1]
                elif "github.com:" in repository_url:
                    repo_name = repository_url.split("github.com:")[-1].split("/")[-1]
                else:
                    repo_name = "repo"
                
                directory_name = f"{repo_name}_{timestamp}"
            else:
                directory_name = f"{directory_name}_{timestamp}"
            
            # Create target directory path
            target_dir = os.path.join(session_workspace, directory_name)
            
            # Prepare clone command
            clone_cmd = f"git clone {repository_url} {target_dir}"
            if branch:
                clone_cmd += f" --branch {branch}"
                
            # Execute git clone
            process = subprocess.Popen(
                clone_cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            stdout, stderr = process.communicate(timeout=120)  # 2 minute timeout
            
            if process.returncode == 0:
                # Get directory listing after clone
                listing = Tools.list_directory(target_dir, session_workspace)
                
                # Index files in the cloned repository for search
                index_result = index_files(os.path.basename(session_workspace), 
                                           [os.path.join(directory_name, "**/*")])
                
                return {
                    "success": True,
                    "message": f"Successfully cloned repository to {directory_name}",
                    "directory": target_dir,
                    "relative_path": directory_name,
                    "listing": listing,
                    "indexed": index_result.get("success", False)
                }
            else:
                return {"success": False, "error": f"Failed to clone repository: {stderr}"}
                
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Repository cloning timed out after 120 seconds"}
        except Exception as e:
            return {"success": False, "error": f"Error cloning repository: {str(e)}"}

# Model Selection Logic
def select_best_model(task=None, user_preference=None):
    """Select the best model based on task and user preference"""
    if user_preference and user_preference != "best_available":
        # User specified a model
        for model in MODELS:
            if model.name == user_preference:
                return model
                
    # Select based on task
    if task:
        for model in MODELS:
            if model.default_for and task in model.default_for:
                return model
    
    # Default to the model marked as default
    for model in MODELS:
        if model.default_for and "default" in model.default_for:
            return model
    
    # Fallback to first model
    return MODELS[0]

# LLM clients
class AIProviders:
    @staticmethod
    def get_client(provider):
        """Get the appropriate client for a provider"""
        if provider == "groq":
            return groq.Client(api_key=os.environ.get('GROQ_API_KEY'))
        else:
            raise ValueError(f"Unknown provider: {provider}")

# AI Assistant Core
class CodeAssistant:
    def __init__(self):
        """Initialize the code assistant"""
        # Cache for clients
        self.clients = {}
    
    def get_client(self, provider):
        """Get or create a client for the provider"""
        if provider not in self.clients:
            self.clients[provider] = AIProviders.get_client(provider)
        return self.clients[provider]
    
    def analyze_code(self, code, file_path=None, model_preference=None):
        """Analyze code and provide detailed explanation."""
        # Select model
        model_config = select_best_model("code_understanding", model_preference)
        client = self.get_client(model_config.provider)
        
        file_context = f"This code is from file: {file_path}\n\n" if file_path else ""
        
        prompt = f"""{file_context}As an expert code reviewer, please analyze the following code and provide:
        
1. A high-level summary of what the code does
2. Breakdown of major components and how they interact
3. Key functions/classes and their purposes
4. Potential issues or areas for improvement
5. Best practices that are followed or could be implemented

```
{code}
```

Format your response using Markdown for readability with headers and code blocks where appropriate."""
        
        try:
            response = client.chat.completions.create(
                model=model_config.name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=model_config.max_tokens
            )
            return {
                "success": True, 
                "analysis": response.choices[0].message.content,
                "model_used": model_config.name
            }
        except Exception as e:
            logger.error(f"Error analyzing code: {str(e)}")
            return {"success": False, "error": f"Error analyzing code: {str(e)}"}
    
    def modify_code(self, code, instructions, file_path=None, model_preference=None):
        """Modify code based on instructions."""
        # Select model
        model_config = select_best_model("code_generation", model_preference)
        client = self.get_client(model_config.provider)
        
        file_context = f"This code is from file: {file_path}\n\n" if file_path else ""
        
        prompt = f"""{file_context}Please modify the following code according to these instructions: 

Instructions:
```
{instructions}
```

Original code:
```
{code}
```

Please return the modified code.
"""
        
        try:
            response = client.chat.completions.create(
                model=model_config.name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=model_config.max_tokens
            )
            return {
                "success": True, 
                "rewritten_code": response.choices[0].message.content,
                "model_used": model_config.name
            }
        except Exception as e:
            logger.error(f"Error modifying code: {str(e)}")
            return {"success": False, "error": f"Error modifying code: {str(e)}"}

# API Endpoints
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Chat endpoint for interacting with the assistant"""
    session_id, session = get_or_create_session(request.session_id)
    
    # Select model
    model_config = select_best_model("conversation", request.model)
    client = AIProviders.get_client(model_config.provider)
    
    # Prepare messages
    messages = [{"role": "system", "content": "You are a helpful AI code assistant."}]
    if session["messages"]:
        messages.extend(session["messages"])
    messages.append({"role": "user", "content": request.message})
    
    # Call the model
    try:
        response = client.chat.completions.create(
            model=model_config.name,
            messages=messages,
            temperature=0.7,
            max_tokens=model_config.max_tokens
        )
        response_text = response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error in chat: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"Error in chat: {str(e)}"})
    
    # Update session
    session["messages"].append({"role": "user", "content": request.message})
    session["messages"].append({"role": "assistant", "content": response_text})
    
    # Initialize tool_results with an empty list
    tool_results = []
    
    # Handle tool calls
    tool_calls = response.choices[0].message.tool_calls
    if tool_calls:
        for tool_call in tool_calls:
            tool_result = await _execute_tool_call(tool_call, session_id)
            tool_results.append(tool_result)
        
        # Update response with tool results
        response_text += "\n\nTool results:\n" + "\n".join([f"- {r['tool']}: {r['result']}" for r in tool_results])
        
        # Update session with tool history
        session["tools_history"].extend(tool_results)
    
    return ChatResponse(
        response=response_text,
        tool_calls=tool_results,
        session_id=session_id,
        context=session["context"],
        model_used=model_config.name
    )

@app.post("/upload", response_model=UploadResponse)
async def upload_file_endpoint(file: UploadFile = File(...), session_id: str = Form(None)):
    """Upload a file to the workspace"""
    _, session = get_or_create_session(session_id)
    workspace = session["context"]["workspace_root"]
    
    try:
        # Save the file
        file_path = os.path.join(workspace, file.filename)
        with open(file_path, "wb") as f:
            f.write(file.file.read())
        
        # Get file info
        file_info = get_file_info(file_path)
        
        # Index the file for semantic search
        index_result = index_files(session_id, [file_path])
        
        return UploadResponse(
            success=True,
            message=f"Successfully uploaded {file.filename}",
            file_path=file_path,
            size=file_info["size"],
            session_id=session_id
        )
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"Error uploading file: {str(e)}"})

@app.post("/generate_code", response_model=ChatResponse)
async def generate_code_endpoint(request: CodeGenerationRequest):
    """Generate code based on a description"""
    session_id, session = get_or_create_session(request.session_id)
    
    # Select model
    model_config = select_best_model("code_generation", request.model)
    client = AIProviders.get_client(model_config.provider)
    
    # Prepare prompt
    prompt = f"""Generate code for the following description:
```
{request.description}
```

Language: {request.language}
"""
    if request.framework:
        prompt += f"\nFramework: {request.framework}"
    if request.specifications:
        prompt += f"\nSpecifications:\n```\n{json.dumps(request.specifications, indent=2)}\n```\n"
    
    # Call the model
    try:
        response = client.chat.completions.create(
            model=model_config.name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=model_config.max_tokens
        )
        response_text = response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating code: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"Error generating code: {str(e)}"})
    
    # Update session
    session["messages"].append({"role": "user", "content": prompt})
    session["messages"].append({"role": "assistant", "content": response_text})
    
    return ChatResponse(
        response=response_text,
        session_id=session_id,
        context=session["context"],
        model_used=model_config.name
    )

@app.post("/rewritten_code", response_model=ChatResponse)
async def rewrite_code_endpoint(request: CodeEditRequest):
    """Rewritten code based on instructions"""
    session_id, session = get_or_create_session(request.session_id)
    
    # Read original code
    read_result = Tools.read_file(request.file_path, session["context"]["workspace_root"])
    if not read_result["success"]:
        return JSONResponse(status_code=400, content={"error": read_result["error"]})
    
    # Rewritten code
    assistant = CodeAssistant()
    rewritten_result = assistant.modify_code(
        read_result["content"],
        request.instructions,
        request.file_path,
        request.model
    )
    if not rewritten_result["success"]:
        return JSONResponse(status_code=500, content={"error": rewritten_result["error"]})
    
    # Write rewritten code
    write_result = Tools.write_file(request.file_path, rewritten_result["rewritten_code"], session["context"]["workspace_root"])
    if not write_result["success"]:
        return JSONResponse(status_code=500, content={"error": write_result["error"]})
    
    # Update session
    session["messages"].append({"role": "user", "content": f"Rewritten code for {request.file_path}"})
    session["messages"].append({"role": "assistant", "content": rewritten_result["rewritten_code"]})
    
    return ChatResponse(
        response=rewritten_result["rewritten_code"],
        session_id=session_id,
        context=session["context"],
        model_used=rewritten_result["model_used"]
    )

@app.post("/generate_project", response_model=ChatResponse)
async def generate_project_endpoint(request: ProjectGenerationRequest):
    """Generate a project structure based on specifications"""
    session_id, session = get_or_create_session(request.session_id)
    
    # Select model
    model_config = select_best_model("project_generation", request.model)
    client = AIProviders.get_client(model_config.provider)
    
    # Prepare prompt
    prompt = f"""Generate a project structure for the following specifications:
```
Project Name: {request.project_name}
Description: {request.description}
Technologies: {', '.join(request.technologies)}
Features: {', '.join(request.features)}
```

Format your response as a nested dictionary where keys are file/directory names and values are either file contents or nested dictionaries for directories.
"""
    
    # Call the model
    try:
        response = client.chat.completions.create(
            model=model_config.name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=model_config.max_tokens
        )
        response_text = response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating project structure: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"Error generating project structure: {str(e)}"})
    
    # Update session
    session["messages"].append({"role": "user", "content": prompt})
    session["messages"].append({"role": "assistant", "content": response_text})
    
    # Parse response
    try:
        project_structure = json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing project structure: {str(e)}")
        return JSONResponse(status_code=500, content={"error": f"Error parsing project structure: {str(e)}"})
    
    # Create project structure
    create_result = Tools.create_project_structure(project_structure, request.project_name, session["context"]["workspace_root"])
    if not create_result["success"]:
        return JSONResponse(status_code=500, content={"error": create_result["error"]})
    
    # Update session
    session["project_structure"] = create_result["structure"]
    
    return ChatResponse(
        response=json.dumps(create_result["structure"], indent=2),
        session_id=session_id,
        context=session["context"],
        model_used=model_config.name
    )

@app.post("/search_code", response_model=Dict[str, Any])
async def search_code_endpoint(request: SearchCodeRequest):
    """Search for code using semantic search"""
    _, session = get_or_create_session(request.session_id)
    
    # Perform search
    search_result = search_code(request.session_id, request.query, request.max_results)
    if not search_result["success"]:
        return JSONResponse(status_code=500, content={"error": search_result["error"]})
    
    # Update session
    session["messages"].append({"role": "user", "content": f"Searched for code: {request.query}"})
    session["messages"].append({"role": "assistant", "content": json.dumps(search_result["results"])})
    
    return search_result

@app.post("/api/execute")
async def execute_command_endpoint(request: ExecuteCommandRequest):
    """Execute a command in the workspace"""
    _, session_data = get_or_create_session(request.session_id)
    workspace = session_data["context"]["workspace_root"]
    
    # Execute command
    result = Tools.execute_command(
        request.command,
        request.working_dir,
        workspace,
        request.timeout
    )
    
    return result

@app.post("/api/github/clone")
async def clone_github_repository_endpoint(request: GitHubCloneRequest):
    """Clone a GitHub repository into the workspace"""
    _, session_data = get_or_create_session(request.session_id)
    workspace = session_data["context"]["workspace_root"]
    
    # Clone the repository
    result = Tools.clone_github_repository(
        request.repository_url,
        workspace,
        request.directory_name,
        request.branch
    )
    
    # Update session context with information about the cloned repository
    if result["success"]:
        session_data["context"]["last_cloned_repo"] = {
            "url": request.repository_url,
            "directory": result["relative_path"],
            "cloned_at": datetime.now().isoformat()
        }
        
        # Add to cloned repositories list
        if "cloned_repositories" not in session_data["context"]:
            session_data["context"]["cloned_repositories"] = []
            
        session_data["context"]["cloned_repositories"].append({
            "url": request.repository_url,
            "directory": result["relative_path"],
            "cloned_at": datetime.now().isoformat()
        })
    
    
    return result

@app.get("/workspace_info", response_model=WorkspaceInfo)
async def workspace_info_endpoint(session_id: str):
    """Get information about the current workspace"""
    _, session = get_or_create_session(session_id)
    workspace = session["context"]["workspace_root"]
    
    # List files and directories
    list_result = Tools.list_directory(workspace)
    if not list_result["success"]:
        return JSONResponse(status_code=500, content={"error": list_result["error"]})
    
    return WorkspaceInfo(
        current_directory=list_result["current_path"],
        available_files=list_result["files"],
        directories=list_result["directories"]
    )

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication"""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Message text was: {data}")
    except WebSocketDisconnect:
        await websocket.close()

# Helper functions
async def _execute_tool_call(tool_call, session_id):
    """Execute a tool call"""
    _, session = get_or_create_session(session_id)
    workspace = session["context"]["workspace_root"]
    
    tool_id = tool_call.id
    tool_name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)
    
    # Map tool names to functions
    tool_map = {
        "read_file": lambda: Tools.read_file(
            args["file_path"],
            workspace
        ),
        "write_file": lambda: Tools.write_file(
            args["file_path"],
            args["content"],
            workspace
        ),
        "list_directory": lambda: Tools.list_directory(
            args.get("directory", "."),
            workspace
        ),
        "search_files": lambda: Tools.search_files(
            args["pattern"],
            args.get("directory", "."),
            workspace
        ),
        "execute_command": lambda: Tools.execute_command(
            args["command"],
            args.get("working_dir"),
            workspace,
            args.get("timeout", 30)
        ),
        "create_project_structure": lambda: Tools.create_project_structure(
            args["structure"],
            args["base_dir"],
            workspace
        ),
        "search_code_semantic": lambda: Tools.search_code_semantic(
            args["query"],
            session_id,
            args.get("top_k", 5)
        ),
        "index_workspace_files": lambda: Tools.index_workspace_files(
            args["session_id"],
            args.get("file_paths")
        ),
        "clone_github_repository": lambda: Tools.clone_github_repository(
            args["repository_url"], 
            workspace, 
            args.get("directory_name"),
            args.get("branch")
        )
    }
    
    # Execute the tool
    try:
        result = tool_map[tool_name]()
        return {
            "tool": tool_name,
            "result": result,
            "tool_id": tool_id
        }
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}")
        return {
            "tool": tool_name,
            "error": f"Error executing tool {tool_name}: {str(e)}",
            "tool_id": tool_id
        }

# Main entry point
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

