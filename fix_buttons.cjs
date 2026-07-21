const fs = require('fs');

let css = fs.readFileSync('css/components/interaction/analytics.css', 'utf8');
css = css.replace('height: 32px !important;', 'height: 38px !important;');
fs.writeFileSync('css/components/interaction/analytics.css', css);

let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('height: 32px;', 'height: 38px;').replace('height: 32px;', 'height: 38px;'); // if any in inline style
fs.writeFileSync('index.html', html);
