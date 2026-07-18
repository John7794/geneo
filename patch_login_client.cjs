const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldGoogleSuccess = `            if (res.ok) {
              window.location.href = '/';
            }`;

const newGoogleSuccess = `            if (res.ok) {
              const data = await res.json();
              if (data.token) localStorage.setItem('auth_token', data.token);
              window.location.href = '/';
            }`;

const oldFormSuccess = `          if (res.ok) {
            window.location.href = '/';
          }`;

const newFormSuccess = `          if (res.ok) {
            const data = await res.json();
            if (data.token) localStorage.setItem('auth_token', data.token);
            window.location.href = '/';
          }`;

code = code.replace(oldGoogleSuccess, newGoogleSuccess);
code = code.replace(oldFormSuccess, newFormSuccess);

fs.writeFileSync('server.ts', code);
console.log('Fixed client login code');
