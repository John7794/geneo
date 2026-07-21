const fs = require('fs');

let content = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

content = content.replace(
    'let axisHtml = \'<div style="position: sticky; top: 0; height: 30px; border-bottom: 1px solid var(--color-border); z-index: 100; background-color: var(--color-bg-card);">\';',
    'let axisHtml = \'<div id="analytics-timeline-axis" style="position: sticky; top: 0; height: 30px; border-bottom: 1px solid var(--color-border); z-index: 100; background-color: var(--color-bg-card); cursor: pointer;">\';'
);

content = content.replace(
    /<div id="chart-decade-\$\{d\}" style="position: absolute; left: \$\{px\}px; top: 0; transform: translateX\(-50%\); text-align: center;">\s*<div style="font-size: 10px; color: var\(--color-text-muted\); padding-bottom: 2px;">\$\{text\}<\/div>\s*<div style="margin: 0 auto; width: 1px; height: \$\{markerHeight\}px; border-left: \$\{borderLeft\};"><\/div>\s*<\/div>/g,
    `<div id="chart-decade-\${d}" style="position: absolute; left: \${px}px; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
                            <div style="font-size: 10px; color: var(--color-text-muted); line-height: 1;">\${text}</div>
                            <div style="margin-top: 2px; width: 1px; height: \${markerHeight}px; border-left: \${borderLeft};"></div>
                        </div>`
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', content);
