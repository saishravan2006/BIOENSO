import cv2
import numpy as np

class MotionDetector:
    def __init__(self, threshold=25, blur_size=(21, 21), min_area=500):
        self.threshold = threshold
        self.blur_size = blur_size
        self.min_area = min_area
        self.reference_frame = None

    def process_frame(self, frame):
        # Convert to grayscale and blur
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, self.blur_size, 0)
        
        # Initialize reference frame if needed
        if self.reference_frame is None:
            self.reference_frame = gray.copy().astype("float")
            return 0.0, "LOW"
            
        # Update reference frame with a slight moving average to adapt to lighting changes
        cv2.accumulateWeighted(gray, self.reference_frame, 0.5)
            
        # Compute absolute difference
        frame_delta = cv2.absdiff(cv2.convertScaleAbs(self.reference_frame), gray)
        thresh = cv2.threshold(frame_delta, self.threshold, 255, cv2.THRESH_BINARY)[1]
        
        # Dilate the thresholded image to fill in holes
        thresh = cv2.dilate(thresh, None, iterations=2)
        
        # Find contours
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        motion_area = 0
        for c in contours:
            # Ignore small contours
            if cv2.contourArea(c) < self.min_area:
                continue
            motion_area += cv2.contourArea(c)
            
        # Calculate motion ratio (0.0 to 1.0)
        total_area = frame.shape[0] * frame.shape[1]
        # Avoid zero division and cap at 1.0
        movement_index = min(1.0, motion_area / (total_area * 0.1) if total_area > 0 else 0)
        
        # Map to discrete level
        if movement_index < 0.1:
            activity_level = "LOW"
        elif movement_index < 0.4:
            activity_level = "MODERATE"
        else:
            activity_level = "HIGH"

        return movement_index, activity_level

