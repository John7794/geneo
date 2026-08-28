import fs from 'fs';
async function test() {
  const allData = JSON.parse(fs.readFileSync('./data/kinshipIndex.json'));
  const safeKinship = allData['776'];
  console.log('GC Map:', safeKinship.gc_map);
  console.log('Spouses:', JSON.stringify(safeKinship.m_map));
}
test();
