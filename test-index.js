import fs from 'fs';
const data = JSON.parse(fs.readFileSync('data/kinshipIndex.json', 'utf8'));
console.log("510", data["510"]);
console.log("1020", data["1020"]);
