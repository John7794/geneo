const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /                    <!-- Загальна кількість -->\s*<div style="background: var\(--color-bg-card\); border: 1px solid var\(--color-border\); border-radius: var\(--radius-md\); padding: 24px; display: flex; flex-direction: column;">\s*<div style="color: var\(--color-text-muted\); font-size: 14px; margin-bottom: 12px;">Загальна кількість<\/div>\s*<div style="font-size: 32px; font-weight: bold; color: var\(--color-primary\); margin-bottom: 8px;">\$\{totalPeople\}<\/div>\s*<div style="color: var\(--color-text-meta\); font-size: 14px; margin-top: auto;">Чоловіків: \$\{maleCount\} \/ Жінок: \$\{femaleCount\}<\/div>\s*<\/div>/m;

const newStr = `                    <!-- Загальна кількість -->
                    <div style="background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                        <div style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 12px;">Загальна кількість</div>
                        <div style="font-size: 32px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px;">\${totalPeople}</div>
                        <div style="color: var(--color-text-meta); font-size: 14px; margin-top: 12px;">Чоловіків: \${maleCount} / Жінок: \${femaleCount}</div>
                    </div>`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success centering card");
} else {
    console.log("Failed to find regex");
}
