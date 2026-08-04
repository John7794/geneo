import { mergeMultipageRecords } from './scripts/utils/recordUtils.js';
const data = [
  { record_id: "rec_128_r_4-1", images: "img1" },
  { record_id: "rec_128_r_4-2", images: "img2" }
];
console.log(mergeMultipageRecords(data));
