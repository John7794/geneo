with open('css/components/interaction/analytics.css', 'r') as f:
    css = f.read()

old_card = """.analytics-stat-card {
    background: var(--color-bg-sub);
    padding: 10px;
    border-radius: 8px;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
}"""

new_card = """.analytics-stat-card {
    background: var(--color-bg-sub);
    padding: 10px;
    border-radius: 8px;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}"""

if "align-items: center;" not in css:
    css = css.replace(old_card, new_card)
    with open('css/components/interaction/analytics.css', 'w') as f:
        f.write(css)
    print("Card align patched")
