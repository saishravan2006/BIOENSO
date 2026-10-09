
import numpy as np
import wave
from typing import Dict, Any, Tuple, Optional
import os
import time

class AudioQualityConfig:
    def __init__(self):
        self.silence_rms_threshold = 1e-4
        self.clip_threshold = 0.99

class AcousticFeatureExtractor:
    def __init__(self, config: AudioQualityConfig = None):
        self.config = config or AudioQualityConfig()
        
    def _read_wav(self, file_path: str) -> Tuple[int, int, np.ndarray]:
        with wave.open(file_path, 'rb') as wf:
            channels = wf.getnchannels()
            sample_rate = wf.getframerate()
            sampwidth = wf.getsampwidth()
            n_frames = wf.getnframes()
            
            data_bytes = wf.readframes(n_frames)
            
            if sampwidth == 2:
                data = np.frombuffer(data_bytes, dtype=np.int16)
            elif sampwidth == 4:
                data = np.frombuffer(data_bytes, dtype=np.int32)
            elif sampwidth == 1:
                data = np.frombuffer(data_bytes, dtype=np.uint8)
            else:
                raise ValueError("Unsupported sample width")
                
            if channels > 1:
                data = data.reshape(-1, channels)
            return sample_rate, channels, data

    def process_file(self, file_path: str) -> Dict[str, Any]:
        try:
            if not os.path.exists(file_path):
                return self._error_obs("File not found")
                
            sample_rate, channels, data = self._read_wav(file_path)
            
            if data.size == 0:
                return self._error_obs("Empty audio data")
                
            if data.dtype == np.int16:
                data = data.astype(np.float32) / 32768.0
            elif data.dtype == np.int32:
                data = data.astype(np.float32) / 2147483648.0
            elif data.dtype == np.uint8:
                data = (data.astype(np.float32) - 128.0) / 128.0
                
            if channels > 1:
                data = np.mean(data, axis=1)
                
            duration = len(data) / sample_rate
            
            if duration < 0.1:
                return self._error_obs("Audio duration too short")
                
            features, quality = self.extract_features_and_quality(data, sample_rate)
            
            return {
                "observationId": f"obs_audio_{int(time.time()*1000)}",
                "farmId": None,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "ingestionTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "source": "RECORDED_FIXTURE",
                "durationSeconds": float(duration),
                "sampleRate": sample_rate,
                "channels": channels,
                "algorithmVersion": "0.1",
                "quality": quality,
                "features": features,
                "limitations": [
                    "Raw waveform amplitude is not calibrated sound-pressure level.",
                    "Do not report dB SPL without appropriate microphone calibration.",
                    "Do not call spectral activity an animal vocalisation unless validated."
                ]
            }
        except Exception as e:
            return self._error_obs(str(e))
            
    def extract_features_and_quality(self, data: np.ndarray, sample_rate: int) -> Tuple[Optional[Dict[str, float]], str]:
        rms = float(np.sqrt(np.mean(data**2)))
        max_val = float(np.max(np.abs(data)))
        
        if rms < self.config.silence_rms_threshold:
            return None, "SILENT"
            
        if max_val >= self.config.clip_threshold:
            return None, "CLIPPED"
            
        zcr = float(np.sum(np.abs(np.diff(np.sign(data)))) / (2 * len(data)) * sample_rate)
        
        freqs = np.fft.rfftfreq(len(data), 1/sample_rate)
        fft_mag = np.abs(np.fft.rfft(data))
        
        sum_mag = np.sum(fft_mag)
        if sum_mag == 0:
            sum_mag = 1e-10
            
        centroid = float(np.sum(freqs * fft_mag) / sum_mag)
        bandwidth = float(np.sqrt(np.sum(((freqs - centroid)**2) * fft_mag) / sum_mag))
        
        features = {
            "rmsAmplitude": rms,
            "zeroCrossingRate": zcr,
            "spectralCentroid": centroid,
            "spectralBandwidth": bandwidth,
            "eventCounts": {}
        }
        
        return features, "VALID"

    def _error_obs(self, error_msg: str) -> Dict[str, Any]:
        return {
            "observationId": f"obs_audio_err_{int(time.time()*1000)}",
            "farmId": None,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "ingestionTimestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "source": "UNKNOWN",
            "durationSeconds": 0,
            "sampleRate": 0,
            "channels": 0,
            "algorithmVersion": "0.1",
            "quality": "INVALID",
            "features": None,
            "limitations": [error_msg]
        }
