const fs = require('fs');

// Fix HTML inline styles
let html = fs.readFileSync('index.html', 'utf8');
const oldSelect = `<select id="timeline-filter-type" class="btn btn-outline btn-sm" style="background: var(--color-bg-card); color: var(--color-text-main); border-color: var(--color-border); height: 38px; box-sizing: border-box; padding-top: 0; padding-bottom: 0;">`;
const newSelect = `<select id="timeline-filter-type" class="btn btn-outline btn-sm" style="color: var(--color-text-main); border-color: var(--color-border); height: 38px; box-sizing: border-box; padding-top: 0; padding-bottom: 0;">`;
if (html.includes(oldSelect)) {
    html = html.replace(oldSelect, newSelect);
    fs.writeFileSync('index.html', html);
    console.log('Fixed HTML select inline styles.');
}

// Fix CSS
let css = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');

const oldCssRule = `#timeline-filter-type {
    padding-right: 36px !important;
}`;

const newCssRule = `#timeline-filter-type {
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

if (css.includes(oldCssRule)) {
    css = css.replace(oldCssRule, newCssRule);
    fs.writeFileSync('css/components/interaction/analytics.css', css);
    console.log('Fixed CSS select styles.');
} else {
    // maybe it wasn't exactly that text
    css = css.replace(/#timeline-filter-type\s*\{\s*padding-right:\s*36px\s*!important;\s*\}/, newCssRule);
    fs.writeFileSync('css/components/interaction/analytics.css', css);
    console.log('Fixed CSS select styles with regex.');
}
