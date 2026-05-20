import { readFileSync } from 'fs';

const csv = readFileSync('data/db/uk/basic.csv', 'utf8');
const lines = csv.split('\n');
const headers = lines[0].split(',').map(h => h.trim()); // trims '\r'

const data = [];
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const values = lines[i].split(',');
  const row = {};
  for (let j = 0; j < headers.length; j++) {
    row[headers[j]] = values[j] ? values[j].trim() : '';
  }
  data.push(row);
}

console.log('Parsed headers:', headers);
console.log('Row 0:', data[0]);
