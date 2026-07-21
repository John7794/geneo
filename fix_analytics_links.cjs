const fs = require('fs');

let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

// 1. Fix inline onclick
js = js.replace(/<a href="#" onclick="event\.preventDefault\(\); if\(window\.app && window\.app\.navigateToId\) \{ window\.app\.navigateToId\('\$\{obj\.id\}', false, 'profile'\); \}"/g, 
                '<a href="?id=${encodeURIComponent(obj.id)}&view=profile"');

// 2. Fix href="#" for person links
js = js.replace(/<a href="#" class="analytics-person-link" data-pid="\$\{p\.person\.id\}"/g,
                '<a href="?id=${encodeURIComponent(p.person.id)}&view=profile" class="analytics-person-link" data-pid="${p.person.id}"');

// 3. Remove event listeners for analytics-person-link
// This regex will match the links.forEach block. Let's do it manually with string replacement to be safer.

const target1 = `                    const links = newContainerEvents.querySelectorAll('.analytics-person-link');
                    links.forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                            if (pid && window.app && window.app.navigateToId) {
                                window.app.navigateToId(pid, false, 'profile');
                            }
                        });
                    });`;
js = js.replace(target1, `// delegated to router`);

const target2 = `                chartContainer.querySelectorAll('.analytics-person-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                        if (pid && window.app && window.app.navigateToId) {
                            window.app.navigateToId(pid, false, 'profile');
                        }
                    });
                });`;
js = js.replace(target2, `// delegated to router`);

const target3 = `                            resultsBox.querySelectorAll('.analytics-person-link').forEach(link => {
                                link.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                                    if (pid && window.app && window.app.navigateToId) {
                                        window.app.navigateToId(pid, false, 'profile');
                                    }
                                });
                            });`;
js = js.replace(target3, `// delegated to router`);

const target4 = `                if (timelineList) timelineList.querySelectorAll('.analytics-person-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const pid = e.target.getAttribute('data-pid') || e.currentTarget.getAttribute('data-pid');
                        if (pid && window.app && window.app.navigateToId) {
                            window.app.navigateToId(pid, false, 'profile');
                        }
                    });
                });`;
js = js.replace(target4, `// delegated to router`);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log('Fixed analytics links.');
