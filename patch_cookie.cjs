const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "const cookie = (req.headers.cookie || '').split(';').find(c => c.trim().startsWith('auth_email='));\n  if (cookie) {\n    const emailOrPhone = decodeURIComponent(cookie.split('=')[1]);",
    "const emailOrPhone = req.cookies && req.cookies.auth_email;\n  if (emailOrPhone) {"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed cookie parsing');
