const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// Just define currentCentury and tocCenturies at the top of renderTimeline
code = code.replace(
    'let html = "";\n                const filteredEvents',
    'let tocCenturies = new Set();\n                let html = "";\n                const filteredEvents'
);

// We need getCenturyRoman available both inside the else block and below it for tocLinksHtml.
// Let's also define it at the top.
code = code.replace(
    'let tocCenturies = new Set();',
    `const getCenturyRoman = (c) => {
                    const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                    return romanNumerals[c] || c;
                };
                let tocCenturies = new Set();`
);

// Now remove the inner definitions of currentCentury and tocCenturies
code = code.replace(
    /let currentCentury = null;\s+let tocCenturies = new Set\(\);/,
    'let currentCentury = null;'
);

// Remove the inner definition of getCenturyRoman
code = code.replace(
    /const getCenturyRoman = \(c\) => \{[\s\S]*?return romanNumerals\[c\] \|\| c;\s+\};/,
    ''
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
