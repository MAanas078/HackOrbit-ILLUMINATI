from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import google.generativeai as genai
import base64
import json
import re
import asyncio
import logging
import os
from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure Gemini API
API_KEY = "AIzaSyD5Lk-4zyhINZST5dOKaBuuXOSB3DEq8YY"
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel("gemini-2.0-flash")

app = FastAPI(title="Product Analyzer API", 
              description="Real-time product analysis using webcam and Gemini AI",
              version="1.0.0")

# Create directory for storing images if it doesn't exist
UPLOAD_DIR = "product_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class AnalysisResult(BaseModel):
    id: str
    timestamp: str
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[str] = None
    stock: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    
# Store analysis results in memory
analysis_history: Dict[str, AnalysisResult] = {}

async def analyze_product_image(image_data: str) -> Dict[str, Any]:
    """Analyze product image using Gemini AI"""
    prompt_text = """
    Analyze this product image and return details in JSON format with these keys:
    - name (product name)
    - category (e.g., Electronics, Accessories, Apparel)
    - price (estimated price in INR)
    - stock (approximate stock availability)
    - image (placeholder image URL)
    - description (short product description)
    Return only a valid JSON object, without any additional text.
    """
    
    try:
        response = model.generate_content(
            [
                {"mime_type": "image/jpeg", "data": image_data},
                {"text": prompt_text},
            ]
        )
        
        # Extract response text
        response_text = response.text
        
        # Extract JSON safely
        match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if match:
            json_text = match.group(0)
            try:
                product_data = json.loads(json_text)
                
                # Ensure price is a string
                if "price" in product_data and isinstance(product_data["price"], (int, float)):
                    product_data["price"] = str(product_data["price"])
                
                return product_data
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON response: {response_text}")
                return {"error": "Failed to parse response"}
        else:
            logger.error(f"No valid JSON found in response: {response_text}")
            return {"error": "No valid JSON found in response"}
    except Exception as e:
        logger.error(f"Error analyzing product: {str(e)}")
        return {"error": str(e)}

@app.websocket("/ws/analyze")
async def websocket_analyze(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection established")
    
    try:
        while True:
            # Receive the base64 image from the client
            data = await websocket.receive_text()
            
            try:
                json_data = json.loads(data)
                image_data = json_data.get("image")
                
                if not image_data:
                    await websocket.send_json({"error": "No image data received"})
                    continue
                
                # Remove data URL prefix if present
                if image_data.startswith("data:image"):
                    image_data = image_data.split(",")[1]
                
                # Save image for logging/debugging
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                image_id = f"product_{timestamp}"
                image_path = os.path.join(UPLOAD_DIR, f"{image_id}.jpg")
                
                # Save image to file
                with open(image_path, "wb") as f:
                    f.write(base64.b64decode(image_data))
                
                logger.info(f"Image saved to {image_path}, analyzing...")
                
                # Analyze the image
                analysis_result = await analyze_product_image(image_data)
                
                # Add metadata
                result_with_metadata = {
                    "id": image_id,
                    "timestamp": timestamp,
                    **analysis_result
                }
                
                # Store in history
                analysis_history[image_id] = AnalysisResult(**result_with_metadata)
                
                # Send result back to client
                await websocket.send_json(result_with_metadata)
                logger.info(f"Analysis completed and sent for image {image_id}")
                
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON format"})
            except Exception as e:
                logger.error(f"Error processing image: {str(e)}")
                await websocket.send_json({"error": str(e)})
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        logger.info("WebSocket connection closed")

@app.get("/api/history")
async def get_history():
    """Get all previous analysis results"""
    return list(analysis_history.values())

@app.get("/api/analysis/{image_id}")
async def get_analysis(image_id: str):
    """Get a specific analysis result by ID"""
    if image_id not in analysis_history:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_history[image_id]

# Mount static files for frontend
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)