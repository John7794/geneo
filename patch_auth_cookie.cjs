const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    "res.cookie('auth_email', emailOrPhone.toLowerCase().trim(), { httpOnly: true, path: '/', sameSite: 'none', secure: true });",
    "res.cookie('auth_email', emailOrPhone.toLowerCase().trim(), { httpOnly: true, path: '/', sameSite: 'none', secure: true, partitioned: true });\n    res.cookie('auth_email_client', emailOrPhone.toLowerCase().trim(), { httpOnly: false, path: '/', sameSite: 'none', secure: true, partitioned: true });"
);

code = code.replace(
    "const emailOrPhone = req.cookies && req.cookies.auth_email;",
    "let emailOrPhone = req.cookies && req.cookies.auth_email;\n  if (!emailOrPhone && req.headers.authorization) {\n    const parts = req.headers.authorization.split(' ');\n    if (parts.length === 2 && parts[0] === 'Bearer') emailOrPhone = parts[1];\n  }"
);

code = code.replace(
    "res.json({ success: true });",
    "res.json({ success: true, token: emailOrPhone.toLowerCase().trim() });"
);

fs.writeFileSync('server.ts', code);
console.log('Fixed server auth');
