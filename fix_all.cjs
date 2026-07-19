const fs = require('fs');

// 1. Update uk.json
let loc = fs.readFileSync('data/locales/uk.json', 'utf8');
if (!loc.includes('"century": "століття"')) {
    loc = loc.replace('"time": {', '"time": {\n        "century": "століття",');
    fs.writeFileSync('data/locales/uk.json', loc);
}

// 2. Update analyticsManager.js
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Update createSortRenderer list items
code = code.replace(
    /<li style="list-style: none; display: inline-flex; flex-direction: column; background: var\(--color-bg-card\); border: 1px solid var\(--color-border-light\); border-radius: 8px; padding: 4px 12px; font-size: 14px; color: var\(--color-text-main\);">/g,
    '<li style="list-style: none; display: inline-flex; flex-direction: column; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; padding: 12px; font-size: 15px; line-height: 1.4; color: var(--color-text-main);">'
);

// Update causes of death items
code = code.replace(
    /border: 1px solid var\(--color-border-light\); border-radius: 8px; overflow: hidden;"/g,
    'border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;"'
);

// Update Century rendering
const oldCenturyHtml = `                                html += \`
                                    <li style="list-style: none; margin-top: 16px; margin-bottom: 8px;">
                                        <div style="margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text-main); background: var(--color-bg-sub); padding: 4px 12px; border-radius: 4px; display: inline-block;">\${getCenturyRoman(currentCentury)} \${i18n.t("time.century") || "століття"}</div>
                                    </li>
                                \`;`;

const newCenturyHtml = `                                html += \`
                                    <li style="list-style: none; margin-top: 24px; margin-bottom: 16px; display: flex; align-items: center; width: 100%;">
                                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light);"></div>
                                        <div style="margin: 0 16px; font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.5px;">\${getCenturyRoman(currentCentury)} \${i18n.t("time.century") || "століття"}</div>
                                        <div style="flex-grow: 1; height: 1px; background: var(--color-border-light);"></div>
                                    </li>
                                \`;`;

code = code.replace(oldCenturyHtml, newCenturyHtml);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
