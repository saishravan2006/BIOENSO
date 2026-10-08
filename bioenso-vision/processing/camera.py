import cv2
import threading
import time
import platform

class ThreadedCamera:
    def __init__(self, src=0):
        # On Windows, force DSHOW backend for webcam to avoid MSMF -1072875772 error
        if isinstance(src, int) and platform.system() == "Windows":
            self.cap = cv2.VideoCapture(src, cv2.CAP_DSHOW)
        else:
            # For RTSP: set 5-second timeout so fallback is instant instead of 30s
            self.cap = cv2.VideoCapture()
            self.cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
            self.cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
            self.cap.open(src)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.ret, self.frame = self.cap.read()
        self.stopped = False
        
        # Start the background thread
        self.thread = threading.Thread(target=self.update, args=())
        self.thread.daemon = True
        self.thread.start()

    def update(self):
        # Keep reading frames in the background so the buffer doesn't fill up
        while True:
            if self.stopped:
                return
            self.ret, self.frame = self.cap.read()

    def read(self):
        return self.ret, self.frame

    def release(self):
        self.stopped = True
        self.thread.join()
        self.cap.release()
        
    def isOpened(self):
        return self.cap.isOpened()
        
    def get(self, prop_id):
        return self.cap.get(prop_id)
