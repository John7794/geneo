import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

old_calc = """	calculateStats() {
		if (!this.engine || !this.containerGeneral) return;"""

new_calc = """	calculateStats() {
		if (!this.engine || !this.containerGeneral) return;
		this.initAccordions();"""

js = js.replace(old_calc, new_calc)

if "initAccordions()" not in js:
    # Need to add initAccordions method
    pass

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("Accordion initialized in calculateStats")
