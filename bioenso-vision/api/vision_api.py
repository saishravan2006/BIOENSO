from flask import Flask, jsonify
from flask_cors import CORS
import threading
import datetime
import logging

app = Flask(__name__)
CORS(app)

# Suppress flask logging to keep terminal clean
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

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
        "resting_pct": 0
    },
    "vision": {
        "confidence": 0.0,
        "source": "INFERRED \u00b7 VISION" # unicode dot
    },
    "status": "INITIALIZING"
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
    # Derive resting: if movement is low and not in water/grazing
    # This is a proxy heuristic
    resting_pct = 100 - (grazing_pct + water_pct)
    if resting_pct < 0:
        resting_pct = 0
        
    LATEST_OBSERVATION["biology"]["animals_observed"] = active_animals
    LATEST_OBSERVATION["biology"]["movement_index"] = float(movement_index)
    LATEST_OBSERVATION["biology"]["shade_occupancy_pct"] = shade_pct
    LATEST_OBSERVATION["biology"]["water_zone_occupancy_pct"] = water_pct
    LATEST_OBSERVATION["biology"]["grazing_pct"] = grazing_pct
    LATEST_OBSERVATION["biology"]["resting_pct"] = resting_pct
    
    LATEST_OBSERVATION["vision"]["confidence"] = float(confidence)
    LATEST_OBSERVATION["status"] = status
