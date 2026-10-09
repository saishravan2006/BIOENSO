from flask import Flask, jsonify
from flask_cors import CORS
import threading
import datetime
import os
import logging
import time
from processing.audio import AcousticFeatureExtractor
from processing.classifier import VocalisationClassifier

audio_extractor = AcousticFeatureExtractor()
vocal_classifier = VocalisationClassifier()

app = Flask(__name__)
CORS(app)

# Suppress flask logging to keep terminal clean
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

LATEST_FRAME = None
LATEST_FRAME_BIO = None
frame_lock = threading.Lock()
bio_lock = threading.Lock()

def update_frame(frame):
    global LATEST_FRAME
    with frame_lock:
        LATEST_FRAME = frame.copy()

def update_frame_bio(frame):
    global LATEST_FRAME_BIO
    with bio_lock:
        LATEST_FRAME_BIO = frame.copy()

def generate_mjpeg():
    import cv2
    while True:
        with frame_lock:
            frame = LATEST_FRAME.copy() if LATEST_FRAME is not None else None
            
        if frame is None:
            time.sleep(0.1)
            continue
            
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.05)

def generate_mjpeg_bio():
    import cv2
    while True:
        with bio_lock:
            frame = LATEST_FRAME_BIO.copy() if LATEST_FRAME_BIO is not None else None
            
        if frame is None:
            time.sleep(0.1)
            continue
            
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.05)

@app.route("/api/v1/video_feed")
def video_feed():
    from flask import Response
    return Response(generate_mjpeg(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/api/v1/video_feed_bio")
def video_feed_bio():
    from flask import Response
    return Response(generate_mjpeg_bio(), mimetype='multipart/x-mixed-replace; boundary=frame')

# Global store for the latest environment observation
LATEST_ENV_OBSERVATION = {
    "farmId": "DEMO_FARM_01",
    "deviceId": "SIM_ENV_01",
    "observationTime": datetime.datetime.now().isoformat(),
    "source": "SIMULATED",
    "calibrationProfileId": None,
    "temperature": 32.5,
    "humidity": 55,
    "rawWetSensorAdc": 1200,
    "rainfall": 0,
    "wind": 12
}

from flask import request

@app.route("/api/v1/observations/environment", methods=["GET", "POST"])
def environment_obs():
    global LATEST_ENV_OBSERVATION
    if request.method == "POST":
        data = request.json
        if data:
            LATEST_ENV_OBSERVATION.update(data)
            LATEST_ENV_OBSERVATION["observationTime"] = datetime.datetime.now().isoformat()
            return jsonify({"status": "updated", "data": LATEST_ENV_OBSERVATION})
        return jsonify({"error": "No JSON payload"}), 400
        
    return jsonify(LATEST_ENV_OBSERVATION)

# Global store for the latest observation
LATEST_OBSERVATION = {
    "farm_id": "DEMO_FARM_01",
    "timestamp": datetime.datetime.now().isoformat(),
    "biology": {
        "species": "cattle",
        "animals_observed": 0,
        "shade_occupancy_pct": 0,
        "water_zone_occupancy_pct": 0,
        "movement_index": 0.0,
        "grazing_pct": 0,
        "resting_pct": None, "unclassified_activity_pct": 0
    },
    "vision": {
        "confidence": 0.0,
        "source": "INFERRED \u00b7 VISION" # unicode dot
    },
    "status": "ACTIVE"
}

@app.route("/api/v1/observations/biology", methods=["GET"])
def get_biology():
    LATEST_OBSERVATION["timestamp"] = datetime.datetime.now().isoformat()
    return jsonify(LATEST_OBSERVATION)

def start_api_server():
    print("[API] Starting local BioENSO Vision API on http://localhost:8000")
    app.run(host="0.0.0.0", port=8000, debug=False, use_reloader=False)

def run_in_background():
    api_thread = threading.Thread(target=start_api_server)
    api_thread.daemon = True
    api_thread.start()

def update_observation(active_animals, movement_index, shade_pct, water_pct, grazing_pct, confidence, status="ONLINE"):
    if grazing_pct is None or water_pct is None:
        unclassified_pct = None
    else:
        unclassified_pct = 100 - (grazing_pct + water_pct)
    if unclassified_pct is not None and unclassified_pct < 0:
        unclassified_pct = 0
        
    LATEST_OBSERVATION["biology"]["animals_observed"] = active_animals
    LATEST_OBSERVATION["biology"]["movement_index"] = float(movement_index)
    LATEST_OBSERVATION["biology"]["shade_occupancy_pct"] = shade_pct
    LATEST_OBSERVATION["biology"]["water_zone_occupancy_pct"] = water_pct
    LATEST_OBSERVATION["biology"]["grazing_pct"] = grazing_pct
    LATEST_OBSERVATION["biology"]["resting_pct"] = None
    LATEST_OBSERVATION["biology"]["unclassified_activity_pct"] = unclassified_pct
    
    LATEST_OBSERVATION["vision"]["confidence"] = float(confidence)
    LATEST_OBSERVATION["status"] = status


from flask import request

import uuid

@app.route('/api/v1/audio/process', methods=['POST'])
def process_audio():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    # Check max size (e.g. 5MB)
    file.seek(0, os.SEEK_END)
    size = file.tell()
    if size > 5 * 1024 * 1024:
        return jsonify({"error": "File exceeds maximum size of 5MB"}), 400
    file.seek(0)
        
    temp_path = f"temp_upload_{uuid.uuid4().hex}.wav"
    try:
        file.save(temp_path)
        result = audio_extractor.process_file(temp_path)
        
        if result.get("quality") == "VALID" and result.get("features"):
            classification = vocal_classifier.classify(result["features"])
            result["classification"] = classification
        else:
            result["classification"] = vocal_classifier.classify(None)
            
        return jsonify(result)
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

# Audio retention policy
@app.route('/api/v1/audio/policy', methods=['GET'])
def get_audio_policy():
    return jsonify({
        "retentionPolicy": "Immediate Ephemeral",
        "details": "Audio files are processed in memory or temp files and deleted immediately after feature extraction. No raw audio is stored or transmitted externally.",
        "storageDurationSeconds": 0
    })
