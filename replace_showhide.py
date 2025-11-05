# replace_showhide.py
import re, os, sys, shutil

root = '.'  # ejecuta desde la raíz del proyecto
patterns = [
    (re.compile(r'\bthis\.showLoading\s*\('), 'Loading.show('),
    (re.compile(r'\bthis\.hideLoading\s*\('), 'Loading.hide('),
]

# Ajusta include_dir si quieres limitar aún más:
include_prefixes = ('frontend/', 'static/', 'templates/')

for dirpath, dirnames, filenames in os.walk(root):
    # evita venv y node_modules
    if any(p in dirpath for p in ('/venv/', '\\venv\\', '/.venv/', '\\.venv\\', '/node_modules/', '\\node_modules\\')):
        continue
    for filename in filenames:
        if not filename.endswith(('.js', '.html', '.ts', '.jsx')):
            continue
        rel = os.path.relpath(os.path.join(dirpath, filename), root)
        if not rel.startswith(include_prefixes):
            # opcional: sólo modificar archivos en frontend/; quita esta condición si quieres más alcance
            continue
        path = os.path.join(dirpath, filename)
        with open(path, 'r', encoding='utf-8') as fh:
            text = fh.read()
        new_text = text
        for pat, repl in patterns:
            new_text = pat.sub(repl, new_text)
        if new_text != text:
            # backup
            bak = path + '.bak'
            shutil.copy2(path, bak)
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(new_text)
            print('Modificado:', rel, '-- backup:', os.path.relpath(bak, root))