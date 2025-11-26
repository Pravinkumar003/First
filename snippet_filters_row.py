from pathlib import Path
lines=Path('src/pages/Students.jsx').read_text().splitlines()
for i in range(890, 932):
    print(f"{i+1}: {lines[i]}")
