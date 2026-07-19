const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldLogic = `                        if (evt.original.yearStr && (!d && !m)) {
                            dateStr = escapeHtml(evt.original.yearStr);
                        } else {
                            if (d) dateStr += escapeHtml(d) + " ";
                            if (m) dateStr += escapeHtml(getMonthNameSafe(m, !d)) + " ";
                            if (y) dateStr += escapeHtml(y);
                        }`;

const newLogic = `                        if (evt.original.yearStr && (!d && !m)) {
                            dateStr = escapeHtml(evt.original.yearStr);
                        } else {
                            if (d) dateStr += escapeHtml(d) + " ";
                            if (m) dateStr += escapeHtml(getMonthNameSafe(m, !d)) + " ";
                            if (evt.original.yearStr) {
                                dateStr += escapeHtml(evt.original.yearStr);
                            } else if (y) {
                                dateStr += escapeHtml(y);
                            }
                        }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
