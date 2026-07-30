const fs = require('fs');
let text = fs.readFileSync('./scripts/components/interaction/galleryManager.js', 'utf8');

const r1 = `		if (item.place && item.place.trim()) {
			tags.push({ text: item.place.trim(), icon: UI_CLASSES.icons?.mapPinLine || "ri-map-pin-line" });
		}`;
const rep1 = `		if (item.place && item.place.trim()) {
			tags.push({ text: item.place.trim(), icon: UI_CLASSES.icons?.mapPinLine || "ri-map-pin-line", url: item.placeUrl });
		}`;
text = text.replace(r1, rep1);

const r2Regex = /\t\tif \(tags\.length > 0\) \{\n\t\t\tconst tagsContent = tags\.map[^\n]+\n\t\t\ttagsHtml = `<div class="record-card-tags" style="margin-bottom: 12px;">\$\{tagsContent\}<\/div>`;\n\t\t\}/s;

const rep2 = `		if (tags.length > 0) {
			const tagsContent = tags.map(t => {
				const inner = \`<i class="\${escapeHtml(t.icon)}" aria-hidden="true"></i> \${escapeHtml(t.text)}\`;
				if (t.url && t.url.trim()) {
					return \`<a href="\${encodeURI(t.url.trim())}" target="_blank" rel="noopener noreferrer" class="record-tag" style="text-decoration:none; cursor:pointer;">\${inner}</a>\`;
				}
				return \`<span class="record-tag">\${inner}</span>\`;
			}).join("");
			tagsHtml = \`<div class="record-card-tags" style="margin-bottom: 12px;">\${tagsContent}</div>\`;
		}`;

text = text.replace(r2Regex, rep2);

fs.writeFileSync('./scripts/components/interaction/galleryManager.js', text);
