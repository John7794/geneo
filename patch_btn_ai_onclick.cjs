const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(
  /<button id="btn-ai" class="btn btn-icon js-open-ai" title="AI Асистент">/,
  `<button id="btn-ai" class="btn btn-icon js-open-ai" title="AI Асистент" onclick="document.getElementById('ai-overlay').classList.remove('hidden'); document.getElementById('ai-overlay').classList.add('show'); document.getElementById('ai-overlay').setAttribute('aria-hidden', 'false');">`
);

fs.writeFileSync('index.html', code);
console.log('Added inline onclick to btn-ai');
