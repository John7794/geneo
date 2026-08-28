import fs from 'fs';
import { Processor } from './scripts/api/index.js';

const allData = {
  db: {
    basic: [],
    familyList: []
  },
  kinship: JSON.parse(fs.readFileSync('./data/kinshipIndex.json')),
  _indexes: {}
};

// We don't need real db to check just how processor maps grandChildrenMap, wait, processor uses getPerson. Let's just import the real database?
