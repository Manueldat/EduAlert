import os
import unittest
import joblib
import pandas as pd
from fastapi.testclient import TestClient
from .app import app
from .common import ROOT, FEATURES, probabilities
from .train import generate,SPLITS

class MLTest(unittest.TestCase):
    def test_temporal_and_student_separation(self):
        d=generate(20);parts=[d[d.split==s] for s in SPLITS]
        for i,a in enumerate(parts):
            for b in parts[i+1:]:self.assertFalse(set(a.student_key)&set(b.student_key))
        for a,b in zip(parts,parts[1:]):self.assertLess(a.target_time.max(),b.feature_time.min())
        self.assertTrue(d[d.term==1].gpa_drop.isna().all())
        self.assertNotIn('y_next_demo_warning',FEATURES)

    def test_api_contract_auth_and_model_parity(self):
        sample={'gpa':2.3,'cpa':2.6,'gpa_drop':.6,'failed_ratio':3/18,'debt_credits':9,'progress_ratio':.75,'prereq_failures':0,'warning_count':0}
        with TestClient(app) as client:
            self.assertEqual(client.post('/predict',json={'features':sample}).status_code,401)
            headers={'X-ML-Key':os.environ['ML_API_KEY']}
            r=client.post('/predict',headers=headers,json={'features':sample});self.assertEqual(r.status_code,200,r.text)
            local=joblib.load(ROOT/'artifacts/model.joblib')
            expected=probabilities(local,pd.DataFrame([sample],columns=FEATURES))[0]
            self.assertAlmostEqual(r.json()['probability'],expected,places=12)
            self.assertEqual(len(r.json()['explanation']),8)
            sample['gpa']=5
            self.assertEqual(client.post('/predict',headers=headers,json={'features':sample}).status_code,422)

if __name__=='__main__':unittest.main()
