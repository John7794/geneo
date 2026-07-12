import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

old_general_html = """			<div class="analytics-stat-card">
				<div class="analytics-general-value">${maleCount} / ${femaleCount}${unknownCount > 0 ? ' / ' + unknownCount : ''}</div>
				<div class="analytics-stat-label">Чоловіків / Жінок${unknownCount > 0 ? ' / Невідомо' : ''}</div>
			</div>"""

new_general_html = """			<div class="analytics-stat-card" style="justify-content: flex-start; padding-top: 15px;">
				<div class="analytics-general-value">${maleCount} / ${femaleCount}</div>
				<div class="analytics-stat-label">Чоловіків / Жінок</div>
			</div>"""

js = js.replace(old_general_html, new_general_html)

old_stat_card = """			<div class="analytics-stat-card">
				<div class="analytics-general-value">${totalPeople}</div>
				<div class="analytics-stat-label">Осіб у дереві</div>
			</div>"""

new_stat_card = """			<div class="analytics-stat-card" style="justify-content: flex-start; padding-top: 15px;">
				<div class="analytics-general-value">${totalPeople}</div>
				<div class="analytics-stat-label">Осіб у дереві</div>
			</div>"""
js = js.replace(old_stat_card, new_stat_card)

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
