
import unittest
from processing.classifier import VocalisationClassifier
from processing.evaluation import EvaluationHarness
import json
import os

class TestClassifier(unittest.TestCase):
    def setUp(self):
        self.clf = VocalisationClassifier()
        
    def test_vocalization_candidate(self):
        feats = {"rmsAmplitude": 0.1, "spectralCentroid": 500}
        res = self.clf.classify(feats)
        self.assertEqual(res["predictedClass"], "ACOUSTIC_PATTERN_CANDIDATE")
        self.assertIn("limitations", res)
        
    def test_background_sound(self):
        feats = {"rmsAmplitude": 0.1, "spectralCentroid": 2000}
        res = self.clf.classify(feats)
        self.assertEqual(res["predictedClass"], "BACKGROUND_SOUND")
        
    
    def test_feature_rule_heuristic_match(self):
        # Even if a sound falls into the 200-1200Hz range (like a tractor engine),
        # the heuristic explicitly returns an ACOUSTIC_PATTERN_CANDIDATE,
        # never claiming it is a verified cattle vocalisation.
        feats = {"rmsAmplitude": 0.5, "spectralCentroid": 400}
        res = self.clf.classify(feats)
        self.assertEqual(res["predictedClass"], "ACOUSTIC_PATTERN_CANDIDATE")
        self.assertNotIn("VOCALIZATION", res["predictedClass"])
        self.assertTrue(any("heuristic match, not biological probability" in lim for lim in res["limitations"]))

    def test_unknown(self):
        res = self.clf.classify(None)
        self.assertEqual(res["predictedClass"], "UNKNOWN")

class TestEvaluation(unittest.TestCase):
    def test_eval_manifest(self):
        harness = EvaluationHarness()
        manifest = [
            {"sessionId": "S1", "file": "f1.wav", "label": "ACOUSTIC_PATTERN_CANDIDATE"},
            {"sessionId": "S2", "file": "f2.wav", "label": "BACKGROUND_SOUND"}
        ]
        with open("temp_manifest.json", "w") as f:
            json.dump(manifest, f)
            
        res = harness.evaluate_manifest("temp_manifest.json", VocalisationClassifier())
        self.assertEqual(res["evaluated_sessions"], 2)
        self.assertEqual(res["total_samples"], 2)
        os.remove("temp_manifest.json")

if __name__ == '__main__':
    unittest.main()
