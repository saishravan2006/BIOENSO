import cv2
import json
import numpy as np
import os

class ZoneManager:
    def __init__(self, config_file="zones.json"):
        self.config_file = config_file
        self.zones = {}
        self.colors = {
            "SHADE": (255, 0, 0),       # Blue
            "WATER": (255, 255, 0),     # Cyan
            "GRAZING": (0, 255, 0),     # Green
            "GENERAL": (200, 200, 200)  # Gray
        }
        self.load_zones()

    def load_zones(self):
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                data = json.load(f)
                self.zones = data.get("zones", {})
        else:
            print(f"[WARN] {self.config_file} not found. Using defaults.")
            self.zones = {}

    def get_zone_for_point(self, x, y, width, height):
        # x, y are absolute pixel coordinates
        nx, ny = x / width, y / height
        
        # Check polygons (in a real app, use cv2.pointPolygonTest)
        for name, points in self.zones.items():
            pts = np.array(points, np.float32)
            if cv2.pointPolygonTest(pts, (nx, ny), False) >= 0:
                return name
        return "GENERAL"

    def draw_zones(self, frame):
        h, w = frame.shape[:2]
        overlay = frame.copy()
        
        for name, points in self.zones.items():
            pts = np.array(points, np.float32)
            # Denormalize to pixel coordinates
            pts[:, 0] *= w
            pts[:, 1] *= h
            pts = np.int32(pts)
            
            color = self.colors.get(name, (255, 255, 255))
            # Draw semi-transparent polygon
            cv2.fillPoly(overlay, [pts], color)
            # Draw border
            cv2.polylines(frame, [pts], isClosed=True, color=color, thickness=2)
            
            # Label
            if len(pts) > 0:
                cx, cy = np.mean(pts, axis=0).astype(int)
                cv2.putText(frame, name, (cx - 40, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

        # Blend for transparency
        cv2.addWeighted(overlay, 0.15, frame, 0.85, 0, frame)
