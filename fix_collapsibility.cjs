const fs = require('fs');
let jsCode = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// For Places
jsCode = jsCode.replace(/const isDesktop = window\.innerWidth >= 1200;\s*if \(\!isDesktop\) \{\s*body\.style\.display = 'none';\s*if \(icon\) icon\.style\.transform = 'rotate\(0deg\)';\s*\}/g, `const isDesktop = window.innerWidth >= 1200;
                if (!isDesktop) {
                    body.style.display = 'none';
                    if (icon) icon.style.transform = 'rotate(0deg)';
                } else {
                    header.style.cursor = 'default';
                }`);

jsCode = jsCode.replace(/header\.addEventListener\('click', \(\) => \{\s*const isOpen = body\.style\.display === 'block';/g, `header.addEventListener('click', () => {
                    if (window.innerWidth >= 1200) return;
                    const isOpen = body.style.display === 'block';`);


fs.writeFileSync('scripts/components/interaction/analyticsManager.js', jsCode);
