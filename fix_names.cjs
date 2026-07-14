const fs = require('fs');
let code = fs.readFileSync('scripts/components/interaction/analyticsManager.js', 'utf8');

const regex = /let p1Html = \`<a href="\?id=\\$\{encodeURIComponent\(evt\.person\.id\)\}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\\$\{evt\.person\.id\}" style="color: var\(--color-primary\); text-decoration: none;">\\$\{escapeHtml\(evt\.person\.name\)\}<\/a>\`;\s*let p2Html = "";\s*if \(evt\.type === "marriage" && evt\.spouse\) \{\s*p2Html = \` та <a href="\?id=\\$\{encodeURIComponent\(evt\.spouse\.id\)\}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\\$\{evt\.spouse\.id\}" style="color: var\(--color-primary\); text-decoration: none;">\\$\{escapeHtml\(evt\.spouse\.name\)\}<\/a>\`;\s*\}/;

const newStr = `let p1Html = \`<a href="?id=\${encodeURIComponent(evt.person.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.person.id}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(getPersonName(evt.person.id))}</a>\`;
                                let p2Html = "";
                                if (evt.type === "marriage" && evt.spouse) {
                                    p2Html = \` та <a href="?id=\${encodeURIComponent(evt.spouse.id)}&view=profile" class="analytics-person-link js-stop-prop" data-pid="\${evt.spouse.id}" style="color: var(--color-primary); text-decoration: none;">\${escapeHtml(getPersonName(evt.spouse.id))}</a>\`;
                                }`;

if (regex.test(code)) {
    code = code.replace(regex, newStr);
    fs.writeFileSync('scripts/components/interaction/analyticsManager.js', code);
    console.log("Success");
} else {
    console.log("Failed");
}
