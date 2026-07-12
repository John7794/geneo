import re

with open('scripts/components/interaction/analyticsManager.js', 'r') as f:
    js = f.read()

old_general = """		this.containerGeneral.innerHTML = `
			<div style="background: var(--color-bg-sub); padding: 10px; border-radius: 8px; text-align: center;">
				<div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${totalPeople}</div>
				<div style="font-size: 12px; color: var(--color-text-muted);">Осіб у дереві</div>
			</div>
			<div style="background: var(--color-bg-sub); padding: 10px; border-radius: 8px; text-align: center;">
				<div style="font-size: 24px; font-weight: bold; color: var(--color-primary);">${maleCount} / ${femaleCount}</div>
				<div style="font-size: 12px; color: var(--color-text-muted);">Чоловіків / Жінок</div>
			</div>
		`;"""

new_general = """		this.containerGeneral.innerHTML = `
			<div class="analytics-stat-card">
				<div class="analytics-general-value">${totalPeople}</div>
				<div class="analytics-stat-label">Осіб у дереві</div>
			</div>
			<div class="analytics-stat-card">
				<div class="analytics-general-value">${maleCount} / ${femaleCount}${unknownCount > 0 ? ' / ' + unknownCount : ''}</div>
				<div class="analytics-stat-label">Чоловіків / Жінок${unknownCount > 0 ? ' / Невідомо' : ''}</div>
			</div>
		`;"""

js = js.replace(old_general, new_general)

# Fix link inline style
js = js.replace("""class="analytics-stat-label" style="text-decoration: underline;" """, """class="analytics-stat-label" style="text-decoration: underline;" """)

# Fix maxObj / minObj
old_maxmin = """					<div style="font-size: 20px;">${makeLink(maxObj)}</div>
					<div class="analytics-stat-label">Найбільша</div>
				</div>
				<div class="analytics-stat-card">
					<div style="font-size: 20px;">${makeLink(minObj)}</div>
					<div class="analytics-stat-label">Найменша</div>"""

new_maxmin = """					<div class="analytics-stat-value">${makeLink(maxObj)}</div>
					<div class="analytics-stat-label">Найбільша</div>
				</div>
				<div class="analytics-stat-card">
					<div class="analytics-stat-value">${makeLink(minObj)}</div>
					<div class="analytics-stat-label">Найменша</div>"""

js = js.replace(old_maxmin, new_maxmin)

# Fix empty lifespan string
js = js.replace("""<div style="grid-column: span 3; color: var(--color-text-muted); font-size: 14px;">Недостатньо даних для розрахунку тривалості життя</div>""", """<div class="analytics-stat-title">Недостатньо даних для розрахунку тривалості життя</div>""")

# Fix span cursor pointer
js = js.replace("""<span style="color: var(--color-text-muted); cursor: pointer;" data-sort="appearance">""", """<span data-sort="appearance">""")
js = js.replace("""<span style="color: var(--color-text-muted); cursor: pointer;" data-sort="alphabet">""", """<span data-sort="alphabet">""")
js = js.replace("""<span style="color: var(--color-text-muted); cursor: pointer;" data-sort="frequency">""", """<span data-sort="frequency">""")

with open('scripts/components/interaction/analyticsManager.js', 'w') as f:
    f.write(js)
print("Inline styles patched")
