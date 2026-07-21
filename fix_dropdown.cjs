const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');
const oldSelect = `<select id="timeline-filter-type" class="btn btn-outline btn-sm" style="color: var(--color-text-main); border-color: var(--color-border); height: 38px; box-sizing: border-box; padding-top: 0; padding-bottom: 0;">
                                        <option value="all">Всі події</option>
                                        <option value="birth">Народження</option>
                                        <option value="baptism">Хрещення</option>
                                        <option value="marriage">Шлюби</option>
                                        <option value="death">Смерті</option>
                                        <option value="funeral">Поховання</option>
                                    </select>`;
                                    
const newSelect = `<div id="timeline-filter-wrapper" style="position: relative; display: inline-flex; align-items: center;">
                                        <select id="timeline-filter-type" class="btn btn-outline btn-sm" style="color: var(--color-text-main); border-color: var(--color-border); height: 38px; box-sizing: border-box; padding-top: 0; padding-bottom: 0; padding-right: 32px; padding-left: 12px; appearance: none; -webkit-appearance: none; background: var(--color-bg-card); cursor: pointer; width: 100%;">
                                            <option value="all">Всі події</option>
                                            <option value="birth">Народження</option>
                                            <option value="baptism">Хрещення</option>
                                            <option value="marriage">Шлюби</option>
                                            <option value="death">Смерті</option>
                                            <option value="funeral">Поховання</option>
                                        </select>
                                        <i class="ri-arrow-down-s-line timeline-filter-icon" style="position: absolute; right: 12px; pointer-events: none; color: var(--color-text-main); transition: transform 0.2s ease;"></i>
                                    </div>`;

if (html.includes(oldSelect)) {
    html = html.replace(oldSelect, newSelect);
    fs.writeFileSync('index.html', html);
    console.log('Fixed HTML select inline styles.');
} else {
    console.log('HTML select not found exactly as expected.');
}

// 2. Update CSS
let css = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');
const oldCssRule = `#timeline-filter-type {
    appearance: none;
    -webkit-appearance: none;
    background-color: var(--color-bg-card) !important;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important;
    background-position: right 8px center !important;
    background-size: 16px !important;
    padding-right: 32px !important;
    padding-left: 12px !important;
    cursor: pointer;
}`;

const newCssRule = `
#timeline-filter-type:focus + .timeline-filter-icon {
    transform: rotate(180deg);
}`;

if (css.includes(oldCssRule)) {
    css = css.replace(oldCssRule, newCssRule);
    fs.writeFileSync('css/components/interaction/analytics.css', css);
    console.log('Fixed CSS.');
} else {
    console.log('Old CSS rule not found exactly. Trying regex...');
    const regex = /#timeline-filter-type\s*\{[\s\S]*?\}/;
    if (regex.test(css)) {
        css = css.replace(regex, newCssRule);
        fs.writeFileSync('css/components/interaction/analytics.css', css);
        console.log('Fixed CSS with regex.');
    } else {
        console.log('Failed to fix CSS.');
    }
}

// 3. Update JS
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');
js = js.replace('const filterTypeSelect = document.getElementById("timeline-filter-type");', 'const filterTypeSelect = document.getElementById("timeline-filter-wrapper") || document.getElementById("timeline-filter-type");');
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log('Fixed JS.');

