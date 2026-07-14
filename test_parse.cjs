const fs = require('fs');
const content = fs.readFileSync('data/db/uk/death.csv', 'utf8');
const lines = content.split('\n');
const headers = lines[0].split(',');
console.log("headers:", headers);
for(let i=1; i<lines.length; i++) {
  if(!lines[i].trim()) continue;
  const vals = lines[i].split(','); // naive
  console.log("d_cause at index", headers.indexOf("d_cause"), ":", vals[headers.indexOf("d_cause")]);
}
