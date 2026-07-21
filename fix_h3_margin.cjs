const fs = require('fs');
let cssCode = fs.readFileSync('css/components/profile/profile-blocks.css', 'utf8');

cssCode = cssCode.replace(/\.profile-toc-title\s*\{/, '.profile-toc-title {\n\tmargin-top: 0;');

fs.writeFileSync('css/components/profile/profile-blocks.css', cssCode);
