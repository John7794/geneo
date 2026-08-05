const fem = false;
const mal = true;
const distS = 7;
const distT = 1;

const min = Math.min(distS, distT);
const diff = Math.abs(distS - distT);
const level = diff >= 2 ? min + 1 : min;

let prefix = "";
if (level === 1) prefix = "";
else if (level === 2)
	prefix = fem ? "Двоюрідна " : mal ? "Двоюрідний " : "Двоюрідні ";
else if (level === 3)
	prefix = fem ? "Троюрідна " : mal ? "Троюрідний " : "Троюрідні ";
else prefix = `${level}-юрідн${fem ? "а" : mal ? "ий" : "і"} `;

let base = "";
const count = diff - 2; // 6 - 2 = 4
const basePra = "Пра";
let pra = count === 1 ? basePra : `${basePra}(${count})`;
const rootBase = "дід";
base = pra + rootBase.toLowerCase();

console.log(`${prefix}${base.toLowerCase()}`);
