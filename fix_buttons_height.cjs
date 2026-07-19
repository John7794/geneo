const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(
    '<select id="timeline-filter-type" class="btn btn-outline btn-sm" style="background: var(--color-bg-card); color: var(--color-text-main); border-color: var(--color-border);">',
    '<select id="timeline-filter-type" class="btn btn-outline btn-sm" style="background: var(--color-bg-card); color: var(--color-text-main); border-color: var(--color-border); height: 32px; box-sizing: border-box; padding-top: 0; padding-bottom: 0;">'
);

code = code.replace(
    '<button id="timeline-sort-btn" class="btn btn-outline btn-sm" style="background: var(--color-bg-card); color: var(--color-text-main); border-color: var(--color-border); padding: 0 12px;">',
    '<button id="timeline-sort-btn" class="btn btn-outline btn-sm" style="background: var(--color-bg-card); color: var(--color-text-main); border-color: var(--color-border); padding: 0 12px; height: 32px; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;">'
);

fs.writeFileSync('index.html', code);
console.log('Successfully updated buttons height');
