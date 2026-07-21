const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
    'id="analytics-timeline-chart" style="display: none; width: 100%; max-height: 70vh; overflow-x: auto; overflow-y: auto; background: var(--color-bg-card); border-radius: 12px; border: 1px solid var(--color-border); margin-top: 12px; padding: 16px;"',
    'id="analytics-timeline-chart" style="display: none; width: 100%; max-height: 70vh; overflow-x: auto; overflow-y: auto; background: var(--color-bg-card); border-radius: 12px; border: 1px solid var(--color-border); margin-top: 12px;"'
);

fs.writeFileSync('index.html', html);
