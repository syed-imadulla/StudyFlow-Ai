import os
import glob

html_files = glob.glob('/home/syed-imadulla/Desktop/StudyFlow Ai/frontend/*.html')

injection = """  <script src="src/js/completion/completionEvents.js"></script>
  <script src="src/js/completion/completionRenderer.js"></script>
  <script src="src/js/completion/completionModal.js"></script>"""

for file in html_files:
    with open(file, 'r') as f:
        content = f.read()
    
    if "completionEvents.js" in content:
        continue
        
    if "src/js/store.js" in content:
        content = content.replace('<script src="src/js/store.js"></script>', '<script src="src/js/store.js"></script>\n' + injection)
        with open(file, 'w') as f:
            f.write(content)
        print(f"Patched {os.path.basename(file)}")

