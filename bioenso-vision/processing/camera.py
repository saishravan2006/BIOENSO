import cv2
import threading
import time

class ThreadedCamera:
    def __init__(self, src=0):
        self.cap = cv2.VideoCapture(src)
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
