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
        
        # COCO mapping for our test classes
        self.class_names = {
            0: 'PERSON', 
            15: 'CAT', 
            16: 'DOG', 
            21: 'COW', 
            67: 'PHONE', 
            73: 'BOOK'
        }
        self.target_classes = list(self.class_names.keys())
        
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
                        "center": (int((x1 + x2) / 2), int((y1 + y2) / 2)),
                        "class_name": self.class_names.get(cls_id, "UNKNOWN")
                    })
        return detections
