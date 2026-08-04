const fs = require('fs');
const content = fs.readFileSync('./scripts/components/interaction/galleryManager.js', 'utf8');

const searchStr = `		allTriggers.forEach((el) => {
			const rawUrls =
				el.getAttribute("data-full") ||
				el.getAttribute("data-src") ||
				el.src ||
				"";
			const urls = rawUrls
				.split(";")
				.map((u) => u.trim())
				.filter(Boolean);

			if (el === trigger) clickedItemIndex = this.galleryItems.length;

			urls.forEach((url) => {
				this.galleryItems.push({
					src: url,
					caption: el.getAttribute("data-caption") || el.alt || "",
					archiveName: el.getAttribute("data-archive-name") || "",
					archiveRef: el.getAttribute("data-archive-ref") || "",
					archiveAddress: el.getAttribute("data-archive-address") || "",
						participants: el.getAttribute("data-participants") || "",
						date: el.getAttribute("data-date") || "",
						place: el.getAttribute("data-place") || "",
							placeUrl: el.getAttribute("data-place-url") || "",
						region: el.getAttribute("data-region") || "",
					transcription:
						el.querySelector(
							\`.\${UI_CLASSES.metaTranscription || "meta-transcription"}\`,
						)?.innerHTML || "",
					link:
						el.querySelector(\`.\${UI_CLASSES.metaLink || "meta-link"}\`)
							?.textContent || "",
				});
			});
		});`;

const replaceStr = `		allTriggers.forEach((el) => {
			const rawUrls =
				el.getAttribute("data-full") ||
				el.getAttribute("data-src") ||
				el.src ||
				"";
			const urls = rawUrls
				.split(";")
				.map((u) => u.trim())
				.filter(Boolean);

			if (el === trigger) clickedItemIndex = this.galleryItems.length;

			const allLinksText = el.querySelector(\`.\${UI_CLASSES.metaLink || "meta-link"}\`)?.textContent || "";
			const linksArray = allLinksText.split(";").map(l => l.trim()).filter(Boolean);

			urls.forEach((url, idx) => {
				const specificLink = linksArray[idx] || linksArray[0] || "";

				this.galleryItems.push({
					src: url,
					caption: el.getAttribute("data-caption") || el.alt || "",
					archiveName: el.getAttribute("data-archive-name") || "",
					archiveRef: el.getAttribute("data-archive-ref") || "",
					archiveAddress: el.getAttribute("data-archive-address") || "",
						participants: el.getAttribute("data-participants") || "",
						date: el.getAttribute("data-date") || "",
						place: el.getAttribute("data-place") || "",
							placeUrl: el.getAttribute("data-place-url") || "",
						region: el.getAttribute("data-region") || "",
					transcription:
						el.querySelector(
							\`.\${UI_CLASSES.metaTranscription || "meta-transcription"}\`,
						)?.innerHTML || "",
					link: specificLink,
				});
			});
		});`;

fs.writeFileSync('./scripts/components/interaction/galleryManager.js', content.replace(searchStr, replaceStr));
