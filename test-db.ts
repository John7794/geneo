import admin from "firebase-admin";
import fs from "fs";
const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

admin.initializeApp({ projectId: "celtic-biplane-j8gvj" });

import { getFirestore } from "firebase-admin/firestore";

async function test(dbId) {
  try {
    let db;
    if (dbId) {
      db = getFirestore(admin.app(), dbId);
    } else {
      db = getFirestore();
    }
    await db.collection("test").doc("test").set({hello: "world"});
    console.log("Success with", dbId || "default");
  } catch (e) {
    console.error("Failed with", dbId || "default", e.message);
  }
}

async function run() {
  await test(null);
  await test(config.firestoreDatabaseId);
}
run();
