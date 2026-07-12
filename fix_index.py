import re
with open('index.html', 'r') as f:
    html = f.read()

# Fix the broken div structure
old = """<div class="analytics-names-grid">								<div>									<h5>Чоловічі</h5>									<ul id="analytics-names-m" class="analytics-list-none"></ul></div></div>								<div>									<h5>Жіночі</h5>									<ul id="analytics-names-f" class="analytics-list-none"></ul>								</div>							</div>"""

new = """<div class="analytics-names-grid">
								<div>
									<h5>Чоловічі</h5>
									<ul id="analytics-names-m" class="analytics-list-none"></ul>
								</div>
								<div>
									<h5>Жіночі</h5>
									<ul id="analytics-names-f" class="analytics-list-none"></ul>
								</div>
							</div></div>"""

html = html.replace(old, new)
with open('index.html', 'w') as f:
    f.write(html)
