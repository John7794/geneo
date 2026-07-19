const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

code = code.replace(
    /\$\{getCenturyRoman\(currentCentury\)\} століття/g,
    '${getCenturyRoman(currentCentury)} ${i18n.t("time.century") || "століття"}'
);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
