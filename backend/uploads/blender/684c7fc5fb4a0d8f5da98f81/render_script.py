
import bpy
import os
import sys

# Configuration
OUTPUT_DIR = "/blender/outputs"
OUTPUT_FILENAME = "rendered_image"
OUTPUT_FORMAT = 'PNG'  # Could be 'JPEG', 'PNG', 'EXR', etc.
RENDER_ENGINE = 'CYCLES'  # Could be 'BLENDER_EEVEE' or 'CYCLES'
SAMPLES = 128  # Higher for better quality but slower render

print(f"🔧 Setting up render with {RENDER_ENGINE} engine...")

try:
    # Create output directory if it doesn't exist
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    
    # Set render engine
    bpy.context.scene.render.engine = RENDER_ENGINE
    
    # Set samples for Cycles
    if RENDER_ENGINE == 'CYCLES':
        bpy.context.scene.cycles.samples = SAMPLES
    
    # Set output location and format
    timestamp = bpy.path.clean_name(str(bpy.context.scene.name))
    output_path = f"{OUTPUT_DIR}/{OUTPUT_FILENAME}_{timestamp}"
    
    bpy.context.scene.render.filepath = output_path
    bpy.context.scene.render.image_settings.file_format = OUTPUT_FORMAT
    
    print(f"🎬 Rendering to: {output_path}.{OUTPUT_FORMAT.lower()}")
    
    # Render the image
    bpy.ops.render.render(write_still=True)
    
    print("✅ Render completed successfully!")
except Exception as e:
    print(f"❌ Error during rendering: {e}")
    sys.exit(1)
