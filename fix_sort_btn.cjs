const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace('id="timeline-sort-btn" class="btn btn-outline btn-sm" style="background: var(--color-bg-card);', 'id="timeline-sort-btn" class="btn btn-outline btn-sm" style="background: transparent;');

fs.writeFileSync('index.html', html);
