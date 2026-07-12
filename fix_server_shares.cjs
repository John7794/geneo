const fs = require('fs');
let ts = fs.readFileSync('server.ts', 'utf8');

ts = ts.replace(
    /const shares = snap\.docs\.map\(doc => \(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\)\);/,
    "const shares = snap.docs.map(doc => ({ id: doc.id, email: doc.data().value, ...doc.data() }));"
);
fs.writeFileSync('server.ts', ts);
console.log("Fixed API shares format");
