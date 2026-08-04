const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM(`
<div class="record-card js-gallery-item" data-full="img1" data-group="archival-records">
    <div class="hidden meta-data"><div class="meta-link">link1</div></div>
</div>
<div class="record-card js-gallery-item" data-full="img2" data-group="archival-records">
    <div class="hidden meta-data"><div class="meta-link"></div></div>
</div>
`);
const document = dom.window.document;
let items = [];
Array.from(document.querySelectorAll('[data-group="archival-records"]')).forEach(el => {
    const rawUrls = el.getAttribute("data-full");
    const urls = rawUrls.split(";").map(u => u.trim()).filter(Boolean);
    const allLinksText = el.querySelector(".meta-link")?.textContent || "";
    const linksArray = allLinksText.split(";").map(l => l.trim()).filter(Boolean);
    urls.forEach((url, idx) => {
        const specificLink = linksArray[idx] || linksArray[0] || "";
        items.push({ url, link: specificLink });
    });
});
console.log(items);
