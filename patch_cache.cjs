const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    /res\.sendFile\(path\.join\(distPath, "index\.html"\)\);/g,
    "res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');\n    res.setHeader('Pragma', 'no-cache');\n    res.setHeader('Expires', '0');\n    res.setHeader('Surrogate-Control', 'no-store');\n    res.sendFile(path.join(distPath, \"index.html\"));"
);

fs.writeFileSync('server.ts', code);
console.log('Added no-cache headers');
