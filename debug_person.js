import fs from 'fs';
async function test() {
  const allData = JSON.parse(fs.readFileSync('./data/kinshipIndex.json'));
  console.log(!!allData['388']);
  console.log(!!allData['194']);
}
test();
