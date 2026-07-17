const fs = require('fs');
let code = fs.readFileSync('css/components/profile/profile-header.css', 'utf8');
code = code.replace(/\.btn-tree\s*\{[^}]*\}/g, (match) => {
    return match.replace(/border-radius:\s*24px;/, 'border-radius: 50px !important;');
});
fs.writeFileSync('css/components/profile/profile-header.css', code);
console.log('Fixed btn-tree');
