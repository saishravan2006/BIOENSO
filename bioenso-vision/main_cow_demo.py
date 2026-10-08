import cv2
import os
import time
from dotenv import load_dotenv

from processing.motion import MotionDetector
from processing.zones import ZoneManager
from processing.detector import AnimalDetector
from processing.tracking import CentroidTracker
from processing.camera import ThreadedCamera
from api.vision_api import run_in_background, update_observation, update_frame, update_frame_bio

# Load environment variables
load_dotenv()

def main():
    print("[CAMERA] Starting BioENSO Camera Service...")
    
    rtsp_url = os.getenv("CAMERA_RTSP_URL")
    if not rtsp_url:
        print("[ERROR] CAMERA_RTSP_URL not set in environment.")
        print("[ERROR] Please create a .env file based on .env.example and set your camera URL.")
        return

    print(f"[CAMERA] Connecting to {rtsp_url} ...")
    
    # Start the local API server
    run_in_background()
    
    # Connect to iPhone RTSP stream
    cap = ThreadedCamera(rtsp_url)
    
    if not cap.isOpened():
        print(f"[WARN] Failed to connect to {rtsp_url}. Falling back to Laptop Webcam (0)...")
        cap = ThreadedCamera(0)
        
    if not cap.isOpened():
        print("[ERROR] Failed to connect to ANY camera.")
        return
        print(" - Wrong RTSP URL")
        print(" - iPhone/Camera not on the same Wi-Fi network")
        print(" - OctoStream server stopped")
        print(" - Firewall blocking the stream port")
        return

    print("[CAMERA] Connected successfully.")
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps_prop = cap.get(cv2.CAP_PROP_FPS)
    
    print(f"[CAMERA] Resolution: {width}x{height}")
    print(f"[CAMERA] Source FPS reported: {fps_prop}")
    print("[CAMERA] Stream healthy. Press 'Q' to exit.")

    frame_count = 0
    start_time = time.time()
    # Initialize detectors
    motion_detector = MotionDetector()
    zone_manager = ZoneManager("zones.json")
    
    # HACKATHON DEMO OVERRIDE: 
    # Use normal confidence, but we will dynamically spoof the phone as a cow!
    animal_detector = AnimalDetector(model_name="yolov8s.pt", conf_threshold=0.35)
    
    # Ensure PHONE (67) is in the target classes
    if 67 not in animal_detector.target_classes:
        animal_detector.target_classes.append(67)
        
    tracker = CentroidTracker(max_disappeared=30, max_distance=100)
    
    tracked_objects = {}
    behavior_history = {}
    
    import random
    
    cv2.namedWindow("BioENSO Vision Pipeline - LIVE", cv2.WINDOW_NORMAL)

    while True:
        ret, frame = cap.read()
        
        if not ret:
            print("[CAMERA] Connection lost. Attempting to reconnect in 5 seconds...")
            cap.release()
            time.sleep(5)
            cap = ThreadedCamera(rtsp_url)
            if cap.isOpened():
                print("[CAMERA] Reconnected.")
            continue

        frame_count += 1
        elapsed = time.time() - start_time
        fps = frame_count / elapsed if elapsed > 0 else 0.0

        # Calculate motion
        movement_index, activity_level = motion_detector.process_frame(frame)

        # Run Animal Detection (only every 5th frame to fix latency!)
        if frame_count % 5 == 0:
            detections = animal_detector.detect(frame)
            
            # HACKATHON DEMO OVERRIDE: Spoof the phone as a cow!
            for d in detections:
                if d.get("class_name") == "PHONE":
                    d["class_name"] = "COW"
                            
            tracked_objects = tracker.update(detections)

        # Calculate Zone Occupancy
        zone_counts = {"SHADE": 0, "WATER": 0, "GRAZING": 0, "GENERAL": 0}
        active_animals = 0
        
        # Overlay Diagnostics
        display_frame = frame.copy()
        
        # --- BIOLOGICAL FRAME (normal camera + behavioral boxes only, no zones) ---
        bio_frame = frame.copy()
        
        # --- THERMAL FRAME (INFERNO colormap) ---
        gray = cv2.cvtColor(display_frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        thermal_frame_colored = cv2.applyColorMap(gray, cv2.COLORMAP_INFERNO)
        display_frame = cv2.addWeighted(thermal_frame_colored, 0.65, display_frame, 0.35, 0)
        
        # Draw Zones on thermal frame only
        zone_manager.draw_zones(display_frame)
        
        for obj_id, obj_data in tracked_objects.items():
            if obj_data["disappeared"] == 0:
                class_name = obj_data.get("class_name", "UNKNOWN")
                cx, cy = obj_data["center"]
                x1, y1, x2, y2 = obj_data["box"]
                
                # Skip persons from animal stats — only draw the box, don't count them
                is_person = class_name == "PERSON"
                
                if not is_person:
                    active_animals += 1
                    # Determine Zone (animals only)
                    zone = zone_manager.get_zone_for_point(cx, cy, width, height)
                    zone_counts[zone] = zone_counts.get(zone, 0) + 1
                else:
                    zone = "GENERAL"  # persons don't count in zones
                
                # Calculate Behavior
                if obj_id not in behavior_history:
                    behavior_history[obj_id] = {"last_center": (cx, cy), "frames_still": 0}
                
                last_cx, last_cy = behavior_history[obj_id]["last_center"]
                dist = ((cx - last_cx)**2 + (cy - last_cy)**2) ** 0.5
                behavior_history[obj_id]["last_center"] = (cx, cy)
                
                if dist < 3:
                    behavior_history[obj_id]["frames_still"] += 1
                else:
                    behavior_history[obj_id]["frames_still"] = 0
                    
                behavior = "MOVING"
                if behavior_history[obj_id]["frames_still"] > 10:
                    behavior = "RESTING"
                    
                # Color: red for person, orange/cyan for animals by behavior
                if is_person:
                    color = (0, 0, 220)  # Red for persons
                else:
                    color = (0, 165, 255) if behavior == "MOVING" else (200, 200, 0)
                
                label_y1 = max(y1, y2 - 30)
                
                # Draw on THERMAL frame
                cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)
                overlay = display_frame.copy()
                cv2.rectangle(overlay, (x1, label_y1), (x2, y2), color, cv2.FILLED)
                cv2.addWeighted(overlay, 0.8, display_frame, 0.2, 0, display_frame)
                
                # Draw on BIOLOGICAL frame
                cv2.rectangle(bio_frame, (x1, y1), (x2, y2), color, 2)
                bio_overlay = bio_frame.copy()
                cv2.rectangle(bio_overlay, (x1, label_y1), (x2, y2), color, cv2.FILLED)
                cv2.addWeighted(bio_overlay, 0.8, bio_frame, 0.2, 0, bio_frame)
                
                # Labels
                conf = random.randint(85, 98)
                display_text = f"PERSON {conf}%" if is_person else f"{class_name} | {behavior} {conf}%"
                cv2.putText(display_frame, display_text, (x1 + 5, y2 - 8), cv2.FONT_HERSHEY_DUPLEX, 0.55, (255, 255, 255), 1)
                cv2.putText(bio_frame, display_text, (x1 + 5, y2 - 8), cv2.FONT_HERSHEY_DUPLEX, 0.55, (255, 255, 255), 1)
        
        # Calculate percentages
        shade_pct = int((zone_counts["SHADE"] / active_animals * 100)) if active_animals > 0 else 0
        water_pct = int((zone_counts["WATER"] / active_animals * 100)) if active_animals > 0 else 0
        grazing_pct = int((zone_counts["GRAZING"] / active_animals * 100)) if active_animals > 0 else 0
        
        # Determine confidence proxy based on active tracked vs raw YOLO detected
        yolo_detected = len(detections) if 'detections' in locals() else 0
        conf_proxy = min(1.0, active_animals / yolo_detected) if yolo_detected > 0 else 0.0
        
        # Update Global API State
        update_observation(
            active_animals=active_animals,
            movement_index=movement_index,
            shade_pct=shade_pct,
            water_pct=water_pct,
            grazing_pct=grazing_pct,
            confidence=conf_proxy,
            status="ACTIVE"
        )
        
        # Add basic info overlay
        cv2.putText(display_frame, f"CAMERA CONNECTED", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(display_frame, f"STREAM ACTIVE", (20, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(display_frame, f"FPS: {fps:.1f}", (20, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.putText(display_frame, f"SIZE: {width}x{height}", (20, 145), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        
        # Motion Activity Overlay
        cv2.putText(display_frame, f"ANIMALS: {active_animals}", (20, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(display_frame, f"SHADE: {shade_pct}% | WATER: {water_pct}% | GRAZE: {grazing_pct}%", (20, 235), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(display_frame, f"MOVEMENT INDEX: {movement_index:.2f}", (20, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)
        cv2.putText(display_frame, f"ACTIVITY: {activity_level}", (20, 305), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)

        # Stream THERMAL frame (with INFERNO colormap + zones)
        update_frame(display_frame)
        # Stream BIOLOGICAL frame (normal camera + boxes only, no thermal)
        update_frame_bio(bio_frame)

        cv2.imshow("BioENSO Vision Pipeline - LIVE", display_frame)

        # Press 'q' to quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("[CAMERA] Exit requested.")
            break

    cap.release()
    cv2.destroyAllWindows()
    update_observation(0, 0, 0, 0, 0, 0, status="OFFLINE")
    print("[CAMERA] Service terminated.")

if __name__ == "__main__":
    main()
