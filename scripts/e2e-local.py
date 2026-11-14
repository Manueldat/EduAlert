"""Start API + real ML in one process environment, smoke test and shut down.
Run with the same Python that has ml/requirements.txt installed.
Requires npm run db:prepare, npm run db:seed, python -m ml.train first.
"""
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

root=Path(__file__).resolve().parents[1]
env={**os.environ,'PORT':'3300','ML_URL':'http://127.0.0.1:8300','SMOKE_BASE_URL':'http://127.0.0.1:3300'}
processes=[]
try:
    processes.append(subprocess.Popen([sys.executable,'-m','uvicorn','ml.app:app','--host','127.0.0.1','--port','8300'],cwd=root,env=env,stdout=subprocess.DEVNULL))
    processes.append(subprocess.Popen(['node','backend/src/server.mjs'],cwd=root,env=env,stdout=subprocess.DEVNULL))
    for url in ['http://127.0.0.1:8300/health','http://127.0.0.1:3300/api/health']:
        for attempt in range(80):
            try:
                with urllib.request.urlopen(url,timeout=1) as r:
                    if r.status==200:break
            except Exception:time.sleep(.25)
        else:raise RuntimeError(f'Server chưa sẵn sàng: {url}')
    result=subprocess.run(['node','scripts/smoke.mjs'],cwd=root,env=env,capture_output=True,text=True)
    (root/'reports/smoke.json').write_text(result.stdout,encoding='utf-8')
    print(result.stdout);print(result.stderr,file=sys.stderr)
    if result.returncode:raise RuntimeError('Smoke failed')
    # Verify built assets are actually served alongside authenticated APIs.
    with urllib.request.urlopen('http://127.0.0.1:3300/') as r:
        assert b'/assets/' in r.read(), 'Build frontend before this test'
    print('Frontend HTML + live API + real ML: PASS')
finally:
    for p in processes:p.terminate()
    for p in processes:
        try:p.wait(timeout=8)
        except subprocess.TimeoutExpired:p.kill()
