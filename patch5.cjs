const fs = require('fs');
const content = fs.readFileSync('./scripts/components/interaction/galleryManager.js', 'utf8');

const searchStr = `		if (item.link && item.link.trim()) {
			const openOriginalLabel = escapeHtml(
				i18n.t("ui.openOriginal") || "Відкрити оригінал"
			);
			const iconExternal = escapeHtml(
				UI_CLASSES.icons?.externalLinkLine || "ri-external-link-line"
			);
			
			const linksList = Array.from(new Set(item.link.split(";").map(l => l.trim()).filter(Boolean)));
			linksList.forEach((l, idx) => {
				const label = linksList.length > 1 ? \`\${openOriginalLabel} \${idx + 1}\` : openOriginalLabel;
				html += \`<a href="\${l}" target="_blank" rel="noopener noreferrer" class="\${UI_CLASSES.link || "meta-link"}" style="margin-right: 8px;"><i class="\${iconExternal}" aria-hidden="true"></i> \${label}</a>\`;
			});
		}`;

const replaceStr = `		if (item.link && item.link.trim()) {
			const openOriginalLabel = escapeHtml(
				i18n.t("ui.openOriginal") || "Відкрити оригінал",
			);
			const iconExternal = escapeHtml(
				UI_CLASSES.icons?.externalLinkLine || "ri-external-link-line",
			);
			html += \`<a href="\${encodeURI(item.link)}" target="_blank" rel="noopener noreferrer" class="\${UI_CLASSES.link || "meta-link"}"><i class="\${iconExternal}" aria-hidden="true"></i> \${openOriginalLabel}</a>\`;
		}`;

fs.writeFileSync('./scripts/components/interaction/galleryManager.js', content.replace(searchStr, replaceStr));
