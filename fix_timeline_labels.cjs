const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const innerLabels = `                    const typeLabels = {
                        birth: i18n.t("events.birth") || "Народження",
                        baptism: "Хрещення",
                        marriage: i18n.t("events.marriage") || "Шлюб",
                        death: i18n.t("events.death") || "Смерть",
                        funeral: "Поховання"
                    };`;

code = code.replace(innerLabels, '');

fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
