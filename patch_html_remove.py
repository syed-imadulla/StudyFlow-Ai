import os

files_to_patch = [
    '/home/syed-imadulla/Desktop/StudyFlow Ai/frontend/settings.html',
    '/home/syed-imadulla/Desktop/StudyFlow Ai/frontend/analytics.html',
    '/home/syed-imadulla/Desktop/StudyFlow Ai/frontend/404.html',
    '/home/syed-imadulla/Desktop/StudyFlow Ai/frontend/focus.html'
]

for file in files_to_patch:
    if os.path.exists(file):
        with open(file, 'r') as f:
            lines = f.readlines()
        
        with open(file, 'w') as f:
            for line in lines:
                if 'completionEvents.js' in line or 'completionRenderer.js' in line or 'completionModal.js' in line:
                    continue
                f.write(line)
        print(f"Patched {os.path.basename(file)}")

