from flask import Flask, render_template, request, jsonify
import os
import uuid
import base64
import logging
import google.generativeai as genai
from datetime import datetime, timedelta
import json
from werkzeug.utils import secure_filename
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure Gemini API
API_KEY = "AIzaSyAYPdZmouiNeU5G3V_veryswkE-1Q-41uY"
genai.configure(api_key=API_KEY)

# Configure upload settings
UPLOAD_FOLDER = 'static/uploads'
JSON_RESPONSES_FOLDER = 'json_responses'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (increased from 5MB)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['JSON_RESPONSES_FOLDER'] = JSON_RESPONSES_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Create upload directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    try:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        logger.info(f"Created upload directory: {UPLOAD_FOLDER}")
    except Exception as e:
        logger.error(f"Failed to create upload directory: {str(e)}")

# Create JSON responses directory if it doesn't exist
if not os.path.exists(JSON_RESPONSES_FOLDER):
    try:
        os.makedirs(JSON_RESPONSES_FOLDER, exist_ok=True)
        logger.info(f"Created JSON responses directory: {JSON_RESPONSES_FOLDER}")
    except Exception as e:
        logger.error(f"Failed to create JSON responses directory: {str(e)}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_device():
    logger.info("Received analysis request")
    
    try:
        # Log request details for debugging
        logger.info(f"Request form keys: {list(request.form.keys())}")
        logger.info(f"Request files keys: {list(request.files.keys())}")
        
        image_path = None
        
        # Handle file upload
        if 'image' in request.files:
            logger.info("Found 'image' in request.files")
            file = request.files['image']
            
            if file.filename == '':
                logger.warning("No file selected")
                return jsonify({"error": "No file selected"}), 400
            
            if file and allowed_file(file.filename):
                # Create a secure filename with UUID
                filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                
                try:
                    file.save(image_path)
                    logger.info(f"File saved successfully to {image_path}")
                except Exception as e:
                    logger.error(f"Failed to save file: {str(e)}")
                    return jsonify({"error": f"Failed to save file: {str(e)}"}), 500
            else:
                logger.warning(f"Invalid file type: {file.filename}")
                return jsonify({"error": "Invalid file type. Allowed types: PNG, JPG, JPEG, GIF"}), 400
        
        # Handle webcam image
        elif 'webcam_image' in request.form:
            logger.info("Found 'webcam_image' in request.form")
            image_data = request.form['webcam_image']
            
            if not image_data:
                logger.warning("Empty webcam image data")
                return jsonify({"error": "Empty webcam image data"}), 400
            
            try:
                # Handle data URI format (data:image/jpeg;base64,...)
                if 'base64,' in image_data:
                    image_data = image_data.split('base64,')[1]
                
                image_bytes = base64.b64decode(image_data)
                
                # Create a unique filename for the webcam image
                filename = f"{uuid.uuid4()}.jpg"
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                
                with open(image_path, 'wb') as f:
                    f.write(image_bytes)
                logger.info(f"Webcam image saved successfully to {image_path}")
            except Exception as e:
                logger.error(f"Failed to process webcam image: {str(e)}")
                return jsonify({"error": f"Failed to process webcam image: {str(e)}"}), 500
        
        else:
            logger.warning("No image found in request")
            return jsonify({"error": "No image found in request"}), 400
        
        # Verify image was saved
        if not os.path.exists(image_path):
            logger.error(f"Image file not found at path: {image_path}")
            return jsonify({"error": "Failed to save image"}), 500
        
        # Analyze image
        try:
            logger.info("Starting image analysis with Gemini API")
            result = analyze_image(image_path)
            logger.info("Analysis completed successfully")
            return jsonify(result)
        except Exception as e:
            logger.error(f"Error analyzing image: {str(e)}")
            return jsonify({"error": f"Error analyzing image: {str(e)}"}), 500
        finally:
            # Clean up the temporary file
            if image_path and os.path.exists(image_path):
                try:
                    os.remove(image_path)
                    logger.info(f"Cleaned up temporary file: {image_path}")
                except Exception as e:
                    logger.error(f"Failed to clean up file: {str(e)}")
    
    except Exception as e:
        logger.error(f"Unhandled exception in analyze_device: {str(e)}", exc_info=True)
        return jsonify({"error": f"Server error: {str(e)}"}), 500

def analyze_image(image_path):
    """Analyze the image using Google's Generative AI"""
    
    # Initialize the Gemini model
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        logger.info("Gemini model initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini model: {str(e)}")
        raise Exception(f"AI model initialization failed: {str(e)}")
    
    # Read image as bytes
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
        logger.info(f"Image read successfully: {len(image_bytes)} bytes")
    except Exception as e:
        logger.error(f"Failed to read image file: {str(e)}")
        raise Exception(f"Failed to read image file: {str(e)}")
    
    # Prompt for the AI model
    prompt = """
    Analyze this hardware device image and return ONLY the following JSON structure without any additional text:
    {
      "deviceName": "",
      "deviceType": "GPU",
      "specs": {
        "manufacturer": "",
        "model": "",
        "vram": "",
        "memoryTotal": ""
      }
    }
    
    Fill in all values accurately based on the device in the image. Don't include any explanation or formatting - just return the raw JSON.
    """
    
    # Generate content with Gemini
    try:
        response = model.generate_content([
            {"text": prompt},
            {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(image_bytes).decode()}}
        ])
        logger.info("Received response from Gemini API")
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        raise Exception(f"AI processing error: {str(e)}")
    
    # Parse the response
    try:
        # First try to parse as JSON directly
        cleaned_response = response.text.strip()
        logger.debug(f"Raw API response: {cleaned_response}")
        
        # Try to extract JSON if the response contains other text
        if "{" in cleaned_response and "}" in cleaned_response:
            start = cleaned_response.find("{")
            end = cleaned_response.rfind("}") + 1
            json_str = cleaned_response[start:end]
            device_info = json.loads(json_str)
        else:
            device_info = json.loads(cleaned_response)
            
        logger.info("Successfully parsed JSON response")
    except json.JSONDecodeError:
        # Fallback to text parsing if JSON parsing fails
        logger.warning("Failed to parse JSON response, using fallback parser")
        device_info = parse_response(response.text)
    
    # Create the final result with the exact format specified
    result = {
        "_id": {"$oid": str(uuid.uuid4()).replace("-", "")[:24]},
        "owner": {"$oid": "67fb74763aa6907125bda830"},
        "deviceName": device_info.get("deviceName", "Unknown GPU"),
        "deviceType": device_info.get("deviceType", "GPU"),
        "specs": {
            "manufacturer": device_info.get("specs", {}).get("manufacturer", "Unknown"),
            "model": device_info.get("specs", {}).get("model", "Unknown Model"),
            "vram": device_info.get("specs", {}).get("vram", "Unknown"),
            "memoryTotal": device_info.get("specs", {}).get("memoryTotal", "0 MB")
        },
        "performance": 79.970703125,
        "price": 200,
        "availableHours": [{
            "start": {"$date": datetime.now().isoformat() + "Z"},
            "end": {"$date": (datetime.now() + timedelta(days=3)).isoformat() + "Z"},
            "_id": {"$oid": str(uuid.uuid4()).replace("-", "")[:24]}
        }],
        "isAvailable": False,
        "location": "Raipur, India",
        "acceptedTaskTypes": ["AI Training"],
        "createdAt": {"$date": datetime.now().isoformat() + "Z"},
        "updatedAt": {"$date": datetime.now().isoformat() + "Z"},
        "__v": 0
    }
    
    # Save the response to a JSON file
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"device_{result['_id']['$oid']}_{timestamp}.json"
        filepath = os.path.join(app.config['JSON_RESPONSES_FOLDER'], filename)
        
        with open(filepath, 'w') as f:
            json.dump(result, f, indent=2)
        logger.info(f"Saved JSON response to {filepath}")
    except Exception as e:
        logger.error(f"Failed to save JSON response: {str(e)}")
    
    logger.info(f"Analysis result: {result['deviceName']} ({result['specs']['manufacturer']} {result['specs']['model']})")
    return result

