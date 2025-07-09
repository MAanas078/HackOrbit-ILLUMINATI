import subprocess
import os
import argparse
import sys
import platform

# Configs
IMAGE_NAME = "blender-render"
PROJECT_DIR = os.path.abspath("project")
BLEND_FILE = "your_scene.blend"
SCRIPT_FILE = "render_script.py"
OUTPUT_DIR = os.path.join(PROJECT_DIR, "outputs")

def parse_args():
    parser = argparse.ArgumentParser(description="Run Blender rendering in Docker")
    parser.add_argument("--build-only", action="store_true", help="Only build the Docker image")
    parser.add_argument("--render-only", action="store_true", help="Only run the rendering")
    parser.add_argument("--blend-file", help=f"Blend file to render (default: {BLEND_FILE})")
    parser.add_argument("--script-file", help=f"Python script to run (default: {SCRIPT_FILE})")
    return parser.parse_args()

def ensure_output_dir():
    if not os.path.exists(OUTPUT_DIR):
        print(f"📁 Creating output directory: {OUTPUT_DIR}")
        os.makedirs(OUTPUT_DIR)
    
    # Ensure the output directory has correct permissions
    # This helps on macOS where Docker volume permissions can be tricky
    try:
        os.chmod(OUTPUT_DIR, 0o777)
        print(f"📁 Set permissions on output directory")
    except Exception as e:
        print(f"⚠️ Could not set permissions on output directory: {e}")

def build_image():
    print("📦 Building Docker image...")
    try:
        # Always use platform flag for consistent behavior on all systems
        subprocess.run([
            "docker", "build", 
            "--platform=linux/amd64", 
            "-t", IMAGE_NAME, "."
        ], cwd=PROJECT_DIR, check=True)
        print("✅ Docker image built successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to build Docker image: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ Docker command not found. Is Docker installed?")
        sys.exit(1)

def run_render(blend_file=None, script_file=None):
    if not blend_file:
        blend_file = BLEND_FILE
    if not script_file:
        script_file = SCRIPT_FILE
        
    print(f"🎬 Running Blender render with {blend_file} using {script_file}...")
    ensure_output_dir()
    
    # Setup the command
    cmd = [
        "docker", "run", "--rm",
        "--platform=linux/amd64",  # Specify platform explicitly
        "-v", f"{PROJECT_DIR}:/blender",
    ]
    
    # Only add user mapping on Linux, not on macOS (causes issues on Mac)
    if platform.system() != "Darwin":
        cmd.extend(["--user", f"{os.getuid()}:{os.getgid()}"])
    
    # Continue with the rest of the command
    cmd.extend([
        "-w", "/blender",
        IMAGE_NAME,
        "-b", blend_file,
        "-P", script_file,
        "--factory-startup"  # Use factory settings to avoid user config issues
    ])
    
    try:
        subprocess.run(cmd, check=True)
        print("✅ Render complete! Check the 'outputs/' folder.")
    except subprocess.CalledProcessError as e:
        print(f"❌ Render failed: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ Docker command not found. Is Docker installed?")
        sys.exit(1)

if __name__ == "__main__":
    args = parse_args()
    
    # Handle command line arguments
    if args.build_only:
        build_image()
    elif args.render_only:
        run_render(args.blend_file, args.script_file)
    else:
        build_image()
        run_render(args.blend_file, args.script_file)
