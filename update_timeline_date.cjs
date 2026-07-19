const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const oldFunc = `const getMonthNameSafe = (monthNum) => {
                        const months = i18n.t("time.monthsGenitive");
                        return Array.isArray(months) ? months[monthNum] || "" : "";
                    };`;

const newFunc = `const getMonthNameSafe = (monthNum, isNominative = false) => {
                        const key = isNominative ? "time.monthsNominative" : "time.monthsGenitive";
                        const months = i18n.t(key);
                        return Array.isArray(months) ? months[monthNum] || "" : "";
                    };`;

code = code.replace(oldFunc, newFunc);

const oldDateLogic = `                        if (d) dateStr += escapeHtml(d) + " ";
                        if (m) dateStr += escapeHtml(getMonthNameSafe(m)) + " ";
                        if (y) dateStr += escapeHtml(y);
                        
                        if (evt.original.isOldStyle) {
                            let oldStr = "";
                            if (evt.original.day) oldStr += escapeHtml(evt.original.day) + " ";
                            if (evt.original.month) oldStr += escapeHtml(getMonthNameSafe(evt.original.month)) + " ";
                            oldStr += i18n.t("time.oldStyle") || "за ст. ст.";
                            dateStr += " <span class='event-date--old-style' style='color: var(--color-text-muted); font-size: 0.9em;'>(" + oldStr + ")</span>";
                        }`;

const newDateLogic = `                        if (evt.original.yearStr && (!d && !m)) {
                            dateStr = escapeHtml(evt.original.yearStr);
                        } else {
                            if (d) dateStr += escapeHtml(d) + " ";
                            if (m) dateStr += escapeHtml(getMonthNameSafe(m, !d)) + " ";
                            if (y) dateStr += escapeHtml(y);
                        }
                        
                        if (evt.original.isOldStyle) {
                            let oldStr = "";
                            if (evt.original.day) oldStr += escapeHtml(evt.original.day) + " ";
                            if (evt.original.month) oldStr += escapeHtml(getMonthNameSafe(evt.original.month, !evt.original.day)) + " ";
                            oldStr += i18n.t("time.oldStyle") || "за ст. ст.";
                            dateStr += "<br><span class='event-date--old-style' style='color: var(--color-text-muted); font-size: 0.9em; display: inline-block; margin-top: 2px;'>(" + oldStr + ")</span>";
                        }`;

code = code.replace(oldDateLogic, newDateLogic);

const oldHtml = `                            <li style="display: flex; padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px;">
                                
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-weight: 600; font-size: 15px; margin-bottom: 2px; color: var(--color-text-main);">\${dateStr}</div>
                                    <div style="font-weight: 500; font-size: 14px; color: var(--color-text-muted); margin-bottom: 4px;">\${typeLabels[evt.type] || evt.type}</div>
                                    <div style="font-size: 14px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">\${namesStr}</div>
                                </div>
                            </li>`;

const newHtml = `                            <li style="padding: 12px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 8px; list-style: none;">
                                <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px; color: var(--color-text-main); line-height: 1.3;">\${dateStr}</div>
                                <div style="font-size: 14px; color: var(--color-text-main); line-height: 1.4;">
                                    <span style="color: var(--color-text-muted); font-weight: 500;">\${typeLabels[evt.type] || evt.type}:</span> \${namesStr}
                                </div>
                            </li>`;

code = code.replace(oldHtml, newHtml);

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
