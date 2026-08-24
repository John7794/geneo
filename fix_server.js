const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/import admin from "firebase-admin";/g, "import { initializeApp, getApp, cert } from 'firebase-admin/app';");
content = content.replace(/import \{ getFirestore \} from "firebase-admin\/firestore";/g, "import { getFirestore, FieldValue } from 'firebase-admin/firestore';");
content = content.replace(/admin\.credential\.cert/g, "cert");
content = content.replace(/admin\.initializeApp/g, "initializeApp");
content = content.replace(/admin\.app\(\)/g, "getApp()");
content = content.replace(/admin\.firestore\.FieldValue/g, "FieldValue");
content = content.replace(/catch \(e\) {/g, "catch (e: any) {"); // just in case for TS errors

fs.writeFileSync('server.ts', content);
