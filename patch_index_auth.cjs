const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const oldFetch = `        fetch('/api/config', {
            cache: "no-store"
        })`;

const newFetch = `        fetch('/api/config', {
            cache: "no-store",
            headers: {
                'Authorization': 'Bearer ' + (localStorage.getItem('auth_token') || '')
            }
        })`;

code = code.replace(oldFetch, newFetch);
fs.writeFileSync('index.html', code);
console.log('Fixed index.html auth fetch');
