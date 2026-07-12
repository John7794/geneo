with open('css/components/interaction/analytics.css', 'r') as f:
    css = f.read()

new_css = """
.sort-mobile-popup {
    position: relative;
    display: none;
}
.sort-mobile-trigger {
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
}
.sort-mobile-menu {
    display: none;
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 100;
    min-width: 130px;
    margin-top: 4px;
    overflow: hidden;
}
.sort-mobile-menu div {
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
}
.sort-mobile-menu div:hover {
    background: var(--color-hover);
}
.sort-mobile-popup.open .sort-mobile-menu {
    display: block;
}

@media (max-width: 768px) {
    .analytics-sort-controls .sort-mobile-popup {
        display: inline-block !important;
    }
}
"""

if ".sort-mobile-popup {" not in css:
    css += new_css

with open('css/components/interaction/analytics.css', 'w') as f:
    f.write(css)
