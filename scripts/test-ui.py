"""Optional browser test: pip install playwright; python -m playwright install chromium.
Run after db:prepare, seed, train and build. Uses disposable demo data only.
"""
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root=Path(__file__).resolve().parents[1]
env={**os.environ,'PORT':'3400','ML_URL':'http://127.0.0.1:8400','ALLOWED_ORIGINS':'http://127.0.0.1:3400'}
procs=[]; errors=[]; passed=[]
images=Path(tempfile.mkdtemp(prefix='edualert-ui-'))
try:
    procs.append(subprocess.Popen([sys.executable,'-m','uvicorn','ml.app:app','--host','127.0.0.1','--port','8400'],cwd=root,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL))
    procs.append(subprocess.Popen(['node','backend/src/server.mjs'],cwd=root,env=env,stdout=subprocess.DEVNULL))
    for url in ['http://127.0.0.1:8400/health','http://127.0.0.1:3400/api/health']:
        for attempt in range(80):
            try:
                with urllib.request.urlopen(url,timeout=1) as response:
                    if response.status==200:break
            except Exception:time.sleep(.25)
        else:raise RuntimeError('Server not ready: '+url)
    with sync_playwright() as p:
        executable=os.getenv('CHROMIUM_PATH')
        browser=p.chromium.launch(headless=True,executable_path=executable or None,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':1000},locale='vi-VN')
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto('http://127.0.0.1:3400/')
        page.get_by_label('Email',exact=True).fill('admin@edualert.local')
        page.get_by_label('Mật khẩu',exact=True).fill('EduAlert!2026')
        page.screenshot(path=str(images/'login.png'))
        page.get_by_role('button',name='Đăng nhập',exact=True).click()
        expect(page.get_by_role('heading',name='Đồng hành cùng sinh viên')).to_be_visible()
        passed.append('login')
        page.get_by_role('button',name='Đánh giá toàn bộ').click()
        expect(page.get_by_role('button',name='Đánh giá toàn bộ')).to_be_enabled(timeout=90000)
        expect(page.locator('.toast')).to_contain_text('Đã đánh giá')
        page.screenshot(path=str(images/'dashboard.png'),full_page=True)
        passed.append('dashboard + batch real ML')
        page.locator('nav').get_by_role('link',name='Sinh viên',exact=True).click()
        page.get_by_label('Tìm sinh viên',exact=True).fill('DEMO001')
        student_link=page.locator('a.person').filter(has_text='DEMO001')
        expect(student_link).to_be_visible()
        student_link.click()
        expect(page.get_by_role('heading',name='Sinh viên An')).to_be_visible()
        expect(page.get_by_text('Điểm nguy cơ từ mô hình huấn luyện trên dữ liệu giả lập.',exact=True)).to_be_visible()
        page.screenshot(path=str(images/'student.png'),full_page=True)
        passed.append('search + student profile + prediction')
        page.get_by_role('button',name='Nhập điểm',exact=True).click()
        expect(page.get_by_role('heading',name='Cập nhật học kỳ')).to_be_visible()
        page.get_by_role('button',name='Lưu & đánh giá lại').click()
        expect(page.get_by_role('heading',name='Cập nhật học kỳ')).not_to_be_visible(timeout=15000)
        passed.append('save grade form + real prediction')
        note=page.get_by_label('Nội dung tư vấn').first
        note.fill('Kiểm thử UI: đã trao đổi kế hoạch học lại môn nợ.')
        page.get_by_label('Trạng thái xử lý').first.select_option('IN_PROGRESS')
        page.get_by_role('button',name='Lưu tư vấn').first.click()
        expect(page.get_by_text('Kiểm thử UI: đã trao đổi kế hoạch học lại môn nợ.',exact=True).first).to_be_visible()
        page.reload()
        expect(page.get_by_text('Kiểm thử UI: đã trao đổi kế hoạch học lại môn nợ.',exact=True).first).to_be_visible()
        passed.append('persist advising note across reload')
        for link,heading in [('Trung tâm cảnh báo','Biến dấu hiệu thành hành động'),('Mô hình dự báo','Dự báo có căn cứ'),('Quản trị dữ liệu','Thiết lập không gian học tập')]:
            page.locator('nav').get_by_role('link',name=link,exact=True).click()
            expect(page.get_by_role('heading',name=heading,exact=True)).to_be_visible()
            passed.append(link)
        page.set_viewport_size({'width':390,'height':844})
        page.goto('http://127.0.0.1:3400/')
        expect(page.get_by_role('heading',name='Đồng hành cùng sinh viên')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Mobile page overflows'
        page.screenshot(path=str(images/'mobile.png'),full_page=True)
        passed.append('mobile no page overflow')
        assert not errors,errors
        browser.close()
    result={'result':'PASS','passed':passed,'pageErrors':errors}
    (root/'reports/ui-tests.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=False,indent=2));print('Temporary screenshots: '+str(images))
finally:
    for proc in procs:proc.terminate()
    for proc in procs:
        try:proc.wait(timeout=8)
        except subprocess.TimeoutExpired:proc.kill()
