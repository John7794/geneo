const fs = require('fs');
let code = fs.readFileSync('data/locales/uk.json', 'utf8');

code = code.replace(
    '"monthsGenitive": [',
    '"monthsNominative": [\n            "",\n            "січень",\n            "лютий",\n            "березень",\n            "квітень",\n            "травень",\n            "червень",\n            "липень",\n            "серпень",\n            "вересень",\n            "жовтень",\n            "листопад",\n            "грудень"\n        ],\n        "monthsGenitive": ['
);

fs.writeFileSync('data/locales/uk.json', code);
console.log('Added monthsNominative');
