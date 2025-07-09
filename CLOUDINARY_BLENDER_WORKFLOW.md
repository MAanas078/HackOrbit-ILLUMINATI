# Cloudinary-Based Blender Rendering System

## Overview

This system implements a distributed Blender rendering platform where renters upload their .blend files via Cloudinary cloud storage, and device owners (lenders) download these files to their local machines for Docker-based rendering. The rendered outputs are then uploaded back to Cloudinary for the renter to access.

## Workflow Architecture

### 1. File Upload (Renter → Cloudinary)
- Renter selects .blend files and assets
- Files are uploaded directly to Cloudinary via multer memory storage
- Each file gets a unique Cloudinary URL and public ID
- Session is updated with `uploadedFiles` array containing file metadata

### 2. Session Management
- Device owner receives notification of new render request
- Can view uploaded files via Cloudinary links
- Accepts or rejects the request based on file availability

### 3. Render Process (Lender Device)
- Device owner initiates render on their local machine
- System downloads files from Cloudinary to temporary local directory
- Docker container is built with Blender environment
- Blender renders the project using the downloaded files
- Resource usage is monitored and reported in real-time

### 4. Output Handling
- Rendered images/animations are uploaded to Cloudinary
- Local files are cleaned up from the server
- Renter receives notifications and can preview results
- Download option creates ZIP archive from Cloudinary files

## Key Features

### 🌟 Cloud-First Architecture
- All file storage happens in Cloudinary
- No permanent local storage requirements
- Scalable and reliable file management

### 🔒 Security & Authorization
- File access controlled via session ownership
- Cloudinary URLs are secure and time-limited
- Clean separation between renter and lender data

### 🐳 Docker-Based Rendering
- Isolated rendering environment
- Consistent Blender version across all devices
- Resource monitoring and reporting

### 📊 Real-Time Progress Tracking
- Visual progress indicators for renters
- Resource usage monitoring during rendering
- Detailed timeline of session events

### 🎯 Preview & Download
- Cloudinary-hosted previews for immediate viewing
- Batch download via ZIP archive
- Automatic cleanup of temporary files

## Technical Implementation

### Backend Changes

#### BlendSession Model
```javascript
uploadedFiles: [
  {
    originalName: String,
    cloudinaryUrl: String,
    publicId: String,
    resourceType: String
  }
]
```

#### Upload Process
- Uses `multer.memoryStorage()` instead of disk storage
- Streams file buffers directly to Cloudinary
- Stores metadata in MongoDB for reference

#### Render Process
1. Downloads files from Cloudinary using `fetch()`
2. Creates temporary local directory
3. Builds Docker image with Blender
4. Executes render with resource monitoring
5. Uploads results to Cloudinary
6. Cleans up local files

#### Download Process
- Creates ZIP archive from Cloudinary URLs
- Streams files directly from cloud to archive
- No local storage required

### Frontend Enhancements

#### Renter Dashboard
- File size display during selection
- Upload progress with cloud storage messaging
- Visual status indicators showing workflow progress
- Preview access to uploaded files via Cloudinary links

#### Lender Dashboard
- Clear view of uploaded files with cloud access
- Enhanced progress indicators during rendering
- Real-time status updates with workflow explanations
- Better error handling and messaging

## Configuration Requirements

### Cloudinary Setup
```javascript
cloudinary.config({
  cloud_name: 'your-cloud-name',
  api_key: 'your-api-key',
  api_secret: 'your-api-secret'
});
```

### Environment Variables
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## API Endpoints

### Upload Files
```
POST /blendsession/:sessionId/upload
- Accepts multipart/form-data
- Uploads files to Cloudinary
- Updates session with file metadata
```

### Start Render
```
POST /blendsession/:sessionId/render
- Downloads files from Cloudinary
- Executes Docker render process
- Uploads results to Cloudinary
- Cleans up local files
```

### Download Results
```
GET /blendsession/:sessionId/download
- Creates ZIP from Cloudinary URLs
- Streams archive to client
- No permanent server storage
```

## Benefits of This Architecture

### 🚀 Scalability
- No server storage limitations
- Distributed file access
- Cloud-native architecture

### 💰 Cost Efficiency
- Reduced server storage costs
- Pay-per-use Cloudinary pricing
- Efficient resource utilization

### 🔧 Maintainability
- Clear separation of concerns
- Reduced server maintenance
- Automatic file management

### 🌍 Global Accessibility
- Cloudinary CDN for fast access
- Geographic distribution
- High availability

## Usage Flow

1. **Renter uploads files** → Files stored in Cloudinary
2. **Lender views request** → Can preview files from Cloudinary
3. **Lender accepts request** → Session becomes active
4. **Lender starts render** → Downloads files, renders, uploads results
5. **Renter views results** → Previews and downloads from Cloudinary

This architecture provides a robust, scalable, and efficient platform for distributed Blender rendering with cloud-first file management. 