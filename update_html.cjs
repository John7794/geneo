const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = `<div id="timeline-chart-period-filter" style="display: none; align-items: center; gap: 8px;"><input type="number" id="timeline-chart-min-year" class="btn-outline btn-sm" style="width: 70px; height: 38px; background: transparent; color: var(--color-text-main); border: 1px solid var(--color-border); border-radius: 8px; padding: 0 8px;" placeholder="Від" title="Початковий рік"><span style="color: var(--color-text-muted);">-</span><input type="number" id="timeline-chart-max-year" class="btn-outline btn-sm" style="width: 70px; height: 38px; background: transparent; color: var(--color-text-main); border: 1px solid var(--color-border); border-radius: 8px; padding: 0 8px;" placeholder="До" title="Кінцевий рік"><button id="timeline-chart-apply-btn" class="btn btn-sm" style="height: 38px; background: var(--color-primary); color: white; border: none; border-radius: 8px;">Застосувати</button></div>`;

const replacement = `<div id="timeline-chart-period-filter" style="display: none; align-items: center; gap: 8px;">
    <input type="number" id="timeline-chart-min-year" class="btn-outline btn-sm" style="width: 70px; height: 38px; background: transparent; color: var(--color-text-main); border: 1px solid var(--color-border); border-radius: 8px; padding: 0 8px;" placeholder="Рік" title="Початковий рік">
    <span id="timeline-chart-dash" style="color: var(--color-text-muted); display: none;">-</span>
    <input type="number" id="timeline-chart-max-year" class="btn-outline btn-sm" style="width: 70px; height: 38px; background: transparent; color: var(--color-text-main); border: 1px solid var(--color-border); border-radius: 8px; padding: 0 8px; display: none;" placeholder="До" title="Кінцевий рік">
    <button id="timeline-chart-apply-btn" class="btn btn-sm" style="display: none; height: 38px; background: var(--color-primary); color: white; border: none; border-radius: 8px;">Застосувати</button>
</div>`;

html = html.replace(target, replacement);
fs.writeFileSync('index.html', html, 'utf8');
console.log("HTML updated");
