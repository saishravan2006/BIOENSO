
import unittest
import numpy as np
import wave
import os
import struct
from processing.audio import AcousticFeatureExtractor, AudioQualityConfig

class TestAudio(unittest.TestCase):
    def setUp(self):
        self.extractor = AcousticFeatureExtractor()
        self.test_dir = "test_fixtures_audio"
        os.makedirs(self.test_dir, exist_ok=True)
        
    def create_wav(self, name, data, sr=16000):
        path = os.path.join(self.test_dir, name)
        with wave.open(path, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(data.tobytes())
        return path

    def test_valid_audio(self):
        t = np.linspace(0, 1, 16000, False)
        data = (np.sin(2*np.pi*1000*t) * 10000).astype(np.int16)
        path = self.create_wav("valid.wav", data)
        
        res = self.extractor.process_file(path)
        self.assertEqual(res["quality"], "VALID")
        self.assertEqual(res["source"], "RECORDED_FIXTURE")
        self.assertIsNotNone(res["features"])
        self.assertTrue(900 < res["features"]["spectralCentroid"] < 1100)
        
    def test_silent_audio(self):
        data = np.zeros(16000, dtype=np.int16)
        path = self.create_wav("silent.wav", data)
        res = self.extractor.process_file(path)
        self.assertEqual(res["quality"], "SILENT")
        self.assertIsNone(res["features"])

    def test_clipped_audio(self):
        data = np.ones(16000, dtype=np.int16) * 32767
        path = self.create_wav("clipped.wav", data)
        res = self.extractor.process_file(path)
        self.assertEqual(res["quality"], "CLIPPED")
        self.assertIsNone(res["features"])
        
    def test_empty_audio(self):
        data = np.array([], dtype=np.int16)
        path = self.create_wav("empty.wav", data)
        res = self.extractor.process_file(path)
        self.assertEqual(res["quality"], "INVALID")
        
    def test_unsupported_format(self):
        res = self.extractor.process_file("nonexistent.wav")
        self.assertEqual(res["quality"], "INVALID")


    def test_8bit_audio(self):
        t = np.linspace(0, 1, 16000, False)
        data = (np.sin(2*np.pi*1000*t) * 60 + 128).astype(np.uint8)
        path = os.path.join(self.test_dir, "8bit.wav")
        with wave.open(path, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(1)
            wf.setframerate(16000)
            wf.writeframes(data.tobytes())
        res = self.extractor.process_file(path)
        self.assertEqual(res["quality"], "VALID")
        
    def test_32bit_audio(self):
        t = np.linspace(0, 1, 16000, False)
        data = (np.sin(2*np.pi*1000*t) * 1000000000).astype(np.int32)
        path = os.path.join(self.test_dir, "32bit.wav")
        with wave.open(path, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(4)
            wf.setframerate(16000)
            wf.writeframes(data.tobytes())
        res = self.extractor.process_file(path)
        self.assertEqual(res["quality"], "VALID")
        
    def test_stereo_audio(self):
        t = np.linspace(0, 1, 16000, False)
        data = (np.sin(2*np.pi*1000*t) * 10000).astype(np.int16)
        stereo_data = np.column_stack((data, data))
        path = os.path.join(self.test_dir, "stereo.wav")
        with wave.open(path, 'wb') as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(stereo_data.tobytes())
        res = self.extractor.process_file(path)
        self.assertEqual(res["quality"], "VALID")
        self.assertEqual(res["channels"], 2)

    def test_short_audio(self):
        # Under 0.1s duration limit
        t = np.linspace(0, 0.05, 800, False)
        data = (np.sin(2*np.pi*1000*t) * 10000).astype(np.int16)
        path = self.create_wav("short.wav", data)
        res = self.extractor.process_file(path)
        self.assertEqual(res["quality"], "INVALID")
        self.assertTrue("too short" in res["limitations"][0])

if __name__ == '__main__':
    unittest.main()
