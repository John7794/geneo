const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

code = code.replace(/<h3 style="margin: 0; font-size: 20px; text-transform: capitalize; color: var\(--color-primary\);">\$\{mName\}<\/h3>/g, '<h3 style="margin: 0; font-size: 20px; text-transform: capitalize; color: var(--color-text-main);">${mName}</h3>');

code = code.replace(/<i class="ri-arrow-down-s-line analytics-event-month-icon" style="transition: transform 0\.3s; color: var\(--color-primary\); font-size: 24px; transform: rotate\(180deg\);"><\/i>/g, '<i class="ri-arrow-down-s-line analytics-event-month-icon analytics-mobile-only" style="transition: transform 0.3s; color: var(--color-text-main); font-size: 24px; transform: rotate(180deg);"></i>');

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
console.log('Fixed analyticsManager.js events header');
