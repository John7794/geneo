const fs = require('fs');
let js = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const targetStr = `                    const bYear = birthData.year || "?";
                    const dYear = deathData.year || "?";
                    if (isApprox) lifespansApprox.push({age, id, name: fullName, bYear, dYear});
                    else lifespansConfirmed.push({age, id, name: fullName, bYear, dYear});`;

const replacementStr = `                    const bYear = birthData.year || "?";
                    const dYear = deathData.year || "?";
                    let exactDays = null;
                    if (!isApprox) {
                        const bDate = new Date(Date.UTC(birthData.year, birthData.month - 1, birthData.day));
                        const dDate = new Date(Date.UTC(deathData.year, deathData.month - 1, deathData.day));
                        const ms = dDate.getTime() - bDate.getTime();
                        if (ms > 0) exactDays = Math.floor(ms / (1000 * 60 * 60 * 24));
                    }
                    if (isApprox) lifespansApprox.push({age, id, name: fullName, bYear, dYear, exactDays});
                    else lifespansConfirmed.push({age, id, name: fullName, bYear, dYear, exactDays});`;

js = js.replace(targetStr, replacementStr);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', js);
console.log("Success");
