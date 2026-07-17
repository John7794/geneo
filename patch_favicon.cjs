const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/<link rel="icon" type="image\/svg\+xml" href="\/assets\/favicon-[^"]+\.svg" \/>/g, '<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />');

fs.writeFileSync('index.html', code);
console.log('Fixed favicon link');
