const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldScript = `        document.getElementById('testLoginBtn').onclick = async () => {
          const res = await fetch('/api/auth-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrPhone: 'test' })
          });
          if (res.ok) {
            window.location.href = '/';
          }
        };`;

code = code.replace(oldScript, '');
fs.writeFileSync('server.ts', code);
console.log('Removed test login button listener');
