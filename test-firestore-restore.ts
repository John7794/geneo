import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import "dotenv/config";

let adminConfig: any = { projectId: "geneo-b8e63" };
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
        adminConfig.credential = admin.credential.cert(JSON.parse(raw.replace(/\\n/g, '\n')));
    } catch (e: any) {}
}
if (!admin.apps.length) admin.initializeApp(adminConfig);
const fdb = getFirestore(admin.app(), 'ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1');

async function test() {
   const snap = await fdb.collection('db_files').get();
   console.log("Documents in db_files:");
   snap.docs.forEach(doc => console.log(doc.id));
}
test();
