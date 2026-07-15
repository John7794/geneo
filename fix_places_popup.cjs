const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

code = code.replace(/id="btn-mobile-sort-places" onclick="document\.getElementById\('mobile-sort-popup-places'\)\.style\.display='flex'"/g, `id="btn-mobile-sort-places" onclick="document.getElementById('mobile-sort-popup-places').classList.add('show')"`);

code = code.replace(/id="mobile-sort-popup-places" class="popup-overlay" style="display: none; z-index: 9999;" onclick="if\(event\.target===this\) this\.style\.display='none'"/g, `id="mobile-sort-popup-places" class="popup-overlay" style="z-index: 9999;" onclick="if(event.target===this) this.classList.remove('show')"`);

code = code.replace(/onclick="document\.getElementById\('mobile-sort-popup-places'\)\.style\.display='none'"/g, `onclick="document.getElementById('mobile-sort-popup-places').classList.remove('show')"`);

// Also fix the JS event listeners that try to hide popups
code = code.replace(/b\.closest\('\.popup-overlay'\)\.style\.display='none'/g, `b.closest('.popup-overlay').classList.remove('show')`);
code = code.replace(/btn\.closest\('\.popup-overlay'\)\.style\.display = 'none'/g, `btn.closest('.popup-overlay').classList.remove('show')`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
console.log("Success fixing places popup in JS");
