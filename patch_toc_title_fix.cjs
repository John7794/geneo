const fs = require('fs');
let cssCode = fs.readFileSync('css/components/profile/profile-blocks.css', 'utf8');

const oldBlock = `.profile-toc-title {
	margin-top: 0;
	font-size: 14px;
	font-weight: 600;
	color: var(--color-text-main);
	margin-bottom: 16px;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	position: sticky;
	top: 0;
	background-color: var(--color-bg-body);
	z-index: 10;
	padding: 16px 0 8px 0;
}`;

const newBlock = `.profile-toc-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--color-text-main);
	text-transform: uppercase;
	letter-spacing: 0.5px;
	position: sticky;
	top: 0;
	background-color: var(--color-bg-body);
	z-index: 10;
	padding: 16px 0;
	margin: -16px 0 16px 0;
}`;

if (cssCode.includes(oldBlock)) {
    cssCode = cssCode.replace(oldBlock, newBlock);
    fs.writeFileSync('css/components/profile/profile-blocks.css', cssCode);
    console.log('Success');
} else {
    console.log('Not found');
}
