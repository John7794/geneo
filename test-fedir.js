global.localStorage = { getItem: () => "uk", setItem: () => {} };
import fs from "fs";
import Papa from "papaparse";
import { processRecords } from "./scripts/utils/profileUtils.js";
import { mergeMultipageRecords } from "./scripts/utils/recordUtils.js";

const content = fs.readFileSync("data/db/uk/records.csv", "utf8");
const parsed = Papa.parse(content, {header: true});
const recordsFor618 = processRecords(parsed.data, "618", {});
const merged = mergeMultipageRecords(recordsFor618);
console.log(merged.map(m => ({ id: m.record_id, title: m.title, images: m.images })));
