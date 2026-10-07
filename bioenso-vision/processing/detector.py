import cv2

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

class AnimalDetector:
    def __init__(self, model_name='yolov8s.pt', conf_threshold=0.35):
        self.conf_threshold = conf_threshold
        self.model = None
        # COCO IDs: 0 (person), 15 (cat), 16 (dog), 21 (cow), 67 (cell phone), 73 (book)
        self.target_classes = [0, 15, 16, 21, 67, 73] 
        
        if YOLO_AVAILABLE:
            print(f"[VISION] Loading {model_name}...")
            self.model = YOLO(model_name)
            print("[VISION] Model loaded.")
        else:
            print("[WARN] ultralytics not installed. Animal detection is DISABLED.")
            print("[WARN] Please run: pip install ultralytics")

    def detect(self, frame):
        if not self.model:
            return []
            
        # Run inference
        results = self.model(frame, verbose=False)
        
        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                
                # If we detect any of our test classes
                if cls_id in self.target_classes and conf >= self.conf_threshold:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    detections.append({
                        "box": (int(x1), int(y1), int(x2), int(y2)),
                        "confidence": conf,
                        "center": (int((x1 + x2) / 2), int((y1 + y2) / 2))
                    })
        return detections
