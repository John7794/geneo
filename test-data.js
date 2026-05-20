import { readFileSync } from 'fs';

const csv = readFileSync('data/db/uk/basic.csv', 'utf8');
const lines = csv.split('\n');
const headers = lines[0].split(',').map(h => h.trim());

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

// test personUtils
import { resolveRealId } from './scripts/utils/personUtils.js';
// We can't easily mock the entire engine. Let's just look at data[0]
console.log(data[0]);
