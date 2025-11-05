# replace_showhide.py
import re, os, shutil

root = '.'  # ejecutar desde la raiz del repo
include_prefix = 'frontend'  # solo modificar archivos bajo frontend/
patterns = [
    (re.compile(r'\bthis\.showLoading\s*\('), 'Loading.show('),
    (re.compile(r'\bthis\.hideLoading\s*\('), 'Loading.hide('),
]

for dirpath, dirnames, filenames in os.walk(root):
    # skip envs
    if any(x in dirpath for x in ('/venv/', '\\venv\\', '/.venv/', '\\.venv\\', '/node_modules/', '\\node_modules\\')):
        continue
    for fname in filenames:
        if not fname.endswith(('.js', '.html', '.ts', '.jsx')):
            continue
        full = os.path.join(dirpath, fname)
        rel = os.path.relpath(full, root)
        if not rel.startswith(include_prefix + os.sep):
            continue
        with open(full, 'r', encoding='utf-8') as f:
            text = f.read()
        new_text = text
        for pat, repl in patterns:
            new_text = pat.sub(repl, new_text)
        if new_text != text:
            bak = full + '.bak'
            shutil.copy2(full, bak)
            with open(full, 'w', encoding='utf-8') as f:
                f.write(new_text)
            print(f"Modificado: {rel}  (backup: {os.path.relpath(bak, root)})")
