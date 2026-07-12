import re
with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

# Remove religions block
pattern = r"\s*// Religions.*?containerReligions\.innerHTML = topReligions\.map.*?join\(\"\"\);\s*}\s*"
js = re.sub(pattern, "\n", js, flags=re.DOTALL)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("Religions removed from js")
