import math
import time

class CentroidTracker:
    def __init__(self, max_disappeared=30, max_distance=100):
        self.next_object_id = 0
        self.objects = {} # dict of id -> {"center": (x, y), "disappeared": int, "box": (x1, y1, x2, y2), "confidence": float}
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, center, box, conf):
        self.objects[self.next_object_id] = {
            "center": center, 
            "box": box,
            "confidence": conf,
            "disappeared": 0
        }
        self.next_object_id += 1

    def deregister(self, object_id):
        del self.objects[object_id]

    def update(self, detections):
        # detections is a list of dicts: {"box": ..., "confidence": ..., "center": ...}
        if len(detections) == 0:
            for object_id in list(self.objects.keys()):
                self.objects[object_id]["disappeared"] += 1
                if self.objects[object_id]["disappeared"] > self.max_disappeared:
                    self.deregister(object_id)
            return self.objects

        input_centers = [d["center"] for d in detections]

        if len(self.objects) == 0:
            for i in range(len(input_centers)):
                self.register(input_centers[i], detections[i]["box"], detections[i]["confidence"])
        else:
            object_ids = list(self.objects.keys())
            object_centers = [self.objects[oid]["center"] for oid in object_ids]

            # Compute distances between each existing object and input centers
            used_rows = set()
            used_cols = set()

            # Simple greedy matching
            for i, o_center in enumerate(object_centers):
                best_dist = self.max_distance
                best_j = -1
                for j, i_center in enumerate(input_centers):
                    if j in used_cols:
                        continue
                    dist = math.hypot(o_center[0] - i_center[0], o_center[1] - i_center[1])
                    if dist < best_dist:
                        best_dist = dist
                        best_j = j

                if best_j != -1:
                    oid = object_ids[i]
                    self.objects[oid]["center"] = input_centers[best_j]
                    self.objects[oid]["box"] = detections[best_j]["box"]
                    self.objects[oid]["confidence"] = detections[best_j]["confidence"]
                    self.objects[oid]["disappeared"] = 0
                    used_rows.add(i)
                    used_cols.add(best_j)

            # Check for disappeared objects
            for i, oid in enumerate(object_ids):
                if i not in used_rows:
                    self.objects[oid]["disappeared"] += 1
                    if self.objects[oid]["disappeared"] > self.max_disappeared:
                        self.deregister(oid)

            # Register new objects
            for j in range(len(input_centers)):
                if j not in used_cols:
                    self.register(input_centers[j], detections[j]["box"], detections[j]["confidence"])

        return self.objects
