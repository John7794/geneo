import re

with open('index.html', 'r') as f:
    html = f.read()

# Add Back button and back button logic
old_header = """<div style="display: flex; align-items: center; gap: 10px;">
						<i class="ri-bar-chart-2-line text-primary" style="font-size: 24px;"></i>
						<h1 style="font-size: 20px; font-weight: bold; margin: 0;">Аналітика родоводу</h1>
					</div>
					<button id="btn-close-analytics" class="btn-icon" title="Закрити">
						<i class="ri-close-line" style="font-size: 24px;"></i>
					</button>"""

new_header = """<div style="display: flex; align-items: center; gap: 10px;">
						<button id="btn-back-analytics" class="btn-icon" title="Назад">
							<i class="ri-arrow-left-line" style="font-size: 24px;"></i>
						</button>
						<i class="ri-bar-chart-2-line text-primary" style="font-size: 24px;"></i>
						<h1 style="font-size: 20px; font-weight: bold; margin: 0;">Аналітика родоводу</h1>
					</div>
					<button id="btn-close-analytics" class="btn-icon" title="Закрити">
						<i class="ri-close-line" style="font-size: 24px;"></i>
					</button>"""

html = html.replace(old_header, new_header)

old_places = """<!-- Popular Places -->
						<div class="analytics-section">
							<h4 style="margin-bottom: 10px; border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">Населені пункти</h4>
							<ul id="analytics-places" style="padding-left: 20px; margin: 0;"></ul>
						</div>
					</div>"""

new_places = """<!-- Popular Places -->
						<div class="analytics-section">
							<h4 style="margin-bottom: 10px; border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">Населені пункти</h4>
							<ul id="analytics-places" style="padding-left: 20px; margin: 0;"></ul>
						</div>
						
						<!-- Causes of Death -->
						<div class="analytics-section">
							<h4 style="margin-bottom: 10px; border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">Причини смерті</h4>
							<ul id="analytics-deaths" style="padding-left: 20px; margin: 0;"></ul>
						</div>

						<!-- Religions -->
						<div class="analytics-section">
							<h4 style="margin-bottom: 10px; border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">Релігії</h4>
							<ul id="analytics-religions" style="padding-left: 20px; margin: 0;"></ul>
						</div>

						<!-- Coats of arms -->
						<div class="analytics-section">
							<h4 style="margin-bottom: 10px; border-bottom: 1px solid var(--color-border); padding-bottom: 5px;">Герби</h4>
							<ul id="analytics-coats" style="padding-left: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 15px;"></ul>
						</div>
					</div>"""

html = html.replace(old_places, new_places)

with open('index.html', 'w') as f:
    f.write(html)
print("index patched")
