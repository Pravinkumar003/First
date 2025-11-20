from pathlib import Path
lines = Path('src/lib/mockApi.js').read_text().splitlines()
for i in range(630,690):
    print(f"{i+1}: {lines[i]}")
