# Dev.env-ResourceX
<p align="center">
  <a href="https://youtu.be/b3HCJWUALpQ" target="_blank">
    <img src="assets/ChatGPT Image May 29, 2025 at 03_26_37 PM.png" alt="Watch the Demo Video" width="720">
  </a>
</p>


Watch how ResourceX discovers idle compute resources, distributes demanding workloads like AI training and 3D rendering, and returns results securely — fully automated, fully decentralized!
🔗 [Watch the Demo](https://youtu.be/b3HCJWUALpQ)

## Problem Statement
Access to high-performance computing is expensive and centralized, limiting students, indie developers, and researchers who need to train AI models, render graphics, or handle large data. At the same time, millions of personal devices with powerful CPUs and GPUs sit idle, lacking a secure, trusted, and rewarding way to share their compute power. There's no decentralized, user-friendly platform that connects those who need computing with those who can provide it!

## Current Challenges
High cost of cloud compute (AWS, GCP, Azure)
Limited free access (e.g., Google Colab timeouts)
No incentive or platform to contribute unused resources
Privacy & trust concerns with existing peer-to-peer systems
Exclusion of developers from under-resourced regions

***Case-Study***
Meet Person X – a CS student pushing their AI model to improve, but stuck at 60% accuracy. The lab’s full, cloud credits are gone, and deadlines are closing in.

Across town, Person Y – a freelancer with a powerful PC (RTX 4080, 64GB RAM) that mostly sits idle.

🌀 For Users like X: Affordable, on-demand access to GPU, CPU, and storage—no middlemen, no inflated costs.

⚡ For Providers like Y: Turn idle hardware into income. Securely share resources, powered by blockchain and zero-knowledge proofs.
---
## Watch Now : Click on the image below
<p align="center">
  <a href="https://youtu.be/b3HCJWUALpQ" target="_blank">
    <img src="assets/ChatGPT Image May 29, 2025 at 05_23_34 PM.png" alt="Watch the Demo Video" width="720">
  </a>
</p>
🔗 [Watch the Demo](https://www.youtube.com/watch?v=TOljqkl3aoM)


## Architecture
<p align="center">
  <img src="assets/ChatGPT Image May 29, 2025, 04_42_22 PM.png" alt="Alt text" width="720"/>
</p>

## TechStack
<p align="center">
  <img src="assets/WhatsApp Image 2025-05-29 at 17.47.33.jpeg" alt="Alt text" width="720"/>
</p>


## 📚 Table of Contents

* [Features](#features)
* [Project Structure](#project-structure)
* [Requirements](#requirements)
* [Installation](#installation)
* [Usage](#usage)


---
## 🔄 Features

* **Modular Design**: Backend, frontend, and models are organized for scalability.
* **Multi-language Support**: JavaScript (Node.js) backend, Python models, and React frontend.
* **Resource Management**: Easily manage development resources and dependencies.
* **Resource Exchange System**: Collaborative and scalable resource sharing.

## 🔄 Device Interaction Flow

* **Device Listing**: Devices register themselves in the system with specifications and availability status.
* **Device Browsing & Requesting**: Users can browse available devices and send a request to rent based on task requirements.
* **Code Dispatch**: Once the request is approved, the task code is securely transmitted to the selected device.
* **Remote Execution**: The rented device executes the code using its compute resources.
* **Result Delivery**: The output is sent back to the requester and optionally to the device owner (lender) for transparency or billing.

---


## 📁 Project Structure

```
Dev.env-ResourceX/
├── backend/      # Backend code and services (Node.js)
├── blender/      # Blender-related scripts or integrations
├── frontend/     # Frontend code (JavaScript/HTML)
├── models/       # Data models or machine learning models
```

---

## ⚙️ Installation

### Clone the repository:

```bash
git clone https://github.com/priyadarshi7/Dev.env-ResourceX.git
cd Dev.env-ResourceX
```

### Backend Setup (Node.js):

Navigate to the `backend/` directory and install dependencies.

```bash
cd backend
npm install
```

### Frontend Setup:

Navigate to the `frontend/` directory and install dependencies.

```bash
cd ../frontend
npm install
```

### Blender Setup:

If using Blender scripts, ensure Blender is installed and properly configured.

---
## 📦 Requirements

* Node.js & npm
* Python 3.8+ (for models)
* Blender (optional, for Blender scripts)
* Other dependencies as specified in `package.json` or `requirements.txt`
---

## 🧩 Usage

### Backend:

Run the backend server from the `backend/` directory:

```bash
cd backend
npm run dev
```

### Frontend:

Serve or build the frontend from the `frontend/` directory:

```bash
cd frontend
npm run dev
```

### Models:

Use or train models as described in the `models/` directory's documentation.

```bash
cd models
pip install -r requirements.txt
uvicorn chat:app --reload
uvicorn terminal:app --reload
python main.py
cd listing
python app.py
```


---


