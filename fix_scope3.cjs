const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// I will just make sure getCenturyRoman is defined in the top of renderTimeline.
if (!code.includes('const getCenturyRoman = (c) => {') || code.indexOf('const getCenturyRoman') > code.indexOf('let tocCenturies')) {
    code = code.replace(
        'let tocCenturies = new Set();',
        `const getCenturyRoman = (c) => {
                    const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                    return romanNumerals[c] || c;
                };
                let tocCenturies = new Set();`
    );
}

// Remove any inner definitions again just in case
code = code.replace(
    /const getCenturyRoman = \(c\) => \{\s*const romanNumerals[^}]+\};\s*\}?\s*let currentCentury = null;/g,
    'let currentCentury = null;'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
