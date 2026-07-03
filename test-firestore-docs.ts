import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import "dotenv/config";

let adminConfig: any = { projectId: "geneo-b8e63" };
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
        const cred = JSON.parse(raw.replace(/\\n/g, '\n'));
        adminConfig.credential = admin.credential.cert(cred);
    } catch (e: any) {}
}
admin.initializeApp(adminConfig);
const fdb = getFirestore(admin.app(), 'ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1');

async function test() {
   const docs = await fdb.collection('db_files').get();
   console.log("Docs:", docs.docs.map(d => d.id).join(", "));
}
test().catch(console.error);
