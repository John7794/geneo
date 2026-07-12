const fs = require('fs');
let lines = fs.readFileSync('server.ts', 'utf8').split('\n');
let imports = [];
let other = [];

for (let line of lines) {
    if (line.trim().startsWith('import ') && (line.includes(' from ') || line.includes('"dotenv/config"'))) {
        imports.push(line);
    } else {
        other.push(line);
    }
}
fs.writeFileSync('server.ts', imports.join('\n') + '\n' + other.join('\n'));
console.log("Moved imports to top");
