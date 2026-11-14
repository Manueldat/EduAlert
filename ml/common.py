import json
import os
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / 'shared/demo-policy.json').read_text(encoding='utf-8'))
FEATURES = ['gpa', 'cpa', 'gpa_drop', 'failed_ratio', 'debt_credits', 'progress_ratio', 'prereq_failures', 'warning_count']
LABELS = ['GPA học kỳ', 'CPA tích lũy', 'Mức giảm GPA', 'Tỷ lệ tín chỉ không đạt', 'Tín chỉ còn nợ', 'Tỷ lệ tiến độ', 'Số lần rớt môn tiên quyết', 'Lịch sử cảnh cáo đã nhập']

def load_env():
    env = ROOT / '.env'
    if env.exists():
        for line in env.read_text().splitlines():
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ.setdefault(key, value.strip().strip('"'))

def label_event(f):
    return int(f['gpa'] < POLICY['warningGpa'] or f['cpa'] < POLICY['warningCpa'] or
               f['failed_ratio'] > POLICY['warningFailedRatio'] or f['debt_credits'] > POLICY['warningDebtCredits'])

def probabilities(bundle, frame):
    raw = np.clip(bundle['model'].predict_proba(frame)[:, 1], 1e-6, 1-1e-6)
    return bundle['calibrator'].predict_proba(np.log(raw / (1-raw)).reshape(-1, 1))[:, 1]

def risk_level(probability, thresholds):
    return 'RED' if probability >= thresholds['red'] else 'YELLOW' if probability >= thresholds['yellow'] else 'GREEN'
