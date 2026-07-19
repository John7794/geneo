const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const getRomanCentury = `                    const getMonthNameSafe = (monthNum, isNominative = false) => {
                        const key = isNominative ? "time.monthsNominative" : "time.monthsGenitive";
                        const months = i18n.t(key);
                        return Array.isArray(months) ? months[monthNum] || "" : "";
                    };

                    const getCenturyRoman = (c) => {
                        const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                        return romanNumerals[c] || c;
                    };
                    
                    let currentCentury = null;`;

code = code.replace(
    /const getMonthNameSafe = \([^}]+\} *;/s,
    getRomanCentury
);

const beforeLoop = `                    filteredEvents.forEach(evt => {`;
const startOfLoop = `                    filteredEvents.forEach(evt => {
                        const y = evt.gregorian.year;
                        if (y && !isNaN(y)) {
                            const c = Math.ceil(y / 100);
                            if (c !== currentCentury) {
                                currentCentury = c;
                                html += \`
                                    <li style="list-style: none; margin-top: 16px; margin-bottom: 8px;">
                                        <div style="margin: 0; font-size: 16px; font-weight: 600; color: var(--color-text-main); background: var(--color-bg-sub); padding: 4px 12px; border-radius: 4px; display: inline-block;">\${getCenturyRoman(currentCentury)} століття</div>
                                    </li>
                                \`;
                            }
                        }
`;
code = code.replace(beforeLoop, startOfLoop);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
