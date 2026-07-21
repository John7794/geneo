const fs = require('fs');

let css = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');
css = css.replace('/* overflow-x: clip; */', 'overflow-x: clip;');
fs.writeFileSync('css/components/interaction/analytics.css', css);
