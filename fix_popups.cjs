const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// Fix Surnames popup
code = code.replace(/id="btn-mobile-sort-s" onclick="document\.getElementById\('mobile-sort-popup-s'\)\.style\.display='flex'"/g, `id="btn-mobile-sort-s" onclick="document.getElementById('mobile-sort-popup-s').classList.add('show')"`);

code = code.replace(/id="mobile-sort-popup-s" class="popup-overlay" style="display: none; z-index: 9999;" onclick="if\(event\.target===this\) this\.style\.display='none'"/g, `id="mobile-sort-popup-s" class="popup-overlay" style="z-index: 9999;" onclick="if(event.target===this) this.classList.remove('show')"`);

code = code.replace(/onclick="document\.getElementById\('mobile-sort-popup-s'\)\.style\.display='none'"/g, `onclick="document.getElementById('mobile-sort-popup-s').classList.remove('show')"`);

// Fix Names popup
code = code.replace(/id="btn-mobile-sort" onclick="document\.getElementById\('mobile-sort-popup'\)\.style\.display='flex'"/g, `id="btn-mobile-sort" onclick="document.getElementById('mobile-sort-popup').classList.add('show')"`);

code = code.replace(/id="mobile-sort-popup" class="popup-overlay" style="display: none; z-index: 9999;" onclick="if\(event\.target===this\) this\.style\.display='none'"/g, `id="mobile-sort-popup" class="popup-overlay" style="z-index: 9999;" onclick="if(event.target===this) this.classList.remove('show')"`);

code = code.replace(/onclick="document\.getElementById\('mobile-sort-popup'\)\.style\.display='none'"/g, `onclick="document.getElementById('mobile-sort-popup').classList.remove('show')"`);

fs.writeFileSync('index.html', code);
console.log("Success fixing popups in index.html");
