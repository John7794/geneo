import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

# Add import
js = js.replace('import { calculateAgeAtDeath } from "../../utils/dateUtils.js";', 'import { calculateAgeAtDeath } from "../../utils/dateUtils.js";\nimport { resolveCoatUrl } from "../../utils/coatUtils.js";')

old_coat_img = """<img class="analytics-coat-img" src="./data/media/${c.url}" alt="${c.name}">"""
new_coat_img = """<img class="analytics-coat-img" src="${resolveCoatUrl(c.name, {coats: this.engine.db.coats})}" alt="${c.name}">"""

js = js.replace(old_coat_img, new_coat_img)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("Coats image patched")
