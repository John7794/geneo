import re

with open('index.html', 'r') as f:
    html = f.read()

def replace_section(match):
    inner = match.group(2)
    return f'<div class="analytics-section">\n{match.group(1)}\n<div class="analytics-section-content">\n{inner}\n</div>\n</div>'

html = re.sub(r'<div class="analytics-section">\s*(<h4>.*?</h4>)\s*((?:(?!</div>\s*</div>)[\s\S])*?)\s*</div>', replace_section, html)

with open('index.html', 'w') as f:
    f.write(html)
print("Index.html patched for accordion content wrapper")
