import re

with open('index.html', 'r') as f:
    html = f.read()

# find religions section
html = re.sub(r'<div class="analytics-section">\s*<h4>Віросповідання</h4>\s*<ul id="analytics-religions"[^>]*></ul>\s*</div>', '', html)

with open('index.html', 'w') as f:
    f.write(html)
print("Religions HTML removed")
