const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldCode = `                let html = "";
                const filteredEvents = allTimelineEvents.filter(e => currentFilter === "all" || e.type === currentFilter);
                
                if (filteredEvents.length === 0) {
                    html = "<li style='padding: 16px; text-align: center; color: var(--color-text-muted);'>Немає подій для відображення</li>";
                } else {
                    const getCenturyRoman = (c) => {
                        const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                        return romanNumerals[c] || c;
                    };
                    
                    let currentCentury = null;
                    let tocCenturies = new Set();`;

const newCode = `                let html = "";
                const filteredEvents = allTimelineEvents.filter(e => currentFilter === "all" || e.type === currentFilter);
                
                const getCenturyRoman = (c) => {
                    const romanNumerals = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV"];
                    return romanNumerals[c] || c;
                };
                
                let currentCentury = null;
                let tocCenturies = new Set();
                
                if (filteredEvents.length === 0) {
                    html = "<li style='padding: 16px; text-align: center; color: var(--color-text-muted);'>Немає подій для відображення</li>";
                } else {`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
