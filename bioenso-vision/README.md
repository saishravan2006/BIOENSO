# BioENSO Vision Service

This service ingests real camera frames (e.g. from an iPhone running OctoStream via RTSP) and processes them using OpenCV to determine biological observations (movement, zones, tracking). It acts as the REAL CAMERA DEMO layer for the BioENSO system.

## Setup Instructions

1. **Create a virtual environment (Optional but recommended):**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure the Camera:**
   Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
   Open `.env` and paste your exact OctoStream RTSP URL into `CAMERA_RTSP_URL`.

4. **Run Milestone 1 (Live Video Test):**
   ```bash
   python main.py
   ```
   A window should appear showing the live feed from your iPhone along with an overlay of the connection status, FPS, and resolution.
   Press `Q` to exit.
