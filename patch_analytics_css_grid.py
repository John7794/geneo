with open('css/components/interaction/analytics.css', 'r') as f:
    css = f.read()

old_grid = """.analytics-names-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}"""
new_grid = """.analytics-names-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    align-items: start;
}
.analytics-names-grid h5 {
    margin-top: 0;
    margin-bottom: 8px;
}"""

if "align-items: start" not in css:
    css = css.replace(old_grid, new_grid)
    with open('css/components/interaction/analytics.css', 'w') as f:
        f.write(css)
    print("Grid CSS patched")
