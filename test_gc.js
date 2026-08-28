import './test_env.js';
import { fetchAllData } from './scripts/api/api.js';

async function run() {
    const p = await fetchAllData({ offlineMode: true, localDataPath: './data' });
    const person = p.getPersonDetails('776');
    console.log('GC:', JSON.stringify(person._family.grandChildrenMap, null, 2));
    console.log('MARRIAGE:', JSON.stringify(person._family.marriage, null, 2));
}

run().catch(console.error);
