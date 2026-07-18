const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const injectionPoint = "});"; // Need to be careful. Let's find the end of placeItems.forEach block.
// Wait, I can just replace `if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
//                });
//            });` with adding the links logic as well.

const target = `
                header.addEventListener('click', () => {
                    const isOpen = body.style.display === 'block';
                    body.style.display = isOpen ? 'none' : 'block';
                    if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                });
            });`;
            
const replacement = target + `
            this.containerPlaces.querySelectorAll('.js-scroll-to').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) {
                        const body = targetEl.querySelector('.analytics-place-body');
                        const icon = targetEl.querySelector('.analytics-place-icon');
                        if (body && body.style.display === 'none') {
                            body.style.display = 'block';
                            if (icon) icon.style.transform = 'rotate(180deg)';
                        }
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
`;

code = code.replace(target, replacement);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
console.log('Added scroll listeners for places');
