# 🐳 Blender Docker Rendering System

A simple but powerful Docker-based Blender rendering system that allows you to render Blender projects in containers.

## 🚀 Features

- Isolated rendering environment using Docker
- Specific Blender version (3.6.7) for reproducible renders
- Command-line arguments for flexible usage
- Automatic output directory creation
- Error handling and user-friendly messages

## 🔧 Usage

### Basic Usage

```bash
# From the HackByte/blender directory
python run_blender.py
```

### Advanced Options

```bash
# Build the Docker image only
python run_blender.py --build-only

# Render only (skip building image)
python run_blender.py --render-only

# Specify a different .blend file
python run_blender.py --blend-file "your_other_scene.blend"

# Specify a different Python render script
python run_blender.py --script-file "custom_render.py"
```

## 📁 Structure

- `run_blender.py`: Main script to control the rendering process
- `project/`: Contains Blender files and Docker configuration
  - `your_scene.blend`: Your Blender project
  - `render_script.py`: Python script that controls rendering in Blender
  - `Dockerfile`: Defines the Docker container environment
  - `outputs/`: Rendered images will be saved here (created automatically)

## 🔄 Customization

Edit `render_script.py` to change render settings like:

- Output format (PNG, JPEG, EXR, etc.)
- Render engine (Cycles or Eevee)
- Sample count for quality control

```bash
docker build -t blender-render .
```