def parse_response(text):
    """Fallback parser for when the response isn't valid JSON"""
    logger.info("Using fallback text parser")
    
    info = {
        "deviceName": "Unknown GPU",
        "deviceType": "GPU",
        "specs": {
            "manufacturer": "Unknown",
            "model": "Unknown",
            "vram": "Unknown",
            "memoryTotal": "0 MB"
        }
    }
    
    # Look for JSON-like structure in the text
    if '{' in text and '}' in text:
        try:
            start = text.find('{')
            end = text.rfind('}') + 1
            json_text = text[start:end]
            parsed = json.loads(json_text)
            return parsed
        except:
            logger.warning("Failed to extract JSON from text")
    
    # Line-by-line parsing as fallback
    lines = text.strip().split('\n')
    for line in lines:
        line = line.strip().strip(',"\'')
        if ':' not in line:
            continue
            
        try:
            key, value = line.split(':', 1)
            key = key.strip().strip('"\'')
            value = value.strip().strip(',"\'')
            
            if 'device name' in key.lower() or 'devicename' in key.lower():
                info["deviceName"] = value
            elif 'manufacturer' in key.lower():
                info["specs"]["manufacturer"] = value
            elif 'model' in key.lower():
                info["specs"]["model"] = value
            elif 'vram' in key.lower():
                info["specs"]["vram"] = value
            elif ('memory' in key.lower() and 'total' in key.lower()) or 'memorytotal' in key.lower():
                info["specs"]["memoryTotal"] = value
        except Exception as e:
            logger.warning(f"Error parsing line '{line}': {str(e)}")
    
    logger.info(f"Fallback parsing result: {info}")
    return info

@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error"""
    logger.warning("File upload too large")
    return jsonify({"error": f"File too large. Maximum size is {MAX_FILE_SIZE/(1024*1024)}MB"}), 413

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    logger.warning(f"404 error: {request.path}")
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors"""
    logger.error(f"Server error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500

# For testing purposes
@app.route('/test-upload', methods=['GET'])
def test_upload_page():
    """Simple test page for direct upload testing"""
    return '''
    <!doctype html>
    <title>Test File Upload</title>
    <h1>Test File Upload</h1>
    <form method="post" action="/analyze" enctype="multipart/form-data">
      <input type="file" name="image">
      <input type="submit" value="Upload">
    </form>
    '''

if __name__ == '__main__':
    logger.info("Starting GPU Device Analyzer server")
    app.run(debug=True, host='0.0.0.0', port=5002)