const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(
    '<select id="timeline-filter-type" class="btn btn-outline" style="background: var(--color-bg-card); color: var(--color-text-main); border-color: var(--color-border); padding: 8px 16px; font-size: 14px; border-radius: 8px;">',
    '<select id="timeline-filter-type" class="btn btn-outline btn-sm" style="background: var(--color-bg-card); color: var(--color-text-main); border-color: var(--color-border);">'
);

code = code.replace(
    '<button id="timeline-sort-btn" class="btn btn-outline" style="background: var(--color-bg-card); color: var(--color-text-main); border-color: var(--color-border); padding: 8px 16px; border-radius: 8px;">',
    '<button id="timeline-sort-btn" class="btn btn-outline btn-sm" style="background: var(--color-bg-card); color: var(--color-text-main); border-color: var(--color-border); padding: 0 12px;">'
);

fs.writeFileSync('index.html', code);
console.log('Successfully updated buttons');
