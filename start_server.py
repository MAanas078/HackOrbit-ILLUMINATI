import os
import subprocess
import webbrowser
import time
import sys

def start_backend():
    print("Starting backend server...")
    os.chdir("models")
    backend_process = subprocess.Popen([sys.executable, "chat.py"])
    os.chdir("..")
    return backend_process

def start_frontend():
    print("Starting frontend development server...")
    os.chdir("frontend")
    if os.name == 'nt':  # Windows
        frontend_process = subprocess.Popen(["npm.cmd", "run", "dev"])
    else:  # Unix/Linux/Mac
        frontend_process = subprocess.Popen(["npm", "run", "dev"])
    os.chdir("..")
    return frontend_process

if __name__ == "__main__":
    # Start the backend server
    backend_process = start_backend()
    
    # Wait for backend to initialize
    print("Waiting for backend to initialize...")
    time.sleep(5)
    
    # Start the frontend development server
    frontend_process = start_frontend()
    
    # Open the app in a browser
    print("Opening GitGraphium in your browser...")
    time.sleep(5)  # Wait for frontend to start
    webbrowser.open("http://localhost:5173")
    
    print("\nGitGraphium is now running!")
    print("- Backend API: http://localhost:8000")
    print("- Frontend App: http://localhost:5173")
    print("\nPress Ctrl+C to stop both servers...\n")
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("Servers stopped. Goodbye!") 