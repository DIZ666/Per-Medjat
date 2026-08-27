import os

workspace_dir = r'c:\Users\diazp\OneDrive\Escritorio\biblioteca virtual'

# Canonical source can be index.html or Index.html
src_index = os.path.join(workspace_dir, 'index.html')
src_Index = os.path.join(workspace_dir, 'Index.html')

if os.path.exists(src_index):
    source_path = src_index
else:
    source_path = src_Index

with open(source_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Sincronizar en ambas variantes para que funcione nativamente en PWA / GitHub Pages y Google Apps Script
targets = [
    os.path.join(workspace_dir, 'index.html'),
    os.path.join(workspace_dir, 'Index.html'),
    os.path.join(workspace_dir, 'local_testing.html'),
    os.path.join(workspace_dir, 'docs', 'index.html')
]

for t in targets:
    os.makedirs(os.path.dirname(t), exist_ok=True)
    with open(t, 'w', encoding='utf-8') as f:
        f.write(content)

print("index.html (raíz), Index.html (Apps Script), local_testing.html y docs/index.html (PWA) sincronizados exitosamente!")
