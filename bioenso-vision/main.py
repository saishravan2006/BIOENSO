import cv2
import os
import time
from dotenv import load_dotenv

from processing.motion import MotionDetector
from processing.zones import ZoneManager
from processing.detector import AnimalDetector
from processing.tracking import CentroidTracker
from processing.camera import ThreadedCamera
from api.vision_api import run_in_background, update_observation

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
    
    # Try connecting to the stream
    cap = ThreadedCamera(rtsp_url)
    
    if not cap.isOpened():
        print("[ERROR] Failed to connect to camera stream.")
        print("Possible causes:")
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
    animal_detector = AnimalDetector(model_name="yolov8n.pt", conf_threshold=0.3)
    tracker = CentroidTracker(max_disappeared=30, max_distance=100)

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

        # Run Animal Detection (only every 3rd frame to save CPU!)
        if frame_count % 3 == 0:
            detections = animal_detector.detect(frame)
        else:
            # Re-use last detections for smooth tracking between YOLO runs
            pass # tracker will just use the old detections, wait, we must update tracker 
            # Actually, to make it simple, let's just run tracker.update(detections) every frame
            # with the cached detections, or only run tracker every 3rd frame.
            pass

        # Update Tracker
        tracked_objects = tracker.update(detections if frame_count % 3 == 0 else [])
        
        # Calculate Zone Occupancy
        zone_counts = {"SHADE": 0, "WATER": 0, "GRAZING": 0, "GENERAL": 0}
        active_animals = 0
        
        # Overlay Diagnostics
        display_frame = frame.copy()
        
        # Draw Zones
        zone_manager.draw_zones(display_frame)
        
        for obj_id, obj_data in tracked_objects.items():
            if obj_data["disappeared"] == 0:
                active_animals += 1
                cx, cy = obj_data["center"]
                x1, y1, x2, y2 = obj_data["box"]
                
                # Determine Zone
                zone = zone_manager.get_zone_for_point(cx, cy, width, height)
                zone_counts[zone] = zone_counts.get(zone, 0) + 1
                
                # Draw bounding box and ID
                cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.circle(display_frame, (cx, cy), 4, (0, 0, 255), -1)
                cv2.putText(display_frame, f"ID {obj_id} ({zone})", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
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
            confidence=conf_proxy
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
