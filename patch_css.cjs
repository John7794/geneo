const fs = require('fs');
let code = fs.readFileSync('css/components/profile/profile-header.css', 'utf8');

code = code.replace(
  /\.btn-collapsed\s*\{/,
  `.btn-collapsed {
	border-radius: 50% !important;`
);

fs.writeFileSync('css/components/profile/profile-header.css', code);
console.log('Fixed btn-collapsed');
